import { db, loadConfig } from '../../../lib/server/common';
import { CUSTOMER_PACKAGES_SQL } from '../../../lib/package-sql';
import { CARE_CHANNELS, careMessage, segmentsOf } from '../core/care';
import { isManager } from '../core/access';
import { DAY, fail, getSettings, notifyStaff, reply, staffList, type Ctx } from './store';

// The customer file: members and walk-ins from the shared `customers` table, with what they bought and played.
const CUSTOMERS_SQL = `SELECT c.id,c.name,c.phone,c.birthday,c.email,c.zalo_id,c.marketing_consent,c.created,
  (SELECT COUNT(*) FROM crm_visits v WHERE v.tenant=c.tenant AND v.customer_id=c.id) AS visits,
  (SELECT MAX(v.finished) FROM crm_visits v WHERE v.tenant=c.tenant AND v.customer_id=c.id) AS last_visit,
  (SELECT COALESCE(SUM(v.amount),0) FROM crm_visits v WHERE v.tenant=c.tenant AND v.customer_id=c.id) AS spend,
  (SELECT COUNT(*) FROM crm_visits v WHERE v.tenant=c.tenant AND v.customer_id=c.id AND v.finished>?) AS recent_visits,
  COALESCE((SELECT p.points FROM customer_points p WHERE p.tenant=c.tenant AND p.customer_id=c.id),0) AS points,
  (SELECT COUNT(*) FROM crm2_tasks t WHERE t.tenant=c.tenant AND t.customer_id=c.id AND t.done_at IS NULL) AS open_tasks,
  (SELECT a.verified FROM member_accounts a WHERE a.tenant=c.tenant AND a.customer_id=c.id) AS account
 FROM customers c`;
const LIST_SQL = `${CUSTOMERS_SQL} WHERE c.tenant=? AND (?='' OR c.phone LIKE ? OR c.name LIKE ?) ORDER BY c.created DESC LIMIT 300`;
const ONE_SQL = `${CUSTOMERS_SQL} WHERE c.tenant=? AND c.id=?`;

type Row = {
  id: string;
  name: string;
  phone: string;
  birthday: string;
  email: string;
  zalo_id: string;
  marketing_consent: number;
  created: number;
  visits: number;
  last_visit: number | null;
  spend: number;
  recent_visits: number;
  points: number;
  open_tasks: number;
  account: number | null;
};

const withSegments = (r: Row, vipSpend: number, now: number) => ({
  ...r,
  segments: segmentsOf(
    {
      created: r.created,
      visits: r.visits,
      lastVisit: r.last_visit,
      spend: r.spend,
      recentVisits: r.recent_visits,
    },
    { vipSpend },
    now,
  ),
});

export async function listCareCustomers(c: Ctx, query: string) {
  const q = query.trim().replace(/[%_]/g, '');
  const vip = (await getSettings(c.tenant)).care.vipSpend;
  const rows = (
    await db()
      .prepare(LIST_SQL)
      .bind(c.now - 90 * DAY, c.tenant, q, `%${q.replace(/[ \-().]/g, '')}%`, `%${q}%`)
      .all<Row>()
  ).results;
  return reply({ customers: rows.map((r) => withSegments(r, vip, c.now)), now: c.now });
}

export async function careCustomerDetail(c: Ctx, id: string) {
  const d = db();
  const row = await d
    .prepare(ONE_SQL)
    .bind(c.now - 90 * DAY, c.tenant, id)
    .first<Row>();
  if (!row) return fail('Không tìm thấy khách hàng', 404);
  const settings = await getSettings(c.tenant);
  const club = (await loadConfig(c.tenant)).name;
  const [visits, packages, notes, tasks, leads] = await Promise.all([
    d
      .prepare(
        'SELECT b.id,b.service,b.room,b.finished,b.amount,b.payment FROM crm_visits v JOIN bookings b ON b.id=v.booking_id WHERE v.tenant=? AND v.customer_id=? ORDER BY b.finished DESC LIMIT 20',
      )
      .bind(c.tenant, id)
      .all(),
    d.prepare(CUSTOMER_PACKAGES_SQL).bind(c.tenant, id).all(),
    d
      .prepare(
        'SELECT id,channel,content,created,task_id AS taskId,actor FROM crm2_customer_notes WHERE tenant=? AND customer_id=? ORDER BY created DESC LIMIT 60',
      )
      .bind(c.tenant, id)
      .all(),
    d
      .prepare(
        `SELECT t.id,t.rule,t.title,t.data,t.due_at AS dueAt,t.done_at AS doneAt,t.outcome,t.channel,t.note,cu.name
         FROM crm2_tasks t JOIN customers cu ON cu.id=t.customer_id AND cu.tenant=t.tenant
         WHERE t.tenant=? AND t.customer_id=? ORDER BY t.done_at IS NOT NULL, t.due_at DESC LIMIT 30`,
      )
      .bind(c.tenant, id)
      .all<{ rule: string; data: string; name: string; doneAt: number | null }>(),
    d
      .prepare(
        'SELECT id,stage,source,target_service AS service,created FROM crm2_leads WHERE tenant=? AND phone_norm=? ORDER BY created DESC LIMIT 10',
      )
      .bind(c.tenant, row.phone)
      .all(),
  ]);
  return reply({
    customer: withSegments(row, settings.care.vipSpend, c.now),
    visits: visits.results,
    packages: packages.results,
    notes: notes.results,
    tasks: tasks.results.map((t) => ({
      ...t,
      message: t.doneAt ? '' : careMessage(t, settings.care, club),
    })),
    leads: leads.results,
    now: c.now,
  });
}

const actorName = async (userId: string) =>
  (await db().prepare('SELECT name FROM users WHERE id=?').bind(userId).first<{ name: string }>())
    ?.name ?? '';

async function note(c: Ctx, customerId: string, channel: string, content: string) {
  await db()
    .prepare(
      'INSERT INTO crm2_customer_notes(id,tenant,customer_id,task_id,channel,content,actor,created) VALUES (?,?,?,NULL,?,?,?,?)',
    )
    .bind(
      crypto.randomUUID(),
      c.tenant,
      customerId,
      channel,
      content,
      await actorName(c.userId),
      c.now,
    )
    .run();
}

export type CustomerAction =
  | { action: 'birthday-set'; customerId: string; birthday: string }
  | { action: 'consent-set'; customerId: string; consent: boolean }
  | { action: 'contact-set'; customerId: string; email: string; zaloId: string }
  | { action: 'feedback'; customerId: string; rating: number; comment: string }
  | { action: 'note-add'; customerId: string; channel: string; content: string }
  | { action: 'task-create'; customerId: string; title: string; days: number };

const TASK_INSERT =
  "INSERT INTO crm2_tasks(id,tenant,lead_id,title,type,due_at,done_at,assignee,created_by,reminded_at,ukey,created,customer_id,rule,data,channel,note,outcome) VALUES (?,?,NULL,?,'CALL',?,NULL,?,?,NULL,?,?,?,?,?,'','','')";

export async function applyCustomerAction(c: Ctx, a: CustomerAction) {
  const d = db();
  const who = await d
    .prepare('SELECT name,phone FROM customers WHERE tenant=? AND id=?')
    .bind(c.tenant, a.customerId)
    .first<{ name: string; phone: string }>();
  if (!who) return fail('Không tìm thấy khách hàng', 404);
  switch (a.action) {
    case 'birthday-set':
      await d
        .prepare('UPDATE customers SET birthday=? WHERE tenant=? AND id=?')
        .bind(a.birthday, c.tenant, a.customerId)
        .run();
      return reply({ ok: true });
    case 'consent-set':
      await d
        .prepare('UPDATE customers SET marketing_consent=?,consent_at=? WHERE tenant=? AND id=?')
        .bind(a.consent ? 1 : 0, a.consent ? c.now : null, c.tenant, a.customerId)
        .run();
      await note(
        c,
        a.customerId,
        'note',
        a.consent ? 'Khách đồng ý nhận tin ưu đãi' : 'Khách không nhận tin ưu đãi nữa',
      );
      return reply({ ok: true });
    case 'contact-set':
      await d
        .prepare('UPDATE customers SET email=?,zalo_id=? WHERE tenant=? AND id=?')
        .bind(a.email, a.zaloId, c.tenant, a.customerId)
        .run();
      return reply({ ok: true });
    case 'note-add':
      if (a.channel !== 'note' && !(CARE_CHANNELS as readonly string[]).includes(a.channel))
        return fail('Kênh không hợp lệ');
      await note(c, a.customerId, a.channel, a.content);
      return reply({ ok: true });
    case 'task-create': {
      const id = crypto.randomUUID();
      await d
        .prepare(TASK_INSERT)
        .bind(
          id,
          c.tenant,
          a.title.slice(0, 255),
          c.now + a.days * DAY,
          c.userId,
          await actorName(c.userId),
          'manual:' + id,
          c.now,
          a.customerId,
          'manual',
          '{}',
        )
        .run();
      return reply({ ok: true, id });
    }
    case 'feedback': {
      await note(
        c,
        a.customerId,
        'note',
        `Phản hồi ${a.rating}/5 sao${a.comment ? ': ' + a.comment : ''}`,
      );
      // A low score is a complaint: a task for the managers, who are told right away.
      if (a.rating <= 3) {
        const id = crypto.randomUUID();
        await d
          .prepare(TASK_INSERT)
          .bind(
            id,
            c.tenant,
            'Xử lý phản ánh của khách',
            c.now,
            null,
            'Hệ thống',
            'complaint:' + id,
            c.now,
            a.customerId,
            'complaint',
            JSON.stringify({ ten: who.name }),
          )
          .run();
        for (const m of (await staffList(c.tenant)).filter((s) => isManager(s.role)))
          await notifyStaff(
            c.tenant,
            m.id,
            `complaint:${id}:${m.id}`,
            `[Phản ánh] ${who.name} chấm ${a.rating}/5`,
            `Khách ${who.name} (${who.phone}) chấm ${a.rating}/5.\n${a.comment || 'Không có nhận xét'}\nCần quản lý liên hệ xử lý.`,
            c.now,
          );
        return reply({ ok: true, complaintTask: id });
      }
      return reply({ ok: true });
    }
  }
}
