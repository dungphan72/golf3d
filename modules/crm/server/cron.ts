import { db } from '../../../lib/server/common';
import { addWorkingMinutes } from '../core/workhours';
import {
  addActivity,
  addTask,
  DAY,
  getSettings,
  notifyStaff,
  setRuntime,
  staffList,
  type Ctx,
} from './store';
import { recallLeads } from './leads';
import { birthdayStep } from './customers';
import { generateCareTasks } from './care';
import { vnDate } from '../core/orders';
import { dispatchDue } from '../../../lib/server/outbox-service';

export type CronReport = {
  holdsExpired: number;
  recalled: number;
  slaAlerts: number;
  taskReminders: number;
  staleTasks: number;
  birthdays: number;
  careTasks: number;
  paymentReminders: number;
  errors: string[];
};

/** Every step runs on its own, so one failure never blocks the next. */
export async function runCrmCron(tenant: string, base: string, now: number): Promise<CronReport> {
  const rep: CronReport = {
    holdsExpired: 0,
    recalled: 0,
    slaAlerts: 0,
    taskReminders: 0,
    staleTasks: 0,
    birthdays: 0,
    careTasks: 0,
    paymentReminders: 0,
    errors: [],
  };
  const d = db();
  const settings = await getSettings(tenant);
  const sys: Ctx = { tenant, userId: 'system', role: 'owner', now, base };
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      rep.errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  await step('holds', async () => {
    const due = (
      await d
        .prepare(
          "SELECT id,lead_id AS leadId,product_name AS name FROM crm2_holds WHERE tenant=? AND status='ACTIVE' AND expires_at IS NOT NULL AND expires_at<=? LIMIT 200",
        )
        .bind(tenant, now)
        .all<{ id: string; leadId: string; name: string }>()
    ).results;
    for (const h of due) {
      const r = await d
        .prepare(
          "UPDATE crm2_holds SET status='EXPIRED',updated=? WHERE tenant=? AND id=? AND status='ACTIVE'",
        )
        .bind(now, tenant, h.id)
        .run();
      if (!r.meta.changes) continue; // already handled by a parallel run
      rep.holdsExpired++;
      const owner =
        (
          await d
            .prepare('SELECT owner FROM crm2_leads WHERE tenant=? AND id=?')
            .bind(tenant, h.leadId)
            .first<{ owner: string | null }>()
        )?.owner ?? null;
      await addActivity(tenant, h.leadId, 'HOLD', `Giữ chỗ ${h.name} đã hết hạn`, 'Hệ thống', now);
      await addTask(
        tenant,
        {
          leadId: h.leadId,
          title: `Giữ chỗ ${h.name} hết hạn, liên hệ lại khách`,
          type: 'CALL',
          dueAt: now,
          assignee: owner,
          createdBy: 'Hệ thống',
          ukey: `holdexp:${h.id}`,
        },
        now,
      );
    }
  });

  await step('recall', async () => {
    if (!settings.pool.autoRecall) return;
    const stale = (
      await d
        .prepare(
          "SELECT id FROM crm2_leads WHERE tenant=? AND owner IS NOT NULL AND stage='NEW' AND last_contact_at IS NULL AND COALESCE(owned_at,created)<=? LIMIT 100",
        )
        .bind(tenant, now - settings.pool.recallHours * 3_600_000)
        .all<{ id: string }>()
    ).results;
    if (!stale.length) return;
    const r = await recallLeads(
      sys,
      stale.map((s) => s.id),
      'Hệ thống',
      `quá ${settings.pool.recallHours} giờ chưa liên hệ`,
    );
    rep.recalled = Number(r.body.recalled ?? 0);
  });

  await step('sla', async () => {
    const late = (
      await d
        .prepare(
          "SELECT id,full_name AS name,phone,owner FROM crm2_leads WHERE tenant=? AND stage='NEW' AND last_contact_at IS NULL AND sla_alerted_at IS NULL AND next_due IS NOT NULL AND next_due<=? ORDER BY next_due LIMIT 20",
        )
        .bind(tenant, now)
        .all<{ id: string; name: string; phone: string; owner: string | null }>()
    ).results;
    if (!late.length) return;
    const managers = (await staffList(tenant)).filter(
      (s) => s.role === 'owner' || s.role === 'manager',
    );
    for (const l of late) {
      // Mark first, so a failing notification never repeats on the next run.
      const r = await d
        .prepare(
          'UPDATE crm2_leads SET sla_alerted_at=? WHERE tenant=? AND id=? AND sla_alerted_at IS NULL',
        )
        .bind(now, tenant, l.id)
        .run();
      if (!r.meta.changes) continue;
      rep.slaAlerts++;
      const text = `Lead ${l.name} (${l.phone}) quá ${settings.slaMinutes} phút chưa được liên hệ.\nHồ sơ: ${base}/quan-ly?view=crm&lead=${l.id}`;
      await addActivity(
        tenant,
        l.id,
        'SYSTEM',
        `Quá ${settings.slaMinutes} phút chưa liên hệ (nhắc nhân viên & báo quản lý)`,
        'Hệ thống',
        now,
      );
      const notifyRecipients = new Set<string>();
      if (l.owner) notifyRecipients.add(l.owner);
      for (const m of managers) notifyRecipients.add(m.id);
      for (const to of notifyRecipients)
        await notifyStaff(
          tenant,
          to,
          `crm2:sla:${l.id}:${to}`,
          `[CRM] Cảnh báo quá hạn liên hệ: ${l.name}`,
          text,
          now,
        );
    }
  });

  await step('taskReminders', async () => {
    const due = (
      await d
        .prepare(
          'SELECT id,title,assignee FROM crm2_tasks WHERE tenant=? AND done_at IS NULL AND reminded_at IS NULL AND due_at IS NOT NULL AND due_at<=? AND assignee IS NOT NULL LIMIT 100',
        )
        .bind(tenant, now)
        .all<{ id: string; title: string; assignee: string }>()
    ).results;
    for (const t of due) {
      const r = await d
        .prepare(
          'UPDATE crm2_tasks SET reminded_at=? WHERE tenant=? AND id=? AND reminded_at IS NULL',
        )
        .bind(now, tenant, t.id)
        .run();
      if (!r.meta.changes) continue;
      rep.taskReminders++;
      await notifyStaff(
        tenant,
        t.assignee,
        `crm2:task:${t.id}`,
        `[CRM] Việc đến hạn: ${t.title}`,
        `${t.title}\n${base}/quan-ly?view=crm`,
        now,
      );
    }
  });

  await step('stale', async () => {
    const stale = (
      await d
        .prepare(
          `SELECT l.id,l.full_name AS name,l.owner FROM crm2_leads l WHERE l.tenant=? AND l.stage NOT IN ('WON','LOST') AND l.owner IS NOT NULL
           AND COALESCE(l.last_contact_at,l.owned_at,l.created)<=? AND (l.stale_task_at IS NULL OR l.stale_task_at<=?)
           AND NOT EXISTS(SELECT 1 FROM crm2_tasks t WHERE t.tenant=l.tenant AND t.lead_id=l.id AND t.done_at IS NULL) LIMIT 50`,
        )
        .bind(tenant, now - 7 * DAY, now - 7 * DAY)
        .all<{ id: string; name: string; owner: string }>()
    ).results;
    for (const l of stale) {
      await d
        .prepare('UPDATE crm2_leads SET stale_task_at=? WHERE tenant=? AND id=?')
        .bind(now, tenant, l.id)
        .run();
      await addTask(
        tenant,
        {
          leadId: l.id,
          title: `Lead ${l.name} bị bỏ quên 7 ngày, liên hệ lại`,
          type: 'FOLLOW_UP',
          dueAt: now,
          assignee: l.owner,
          createdBy: 'Hệ thống',
          ukey: `stale:${l.id}:${vnDate(now)}`,
        },
        now,
      );
      rep.staleTasks++;
    }
  });

  await step('care', async () => {
    rep.careTasks = await generateCareTasks(tenant, now);
  });

  await step('birthdays', async () => {
    rep.birthdays = await birthdayStep(tenant, now);
  });

  await step('paymentReminders', async () => {
    const soon = vnDate(now + 3 * DAY);
    const rows = (
      await d
        .prepare(
          `SELECT p.id,p.label,p.amount-p.paid_amount AS owed,p.due_date AS dueDate,o.code,o.lead_id AS leadId,l.owner
           FROM crm2_order_payments p JOIN crm2_orders o ON o.id=p.order_id AND o.tenant=p.tenant JOIN crm2_leads l ON l.id=o.lead_id
           WHERE p.tenant=? AND p.status IN ('PLANNED','PARTIAL') AND p.reminded_at IS NULL AND p.due_date<=? AND o.status='ACTIVE' LIMIT 100`,
        )
        .bind(tenant, soon)
        .all<{
          id: string;
          label: string;
          owed: number;
          dueDate: string;
          code: string;
          leadId: string;
          owner: string | null;
        }>()
    ).results;
    for (const p of rows) {
      const r = await d
        .prepare(
          'UPDATE crm2_order_payments SET reminded_at=? WHERE tenant=? AND id=? AND reminded_at IS NULL',
        )
        .bind(now, tenant, p.id)
        .run();
      if (!r.meta.changes) continue;
      await addTask(
        tenant,
        {
          leadId: p.leadId,
          title: `Nhắc thanh toán ${p.label} của đơn ${p.code}: ${p.owed.toLocaleString('vi-VN')}đ, hạn ${p.dueDate}`,
          type: 'FOLLOW_UP',
          dueAt: now,
          assignee: p.owner,
          createdBy: 'Hệ thống',
          ukey: `pay:${p.id}`,
        },
        now,
      );
      rep.paymentReminders++;
    }
  });

  // Reminders and other customer / staff messages that have come due. The old lead sweep did this too; now the CRM cron owns it.
  await step('outbox', async () => {
    await dispatchDue(tenant, now, 100);
  });

  await setRuntime(tenant, 'cron', { ...rep, at: now }, now);
  void addWorkingMinutes;
  return rep;
}
