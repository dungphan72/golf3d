import { db } from '../../../lib/server/common';
import { normalizePhone, isDedupable } from '../core/phone';
import {
  isStage,
  statusFor,
  validateStageChange,
  LOST_REASONS,
  RECALLABLE_STAGES,
  type Stage,
} from '../core/stages';
import {
  applyCallResult,
  statusAfterResult,
  CALL_RESULT_LABELS,
  NEXT_ACTION_LABELS,
  type NextAction,
} from '../core/calls';
import { pickAssignee } from '../core/distribution';
import { toInquiry, type WebsiteLead } from '../core/website';
import { addWorkingMinutes, workMinutesBetween } from '../core/workhours';
import { afterSalesPlan } from '../core/customers';
import { canEditLead, canSeeLead, isManager, maskForViewer, type Actor } from '../core/access';
import {
  addActivity,
  addTask,
  fail,
  getSettings,
  notifyStaff,
  reply,
  staffList,
  vnDayStart,
  DAY,
  SALES_ROLES,
  type Ctx,
  type Result,
} from './store';
import { ensureProfile } from './customers';

/** Lead columns as the API returns them. */
export const LEAD_COLS = `id,full_name AS fullName,phone,phone_norm AS phoneNorm,email,notes,source,target_service AS targetService,
 preferred_date AS preferredDate,preferred_time AS preferredTime,stage,status_id AS statusId,owner,owned_at AS ownedAt,
 claimed_by AS claimedBy,claimed_at AS claimedAt,pooled_at AS pooledAt,lost_reason AS lostReason,expected_value AS expectedValue,
 budget,last_contact_at AS lastContactAt,inquiry_count AS inquiryCount,next_action AS nextAction,next_due AS nextDue,
 call_attempts AS callAttempts,last_result AS lastResult,labels,first_response_at AS firstResponseAt,first_response_min AS firstResponseMin,
 first_response_work_min AS firstResponseWorkMin,won_at AS wonAt,created,updated`;

export type LeadRow = {
  id: string;
  fullName: string;
  phone: string;
  phoneNorm: string;
  email: string;
  notes: string;
  source: string;
  targetService: string;
  stage: Stage;
  statusId: string;
  owner: string | null;
  ownedAt: number | null;
  lostReason: string;
  expectedValue: number;
  budget: number;
  lastContactAt: number | null;
  inquiryCount: number;
  nextAction: NextAction;
  nextDue: number | null;
  callAttempts: number;
  lastResult: string;
  labels: string;
  firstResponseAt: number | null;
  wonAt: number | null;
  created: number;
  updated: number;
};

export async function getLeadRow(tenant: string, id: string) {
  return db()
    .prepare(`SELECT ${LEAD_COLS} FROM crm2_leads WHERE tenant=? AND id=?`)
    .bind(tenant, id)
    .first<LeadRow>();
}

const actorOf = (c: Ctx): Actor => ({ id: c.userId, role: c.role });
const nameOf = async (id: string) =>
  (await db().prepare('SELECT name FROM users WHERE id=?').bind(id).first<{ name: string }>())
    ?.name ?? id;

// ---------------------------------------------------------------- intake

export type IntakeInput = {
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
  source?: string;
  targetService?: string;
  preferredDate?: string;
  preferredTime?: string;
};

/** Every inquiry (website form, manual entry, import) ends up here. */
export async function ingestLead(
  tenant: string,
  i: IntakeInput,
  base: string,
  now: number,
): Promise<Result> {
  const d = db();
  const norm = normalizePhone(i.phone);
  if (
    norm &&
    (await d
      .prepare('SELECT 1 AS x FROM crm2_blocked_phones WHERE tenant=? AND phone_norm=?')
      .bind(tenant, norm)
      .first())
  )
    return reply({ ok: true, blocked: true }); // silently dropped
  const settings = await getSettings(tenant);
  if (isDedupable(norm)) {
    const old = await d
      .prepare(
        `SELECT ${LEAD_COLS} FROM crm2_leads WHERE tenant=? AND phone_norm=? AND stage<>'WON' AND created>? ORDER BY created DESC LIMIT 1`,
      )
      .bind(tenant, norm, now - 365 * DAY)
      .first<LeadRow>();
    if (old) {
      await d
        .prepare(
          `UPDATE crm2_leads SET inquiry_count=inquiry_count+1,updated=?,
           stage=CASE WHEN stage='LOST' THEN 'NEW' ELSE stage END,
           status_id=CASE WHEN stage='LOST' THEN 'khach-moi' ELSE status_id END,
           lost_reason=CASE WHEN stage='LOST' THEN '' ELSE lost_reason END,
           target_service=CASE WHEN target_service='' THEN ? ELSE target_service END WHERE tenant=? AND id=?`,
        )
        .bind(now, i.targetService ?? '', tenant, old.id)
        .run();
      await addActivity(
        tenant,
        old.id,
        'INQUIRY',
        i.notes ? `Khách gửi lại: ${i.notes}` : 'Khách gửi lại thông tin',
        'Website',
        now,
      );
      if (old.owner) {
        const due = addWorkingMinutes(now, settings.slaMinutes, settings.workHours);
        await addTask(
          tenant,
          {
            leadId: old.id,
            title: 'Khách gửi lại biểu mẫu, gọi lại ngay',
            type: 'CALL',
            dueAt: due,
            assignee: old.owner,
            createdBy: 'Hệ thống',
            ukey: `again:${old.id}:${old.inquiryCount + 1}`,
          },
          now,
        );
        await notifyStaff(
          tenant,
          old.owner,
          `crm2:again:${old.id}:${old.inquiryCount + 1}`,
          `[CRM] Khách gửi lại: ${old.fullName}`,
          `Khách ${old.fullName} (${old.phone}) vừa gửi lại thông tin. Hồ sơ: ${base}/quan-ly?view=crm&lead=${old.id}`,
          now,
        );
      }
      return reply({ ok: true, duplicate: true, id: old.id });
    }
  }
  const id = crypto.randomUUID();
  let owner: string | null = null;
  if (settings.pool.intakeMode === 'AUTO') {
    const staff = (await staffList(tenant)).filter((s) => SALES_ROLES.includes(s.role));
    const counts = (
      await d
        .prepare(
          "SELECT owner,COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND owner IS NOT NULL AND stage NOT IN ('WON','LOST') GROUP BY owner",
        )
        .bind(tenant)
        .all<{ owner: string; n: number }>()
    ).results;
    const prev = norm
      ? (
          await d
            .prepare(
              'SELECT owner FROM crm2_leads WHERE tenant=? AND phone_norm=? AND owner IS NOT NULL ORDER BY created DESC LIMIT 1',
            )
            .bind(tenant, norm)
            .first<{ owner: string }>()
        )?.owner
      : null;
    const pick = pickAssignee({
      candidates: staff.map((s) => s.id),
      openCounts: Object.fromEntries(counts.map((c) => [c.owner, c.n])),
      cfg: settings.distribution,
      source: i.source ?? null,
      previousOwner: prev ?? null,
    });
    owner = pick.owner;
  }
  const due = addWorkingMinutes(now, settings.slaMinutes, settings.workHours);
  await d
    .prepare(
      `INSERT INTO crm2_leads(id,tenant,full_name,phone,phone_norm,email,notes,source,target_service,preferred_date,preferred_time,
        stage,status_id,owner,owned_at,pooled_at,next_action,next_due,labels,created,updated)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'NEW','khach-moi',?,?,?, 'NEW',?, '[]',?,?)`,
    )
    .bind(
      id,
      tenant,
      i.fullName.trim().slice(0, 255) || 'Khách chưa có tên',
      i.phone.trim().slice(0, 50),
      norm,
      (i.email ?? '').slice(0, 255),
      (i.notes ?? '').slice(0, 2000),
      (i.source ?? '').slice(0, 255),
      (i.targetService ?? '').slice(0, 255),
      (i.preferredDate ?? '').slice(0, 100),
      (i.preferredTime ?? '').slice(0, 100),
      owner,
      owner ? now : null,
      owner ? null : now,
      due,
      now,
      now,
    )
    .run();
  if (owner) {
    await addActivity(tenant, id, 'ASSIGN', 'Tự động chia cho nhân viên', 'Hệ thống', now, {
      owner,
    });
    await addTask(
      tenant,
      {
        leadId: id,
        title: 'Gọi khách mới',
        type: 'CALL',
        dueAt: due,
        assignee: owner,
        createdBy: 'Hệ thống',
        ukey: `new:${id}`,
      },
      now,
    );
    if (settings.notifyAssignEmail)
      await notifyStaff(
        tenant,
        owner,
        `crm2:assign:${id}:${owner}`,
        `[CRM] Lead mới: ${i.fullName}`,
        `Khách: ${i.fullName}\nĐiện thoại: ${i.phone}\nNhu cầu: ${i.targetService || 'chưa rõ'}\nGọi trong ${settings.slaMinutes} phút.\nHồ sơ: ${base}/quan-ly?view=crm&lead=${id}`,
        now,
      );
  } else await addActivity(tenant, id, 'SYSTEM', 'Lead vào kho số', 'Hệ thống', now);
  return reply({ ok: true, id, duplicate: false, owner, pooled: !owner });
}

/**
 * A lead posted by the website form through the old webhook (POST /api/leads/website). Same inquiry as any other,
 * answered in the shape the website already expects: `{ leadId, duplicate, status }`.
 */
export async function ingestWebsiteLead(
  tenant: string,
  raw: WebsiteLead,
  base: string,
  now: number,
) {
  const r = await ingestLead(tenant, toInquiry(raw), base, now);
  const b = r.body as {
    id?: string;
    duplicate?: boolean;
    owner?: string | null;
    blocked?: boolean;
  };
  return {
    leadId: b.id ?? '', // a blocked number is dropped without telling the sender
    duplicate: b.duplicate === true,
    status: b.owner ? 'assigned' : 'queued',
  };
}

// ---------------------------------------------------------------- reading

export type LeadFilter = {
  stage?: string;
  status?: string;
  source?: string;
  owner?: string; // user id, 'pool' for unassigned
  q?: string;
  label?: string;
  limit?: number;
  offset?: number;
};
export async function listLeads(c: Ctx, f: LeadFilter): Promise<Result> {
  const where = ['tenant=?'];
  const args: (string | number)[] = [c.tenant];
  const mgr = isManager(c.role);
  if (!mgr) {
    where.push('(owner=? OR owner IS NULL)');
    args.push(c.userId);
  }
  if (f.stage && isStage(f.stage)) {
    where.push('stage=?');
    args.push(f.stage);
  }
  if (f.status) {
    where.push('status_id=?');
    args.push(f.status);
  }
  if (f.source) {
    where.push('source=?');
    args.push(f.source);
  }
  if (f.owner === 'pool') where.push('owner IS NULL');
  else if (f.owner) {
    where.push('owner=?');
    args.push(f.owner);
  }
  if (f.label) {
    where.push('labels LIKE ?');
    args.push(`%"${f.label.replace(/[%_"]/g, '')}"%`);
  }
  const q = (f.q ?? '').trim();
  if (q) {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    // Unowned leads hide their phone from staff, so they cannot be searched by number.
    where.push(
      mgr
        ? '(full_name LIKE ? OR phone_norm LIKE ?)'
        : '(full_name LIKE ? OR (owner IS NOT NULL AND phone_norm LIKE ?))',
    );
    args.push(like, `%${normalizePhone(q) || q}%`);
  }
  const limit = Math.min(Math.max(f.limit ?? 100, 1), 200);
  const rows = (
    await db()
      .prepare(
        `SELECT ${LEAD_COLS} FROM crm2_leads WHERE ${where.join(' AND ')} ORDER BY created DESC LIMIT ? OFFSET ?`,
      )
      .bind(...args, limit, Math.max(f.offset ?? 0, 0))
      .all<LeadRow>()
  ).results;
  const total = (
    await db()
      .prepare(`SELECT COUNT(*) AS n FROM crm2_leads WHERE ${where.join(' AND ')}`)
      .bind(...args)
      .first<{ n: number }>()
  )?.n;
  return reply({
    leads: rows.map((r) => maskForViewer(actorOf(c), r)),
    total: total ?? 0,
    now: c.now,
  });
}

export async function leadDetail(c: Ctx, id: string): Promise<Result> {
  const lead = await getLeadRow(c.tenant, id);
  if (!lead || !canSeeLead(actorOf(c), lead)) return fail('Không tìm thấy lead', 404);
  const d = db();
  const [activities, tasks, appointments, holds, orders] = await Promise.all([
    d
      .prepare(
        'SELECT id,type,content,meta,actor,created FROM crm2_activities WHERE tenant=? AND lead_id=? ORDER BY created DESC LIMIT 200',
      )
      .bind(c.tenant, id)
      .all(),
    d
      .prepare(
        'SELECT id,title,type,due_at AS dueAt,done_at AS doneAt,assignee,created_by AS createdBy FROM crm2_tasks WHERE tenant=? AND lead_id=? ORDER BY done_at IS NOT NULL, due_at LIMIT 50',
      )
      .bind(c.tenant, id)
      .all(),
    d
      .prepare(
        'SELECT id,service,at,status,note,owner FROM crm2_appointments WHERE tenant=? AND lead_id=? ORDER BY at DESC',
      )
      .bind(c.tenant, id)
      .all(),
    d
      .prepare(
        'SELECT id,product_code AS productCode,product_name AS productName,kind,amount,status,expires_at AS expiresAt FROM crm2_holds WHERE tenant=? AND lead_id=? ORDER BY created DESC',
      )
      .bind(c.tenant, id)
      .all(),
    d
      .prepare(
        'SELECT id,code,product_name AS productName,price,status FROM crm2_orders WHERE tenant=? AND lead_id=? ORDER BY created DESC',
      )
      .bind(c.tenant, id)
      .all(),
  ]);
  return reply({
    lead: maskForViewer(actorOf(c), lead),
    activities: activities.results,
    tasks: tasks.results,
    appointments: appointments.results,
    holds: holds.results,
    orders: orders.results,
    ownerName: lead.owner ? await nameOf(lead.owner) : null,
  });
}

// ---------------------------------------------------------------- results and stages

async function closeOpenTasks(tenant: string, leadId: string, now: number, onlySystem = true) {
  await db()
    .prepare(
      `UPDATE crm2_tasks SET done_at=? WHERE tenant=? AND lead_id=? AND done_at IS NULL ${onlySystem ? "AND type IN ('CALL','FOLLOW_UP') AND created_by<>'Chăm sóc sau bán'" : ''}`,
    )
    .bind(now, tenant, leadId)
    .run();
}

export async function recordResult(
  c: Ctx,
  leadId: string,
  result: string,
  when: number | null,
  note: string,
): Promise<Result> {
  const lead = await getLeadRow(c.tenant, leadId);
  if (!lead || !canSeeLead(actorOf(c), lead)) return fail('Không tìm thấy lead', 404);
  if (!canEditLead(actorOf(c), lead)) return fail('Lead đang do nhân viên khác phụ trách', 403);
  if (lead.stage === 'WON' || lead.stage === 'LOST') return fail('Lead đã đóng', 409);
  const settings = await getSettings(c.tenant);
  const out = applyCallResult(
    { stage: lead.stage, callAttempts: lead.callAttempts },
    result,
    c.now,
    when,
    settings.calls,
  );
  if ('error' in out) return fail(out.error);
  const stage = out.stage ?? lead.stage;
  const statusId =
    statusAfterResult(out.nextAction) ??
    statusFor(settings.statuses, stage, out.stage ? undefined : lead.statusId);
  const first = lead.firstResponseAt == null;
  await db()
    .prepare(
      `UPDATE crm2_leads SET stage=?,status_id=?,next_action=?,next_due=?,call_attempts=?,last_result=?,last_contact_at=?,
        lost_reason=CASE WHEN ? IS NOT NULL THEN ? ELSE lost_reason END,updated=?,
        first_response_at=COALESCE(first_response_at,?),first_response_by=COALESCE(first_response_by,?),
        first_response_min=COALESCE(first_response_min,?),first_response_work_min=COALESCE(first_response_work_min,?)
       WHERE tenant=? AND id=?`,
    )
    .bind(
      stage,
      statusId,
      out.nextAction,
      out.nextDue,
      out.callAttempts,
      result,
      c.now,
      out.lostReason,
      out.lostReason,
      c.now,
      c.now,
      c.userId,
      Math.round((c.now - lead.created) / 60_000),
      workMinutesBetween(lead.created, c.now, settings.workHours),
      c.tenant,
      leadId,
    )
    .run();
  await addActivity(
    c.tenant,
    leadId,
    'CALL',
    `${CALL_RESULT_LABELS[result as keyof typeof CALL_RESULT_LABELS]}${note ? '. ' + note : ''}`,
    c.userId,
    c.now,
    { result, nextDue: out.nextDue, first },
  );
  await closeOpenTasks(c.tenant, leadId, c.now);
  const assignee = lead.owner ?? c.userId;
  if (out.nextDue && !out.recall)
    await addTask(
      c.tenant,
      {
        leadId,
        title: NEXT_ACTION_LABELS[out.nextAction] || 'Chăm sóc khách',
        type: out.nextAction === 'MEETING' ? 'VISIT' : 'CALL',
        dueAt: out.nextDue,
        assignee,
        createdBy: 'Hệ thống',
      },
      c.now,
    );
  if (out.recall) await recallLeads(c, [leadId], 'Hệ thống', 'quá số lần gọi hụt cho phép');
  return reply({ ok: true, first, recall: out.recall, nextDue: out.nextDue, stage });
}

export async function changeStage(
  c: Ctx,
  leadId: string,
  o: { stage: string; statusId?: string; lostReason?: string; dealValue?: number },
): Promise<Result> {
  const lead = await getLeadRow(c.tenant, leadId);
  if (!lead || !canSeeLead(actorOf(c), lead)) return fail('Không tìm thấy lead', 404);
  if (!canEditLead(actorOf(c), lead)) return fail('Lead đang do nhân viên khác phụ trách', 403);
  if (!isStage(o.stage)) return fail('Giai đoạn không hợp lệ');
  const to = o.stage;
  const err = validateStageChange(to, o);
  if (err) return fail(err);
  const settings = await getSettings(c.tenant);
  const statusId = statusFor(settings.statuses, to, o.statusId);
  const wasWon = lead.stage === 'WON';
  const now = c.now;
  await db()
    .prepare(
      `UPDATE crm2_leads SET stage=?,status_id=?,lost_reason=?,expected_value=CASE WHEN ?='WON' THEN ? ELSE expected_value END,
        won_at=CASE WHEN ?='WON' THEN ? ELSE NULL END,
        next_action=CASE WHEN ? IN ('WON','LOST') THEN 'NONE' ELSE next_action END,
        next_due=CASE WHEN ? IN ('WON','LOST') THEN NULL ELSE next_due END,updated=? WHERE tenant=? AND id=?`,
    )
    .bind(
      to,
      statusId,
      to === 'LOST' ? (o.lostReason ?? '').trim() : '',
      to,
      Math.round(o.dealValue ?? 0),
      to,
      now,
      to,
      to,
      now,
      c.tenant,
      leadId,
    )
    .run();
  await addActivity(
    c.tenant,
    leadId,
    'STAGE',
    `Chuyển giai đoạn: ${lead.stage} → ${to}${o.lostReason ? ` (${o.lostReason})` : ''}`,
    c.userId,
    now,
    { from: lead.stage, to, dealValue: o.dealValue ?? null },
  );
  if (to === 'WON' || to === 'LOST') await closeOpenTasks(c.tenant, leadId, now);
  if (to === 'WON') {
    if (lead.phoneNorm) await ensureProfile(c.tenant, lead.phoneNorm, c.userId, now);
    const plan = afterSalesPlan(settings.afterSales, now, lead.owner);
    for (let i = 0; i < plan.length; i++)
      await addTask(
        c.tenant,
        {
          leadId,
          title: plan[i].title,
          type: 'FOLLOW_UP',
          dueAt: plan[i].due,
          assignee: plan[i].assignee,
          createdBy: 'Chăm sóc sau bán',
          ukey: `after:${leadId}:${i}`,
        },
        now,
      );
  }
  if (wasWon && to !== 'WON')
    await db()
      .prepare(
        "UPDATE crm2_tasks SET done_at=? WHERE tenant=? AND lead_id=? AND created_by='Chăm sóc sau bán' AND done_at IS NULL",
      )
      .bind(now, c.tenant, leadId)
      .run();
  return reply({ ok: true, stage: to, statusId });
}

export async function editLead(
  c: Ctx,
  leadId: string,
  p: {
    fullName?: string;
    email?: string;
    notes?: string;
    targetService?: string;
    budget?: number;
    labels?: string[];
  },
): Promise<Result> {
  const lead = await getLeadRow(c.tenant, leadId);
  if (!lead || !canSeeLead(actorOf(c), lead)) return fail('Không tìm thấy lead', 404);
  if (!canEditLead(actorOf(c), lead)) return fail('Lead đang do nhân viên khác phụ trách', 403);
  await db()
    .prepare(
      'UPDATE crm2_leads SET full_name=?,email=?,notes=?,target_service=?,budget=?,labels=?,updated=? WHERE tenant=? AND id=?',
    )
    .bind(
      (p.fullName ?? lead.fullName).trim().slice(0, 255) || lead.fullName,
      (p.email ?? lead.email).slice(0, 255),
      (p.notes ?? lead.notes).slice(0, 2000),
      (p.targetService ?? lead.targetService).slice(0, 255),
      Math.max(0, Math.round(p.budget ?? lead.budget)),
      p.labels ? JSON.stringify([...new Set(p.labels)].slice(0, 20)) : lead.labels,
      c.now,
      c.tenant,
      leadId,
    )
    .run();
  return reply({ ok: true });
}

export async function addNote(
  c: Ctx,
  leadId: string,
  type: string,
  content: string,
): Promise<Result> {
  const lead = await getLeadRow(c.tenant, leadId);
  if (!lead || !canSeeLead(actorOf(c), lead)) return fail('Không tìm thấy lead', 404);
  if (!canEditLead(actorOf(c), lead)) return fail('Lead đang do nhân viên khác phụ trách', 403);
  if (!['NOTE', 'CALL', 'ZALO', 'EMAIL', 'VISIT'].includes(type))
    return fail('Loại hoạt động không hợp lệ');
  await addActivity(c.tenant, leadId, type, content, c.userId, c.now);
  if (type !== 'NOTE') {
    const settings = await getSettings(c.tenant);
    await db()
      .prepare(
        `UPDATE crm2_leads SET last_contact_at=?,first_response_at=COALESCE(first_response_at,?),first_response_by=COALESCE(first_response_by,?),
         first_response_min=COALESCE(first_response_min,?),first_response_work_min=COALESCE(first_response_work_min,?),updated=? WHERE tenant=? AND id=?`,
      )
      .bind(
        c.now,
        c.now,
        c.userId,
        Math.round((c.now - lead.created) / 60_000),
        workMinutesBetween(lead.created, c.now, settings.workHours),
        c.now,
        c.tenant,
        leadId,
      )
      .run();
  }
  return reply({ ok: true });
}

// ---------------------------------------------------------------- pool

export async function poolList(c: Ctx): Promise<Result> {
  const rows = (
    await db()
      .prepare(
        `SELECT ${LEAD_COLS} FROM crm2_leads WHERE tenant=? AND owner IS NULL AND stage NOT IN ('WON','LOST') ORDER BY pooled_at DESC LIMIT 200`,
      )
      .bind(c.tenant)
      .all<LeadRow>()
  ).results;
  const settings = await getSettings(c.tenant);
  const used =
    (
      await db()
        .prepare(
          'SELECT COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND claimed_by=? AND claimed_at>=?',
        )
        .bind(c.tenant, c.userId, vnDayStart(c.now))
        .first<{ n: number }>()
    )?.n ?? 0;
  return reply({
    leads: rows.map((r) => maskForViewer(actorOf(c), r)),
    quota: settings.pool.claimQuotaPerDay,
    claimedToday: used,
    now: c.now,
  });
}

export async function claimLeads(c: Ctx, ids: string[]): Promise<Result> {
  const settings = await getSettings(c.tenant);
  const used =
    (
      await db()
        .prepare(
          'SELECT COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND claimed_by=? AND claimed_at>=?',
        )
        .bind(c.tenant, c.userId, vnDayStart(c.now))
        .first<{ n: number }>()
    )?.n ?? 0;
  let left = settings.pool.claimQuotaPerDay - used;
  if (left <= 0) return fail(`Đã nhận đủ ${settings.pool.claimQuotaPerDay} số hôm nay`, 429);
  let claimed = 0;
  for (const id of ids.slice(0, 50)) {
    if (left <= 0) break;
    const due = addWorkingMinutes(c.now, settings.slaMinutes, settings.workHours);
    const r = await db()
      .prepare(
        "UPDATE crm2_leads SET owner=?,owned_at=?,claimed_by=?,claimed_at=?,next_due=CASE WHEN stage='NEW' THEN ? ELSE next_due END,updated=? WHERE tenant=? AND id=? AND owner IS NULL AND stage NOT IN ('WON','LOST')",
      )
      .bind(c.userId, c.now, c.userId, c.now, due, c.now, c.tenant, id)
      .run();
    if (!r.meta.changes) continue;
    claimed++;
    left--;
    await addActivity(c.tenant, id, 'ASSIGN', 'Nhân viên tự nhận số từ kho', c.userId, c.now);
    await addTask(
      c.tenant,
      {
        leadId: id,
        title: 'Gọi khách mới',
        type: 'CALL',
        dueAt: due,
        assignee: c.userId,
        createdBy: 'Hệ thống',
        ukey: `claim:${id}:${c.now}`,
      },
      c.now,
    );
  }
  return reply({ ok: true, claimed, remaining: Math.max(left, 0) });
}

export async function assignLeads(c: Ctx, ids: string[], userId: string): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý được giao lead', 403);
  const target = (await staffList(c.tenant)).find((s) => s.id === userId);
  if (!target) return fail('Không tìm thấy nhân viên');
  const settings = await getSettings(c.tenant);
  let n = 0;
  for (const id of ids.slice(0, 100)) {
    const lead = await getLeadRow(c.tenant, id);
    if (!lead || lead.stage === 'WON' || lead.stage === 'LOST') continue;
    const due = addWorkingMinutes(c.now, settings.slaMinutes, settings.workHours);
    await db()
      .prepare(
        "UPDATE crm2_leads SET owner=?,owned_at=?,next_due=CASE WHEN stage='NEW' THEN ? ELSE next_due END,updated=? WHERE tenant=? AND id=?",
      )
      .bind(userId, c.now, due, c.now, c.tenant, id)
      .run();
    await db()
      .prepare(
        "UPDATE crm2_tasks SET assignee=? WHERE tenant=? AND lead_id=? AND done_at IS NULL AND created_by<>'Chăm sóc sau bán'",
      )
      .bind(userId, c.tenant, id)
      .run();
    await addActivity(c.tenant, id, 'ASSIGN', `Giao cho ${target.name}`, c.userId, c.now, {
      owner: userId,
    });
    if (lead.stage === 'NEW')
      await addTask(
        c.tenant,
        {
          leadId: id,
          title: 'Gọi khách mới',
          type: 'CALL',
          dueAt: due,
          assignee: userId,
          createdBy: 'Hệ thống',
          ukey: `assign:${id}:${c.now}`,
        },
        c.now,
      );
    await notifyStaff(
      c.tenant,
      userId,
      `crm2:assign:${id}:${userId}:${c.now}`,
      `[CRM] Được giao lead: ${lead.fullName}`,
      `Khách: ${lead.fullName} (${lead.phone})\nHồ sơ: ${c.base}/quan-ly?view=crm&lead=${id}`,
      c.now,
    );
    n++;
  }
  return reply({ ok: true, assigned: n });
}

/** Takes leads back to the pool. Only leads that have an owner and are before the deposit stage. */
export async function recallLeads(
  c: Ctx,
  ids: string[],
  actorLabel: string,
  reason: string,
): Promise<Result> {
  const settings = await getSettings(c.tenant);
  let n = 0;
  for (const id of ids.slice(0, 200)) {
    const lead = await getLeadRow(c.tenant, id);
    if (!lead || !lead.owner || !RECALLABLE_STAGES.includes(lead.stage)) continue;
    const reset = lead.stage === 'NEW' || lead.stage === 'CONTACTED';
    const due = addWorkingMinutes(c.now, settings.slaMinutes, settings.workHours);
    await db()
      .prepare(
        `UPDATE crm2_leads SET owner=NULL,owned_at=NULL,claimed_by=NULL,claimed_at=NULL,pooled_at=?,call_attempts=0,updated=?,
          stage=CASE WHEN ? THEN 'NEW' ELSE stage END,status_id=CASE WHEN ? THEN 'khach-moi' ELSE status_id END,
          next_action=CASE WHEN ? THEN 'NEW' ELSE next_action END,next_due=CASE WHEN ? THEN ? ELSE next_due END,
          first_response_at=CASE WHEN ? THEN NULL ELSE first_response_at END,first_response_by=CASE WHEN ? THEN NULL ELSE first_response_by END,
          first_response_min=CASE WHEN ? THEN NULL ELSE first_response_min END,first_response_work_min=CASE WHEN ? THEN NULL ELSE first_response_work_min END,
          last_contact_at=CASE WHEN ? THEN NULL ELSE last_contact_at END,sla_alerted_at=CASE WHEN ? THEN NULL ELSE sla_alerted_at END
         WHERE tenant=? AND id=?`,
      )
      .bind(
        c.now,
        c.now,
        reset ? 1 : 0,
        reset ? 1 : 0,
        reset ? 1 : 0,
        reset ? 1 : 0,
        due,
        reset ? 1 : 0,
        reset ? 1 : 0,
        reset ? 1 : 0,
        reset ? 1 : 0,
        reset ? 1 : 0,
        reset ? 1 : 0,
        c.tenant,
        id,
      )
      .run();
    await db()
      .prepare(
        "UPDATE crm2_tasks SET done_at=? WHERE tenant=? AND lead_id=? AND done_at IS NULL AND created_by<>'Chăm sóc sau bán'",
      )
      .bind(c.now, c.tenant, id)
      .run();
    await addActivity(c.tenant, id, 'ASSIGN', `Thu hồi về kho số: ${reason}`, actorLabel, c.now, {
      from: lead.owner,
    });
    n++;
  }
  return reply({ ok: true, recalled: n });
}

export const lostReasons = () => [...LOST_REASONS];

// ---------------------------------------------------------------- work desk, tasks, overview

export async function workDesk(c: Ctx): Promise<Result> {
  const mgr = isManager(c.role);
  const rows = (
    await db()
      .prepare(
        `SELECT ${LEAD_COLS} FROM crm2_leads WHERE tenant=? AND owner IS NOT NULL AND (?=1 OR owner=?) AND stage NOT IN ('WON','LOST')
         ORDER BY next_due IS NULL, next_due LIMIT 150`,
      )
      .bind(c.tenant, mgr ? 1 : 0, c.userId)
      .all<LeadRow>()
  ).results;
  return reply({ leads: rows, now: c.now, mine: c.userId });
}

export async function listTasks(c: Ctx, scope: 'mine' | 'all', showDone: boolean): Promise<Result> {
  const mgr = isManager(c.role);
  const rows = (
    await db()
      .prepare(
        `SELECT t.id,t.lead_id AS leadId,l.full_name AS leadName,t.title,t.type,t.due_at AS dueAt,t.done_at AS doneAt,t.assignee,t.created_by AS createdBy
         FROM crm2_tasks t LEFT JOIN crm2_leads l ON l.id=t.lead_id
         WHERE t.tenant=? AND (?=1 OR t.assignee=?) AND (?=1 OR t.assignee=?) AND (t.done_at IS NULL OR (?=1 AND t.done_at>?))
         ORDER BY t.done_at IS NOT NULL, t.due_at LIMIT 300`,
      )
      .bind(
        c.tenant,
        mgr && scope === 'all' ? 1 : 0,
        c.userId,
        mgr && scope === 'all' ? 1 : 0,
        c.userId,
        showDone ? 1 : 0,
        c.now - 3 * DAY,
      )
      .all()
  ).results;
  return reply({ tasks: rows, now: c.now });
}

export async function createTask(
  c: Ctx,
  o: { leadId?: string | null; title: string; days: number; assignee?: string },
): Promise<Result> {
  let leadId: string | null = null;
  if (o.leadId) {
    const lead = await getLeadRow(c.tenant, o.leadId);
    if (!lead || !canSeeLead(actorOf(c), lead)) return fail('Không tìm thấy lead', 404);
    leadId = lead.id;
  }
  const assignee = isManager(c.role) && o.assignee ? o.assignee : c.userId;
  await addTask(
    c.tenant,
    {
      leadId,
      title: o.title,
      type: 'FOLLOW_UP',
      dueAt: c.now + o.days * DAY,
      assignee,
      createdBy: await nameOf(c.userId),
    },
    c.now,
  );
  return reply({ ok: true });
}

export async function completeTask(c: Ctx, id: string): Promise<Result> {
  const t = await db()
    .prepare('SELECT assignee FROM crm2_tasks WHERE tenant=? AND id=?')
    .bind(c.tenant, id)
    .first<{ assignee: string | null }>();
  if (!t) return fail('Không tìm thấy việc', 404);
  if (!isManager(c.role) && t.assignee !== c.userId) return fail('Việc của nhân viên khác', 403);
  await db()
    .prepare('UPDATE crm2_tasks SET done_at=? WHERE tenant=? AND id=? AND done_at IS NULL')
    .bind(c.now, c.tenant, id)
    .run();
  return reply({ ok: true });
}

export async function overview(c: Ctx): Promise<Result> {
  const d = db();
  const mgr = isManager(c.role);
  const since = c.now - 30 * DAY;
  const scope = mgr ? '' : ' AND (owner=? OR owner IS NULL)';
  const args = (...a: (string | number)[]) => (mgr ? a : [...a, c.userId]);
  const dayEnd = vnDayStart(c.now) + DAY;
  const [stages, sources, newCount, taskStats] = await Promise.all([
    d
      .prepare(
        `SELECT stage,COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND created>=?${scope} GROUP BY stage`,
      )
      .bind(...args(c.tenant, since))
      .all(),
    d
      .prepare(
        `SELECT source,COUNT(*) AS leads,SUM(stage='WON') AS won FROM crm2_leads WHERE tenant=? AND created>=?${scope} GROUP BY source ORDER BY leads DESC LIMIT 10`,
      )
      .bind(...args(c.tenant, since))
      .all(),
    d
      .prepare(
        `SELECT COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND stage='NEW' AND last_contact_at IS NULL${scope}`,
      )
      .bind(...args(c.tenant))
      .first<{ n: number }>(),
    d
      .prepare(
        `SELECT SUM(due_at<?) AS overdue,SUM(due_at>=? AND due_at<?) AS today FROM crm2_tasks WHERE tenant=? AND done_at IS NULL AND (?=1 OR assignee=?)`,
      )
      .bind(c.now, vnDayStart(c.now), dayEnd, c.tenant, mgr ? 1 : 0, c.userId)
      .first<{ overdue: number | null; today: number | null }>(),
  ]);
  return reply({
    stages: stages.results,
    sources: sources.results,
    newUnhandled: newCount?.n ?? 0,
    overdueTasks: taskStats?.overdue ?? 0,
    todayTasks: taskStats?.today ?? 0,
    now: c.now,
  });
}
