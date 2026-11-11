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
const BOOKING_PHONE_DIGITS =
  "replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','')";
const BOOKING_PHONE_NORM = `CASE
  WHEN ${BOOKING_PHONE_DIGITS} LIKE '+84%' THEN '0'||substr(${BOOKING_PHONE_DIGITS},4)
  WHEN ${BOOKING_PHONE_DIGITS} LIKE '84%' AND length(${BOOKING_PHONE_DIGITS})>=11
    THEN '0'||substr(${BOOKING_PHONE_DIGITS},3)
  ELSE ${BOOKING_PHONE_DIGITS}
 END`;

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

type TimelineEvent = {
  id: string;
  kind: string;
  at: number;
  title: string;
  detail: string;
  amount?: number;
};

type PlaySegment = { start: number; end: number };

const dateTime = (at: number) =>
  new Date(at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

function playSegments(raw: string): PlaySegment[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item): PlaySegment[] => {
    if (!item || typeof item !== 'object') return [];
    const segment = item as Record<string, unknown>;
    if (
      typeof segment.start !== 'number' ||
      !Number.isSafeInteger(segment.start) ||
      typeof segment.end !== 'number' ||
      !Number.isSafeInteger(segment.end) ||
      segment.end < segment.start
    )
      return [];
    return [{ start: segment.start, end: segment.end }];
  });
}

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
  const [
    visits,
    packages,
    notes,
    tasks,
    leads,
    activities,
    appointments,
    bookings,
    payments,
    orderPayments,
    packageLedger,
    loyaltyLedger,
  ] = await Promise.all([
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
      .all<{
        id: string;
        channel: string;
        content: string;
        created: number;
        taskId: string | null;
        actor: string;
      }>(),
    d
      .prepare(
        `SELECT t.id,t.rule,t.title,t.data,t.due_at AS dueAt,t.done_at AS doneAt,t.outcome,t.channel,t.note,cu.name
         FROM crm2_tasks t JOIN customers cu ON cu.id=t.customer_id AND cu.tenant=t.tenant
         WHERE t.tenant=? AND t.customer_id=? ORDER BY t.done_at IS NOT NULL, t.due_at DESC LIMIT 30`,
      )
      .bind(c.tenant, id)
      .all<{
        id: string;
        rule: string;
        title: string;
        data: string;
        dueAt: number | null;
        doneAt: number | null;
        outcome: string;
        channel: string;
        note: string;
        name: string;
      }>(),
    d
      .prepare(
        'SELECT id,stage,source,target_service AS service,created FROM crm2_leads WHERE tenant=? AND phone_norm=? ORDER BY created DESC LIMIT 10',
      )
      .bind(c.tenant, row.phone)
      .all<{
        id: string;
        stage: string;
        source: string;
        service: string;
        created: number;
      }>(),
    d
      .prepare(
        `SELECT a.id,a.type,a.content,a.actor,a.created,l.full_name AS leadName
         FROM crm2_activities a JOIN crm2_leads l ON l.tenant=a.tenant AND l.id=a.lead_id
         WHERE a.tenant=? AND l.phone_norm=? ORDER BY a.created DESC LIMIT 100`,
      )
      .bind(c.tenant, row.phone)
      .all<{
        id: string;
        type: string;
        content: string;
        actor: string;
        created: number;
        leadName: string;
      }>(),
    d
      .prepare(
        `SELECT a.id,a.service,a.at,a.status,a.created,l.full_name AS leadName
         FROM crm2_appointments a JOIN crm2_leads l ON l.tenant=a.tenant AND l.id=a.lead_id
         WHERE a.tenant=? AND l.phone_norm=? ORDER BY a.created DESC LIMIT 100`,
      )
      .bind(c.tenant, row.phone)
      .all<{
        id: string;
        service: string;
        at: number;
        status: string;
        created: number;
        leadName: string;
      }>(),
    d
      .prepare(
        `SELECT b.id,b.service,b.room,b.status,b.start,b.end,b.started,b.finished,b.amount,b.payment,b.segments,b.created
         FROM bookings b WHERE b.tenant=? AND ${BOOKING_PHONE_NORM}=?
         ORDER BY b.created DESC LIMIT 100`,
      )
      .bind(c.tenant, row.phone)
      .all<{
        id: string;
        service: string;
        room: string;
        status: string;
        start: number;
        end: number;
        started: number | null;
        finished: number | null;
        amount: number | null;
        payment: string | null;
        segments: string;
        created: number;
      }>(),
    d
      .prepare(
        `SELECT f.id,f.kind,f.method,f.amount,f.note,f.actor,f.created,f.booking_id AS bookingId,
           f.package_id AS packageId,b.service,cp.name AS packageName
         FROM finance_entries f
         LEFT JOIN bookings b ON b.tenant=f.tenant AND b.id=f.booking_id
         LEFT JOIN customer_packages cp ON cp.tenant=f.tenant AND cp.id=f.package_id
         WHERE f.tenant=? AND ((b.id IS NOT NULL AND ${BOOKING_PHONE_NORM}=?) OR cp.customer_id=?)
         ORDER BY f.created DESC LIMIT 200`,
      )
      .bind(c.tenant, row.phone, id)
      .all<{
        id: string;
        kind: string;
        method: string;
        amount: number;
        note: string;
        actor: string;
        created: number;
        bookingId: string | null;
        packageId: string | null;
        service: string | null;
        packageName: string | null;
      }>(),
    d
      .prepare(
        `SELECT p.id,p.kind,p.label,p.paid_amount AS paidAmount,p.method,p.status,p.paid_at AS paidAt,
           p.created,o.product_name AS productName
         FROM crm2_order_payments p
         JOIN crm2_orders o ON o.tenant=p.tenant AND o.id=p.order_id
         JOIN crm2_leads l ON l.tenant=o.tenant AND l.id=o.lead_id
         WHERE p.tenant=? AND l.phone_norm=? ORDER BY COALESCE(p.paid_at,p.created) DESC LIMIT 100`,
      )
      .bind(c.tenant, row.phone)
      .all<{
        id: string;
        kind: string;
        label: string;
        paidAmount: number;
        method: string;
        status: string;
        paidAt: number | null;
        created: number;
        productName: string;
      }>(),
    d
      .prepare(
        `SELECT pl.id,pl.kind,pl.delta,pl.reason,pl.note,pl.actor,pl.created,pl.booking_id AS bookingId,cp.name AS packageName
         FROM package_ledger pl JOIN customer_packages cp ON cp.tenant=pl.tenant AND cp.id=pl.package_id
         WHERE pl.tenant=? AND cp.customer_id=? ORDER BY pl.created DESC LIMIT 100`,
      )
      .bind(c.tenant, id)
      .all<{
        id: string;
        kind: string;
        delta: number;
        reason: string;
        note: string;
        actor: string;
        created: number;
        bookingId: string | null;
        packageName: string;
      }>(),
    d
      .prepare(
        'SELECT id,delta,reason,booking_id AS bookingId,actor,created FROM loyalty_ledger WHERE tenant=? AND customer_id=? ORDER BY created DESC LIMIT 100',
      )
      .bind(c.tenant, id)
      .all<{
        id: string;
        delta: number;
        reason: string;
        bookingId: string | null;
        actor: string;
        created: number;
      }>(),
  ]);
  const timeline: TimelineEvent[] = [
    ...leads.results.map((lead) => ({
      id: `lead:${lead.id}`,
      kind: 'lead',
      at: lead.created,
      title: 'Tiếp nhận lead',
      detail: `${lead.source || 'Không rõ nguồn'} · ${lead.service || 'Chưa rõ dịch vụ'} · ${lead.stage}`,
    })),
    ...activities.results.map((a) => ({
      id: `activity:${a.id}`,
      kind: 'activity',
      at: a.created,
      title: a.type === 'CALL' ? 'Cuộc gọi' : a.type === 'ZALO' ? 'Tư vấn Zalo' : a.type,
      detail: `${a.leadName}${a.actor ? ` · ${a.actor}` : ''}${a.content ? ` · ${a.content}` : ''}`,
    })),
    ...appointments.results.map((a) => ({
      id: `appointment:${a.id}`,
      kind: 'appointment',
      at: a.created,
      title: `Lịch CRM · ${a.status}`,
      detail: `${a.leadName} · ${a.service || 'Chưa rõ dịch vụ'} · hẹn ${dateTime(a.at)}`,
    })),
    ...bookings.results.flatMap((b) => {
      const segments = playSegments(b.segments);
      const events: TimelineEvent[] = [
        {
          id: `booking:${b.id}`,
          kind: 'booking',
          at: b.created,
          title: `Booking · ${b.status}`,
          detail: `${b.room} · ${b.service} · dự kiến ${dateTime(b.start)} – ${dateTime(b.end)}`,
        },
        ...segments.flatMap((segment, index) => [
          {
            id: `started:${b.id}:${index}`,
            kind: 'session',
            at: segment.start,
            title: index === 0 ? 'Bắt đầu chơi' : 'Tiếp tục chơi',
            detail: `${b.room} · ${b.service}`,
          },
          {
            id: `ended:${b.id}:${index}`,
            kind: 'session',
            at: segment.end,
            title: b.finished != null && index === segments.length - 1 ? 'Kết thúc chơi' : 'Tạm dừng chơi',
            detail: `${b.room} · ${b.service}`,
          },
        ]),
      ];
      if (b.started != null) {
        events.push({
          id: `started:${b.id}:active`,
          kind: 'session',
          at: b.started,
          title: segments.length ? 'Tiếp tục chơi' : 'Bắt đầu chơi',
          detail: `${b.room} · ${b.service}`,
        });
      }
      if (b.finished != null && !segments.length) {
        events.push({
          id: `finished:${b.id}`,
          kind: 'session',
          at: b.finished,
          title: 'Kết thúc chơi',
          detail: `${b.room} · ${b.service} · ${b.payment ?? 'Chưa thanh toán'}`,
          amount: b.amount ?? undefined,
        });
      } else if (b.finished != null && segments.length) {
        const last = events.at(-1)!;
        last.detail += ` · ${b.payment ?? 'Chưa thanh toán'}`;
        last.amount = b.amount ?? undefined;
      }
      return events;
    }),
    ...payments.results.map((p) => ({
      id: `payment:${p.id}`,
      kind: 'payment',
      at: p.created,
      title: p.kind === 'refund' ? 'Hoàn tiền' : p.kind === 'payment' ? 'Thanh toán' : p.kind,
      detail: [p.method, p.service, p.packageName, p.note, p.actor].filter(Boolean).join(' · '),
      amount: p.kind === 'refund' ? -p.amount : p.amount,
    })),
    ...orderPayments.results.map((p) => ({
      id: `order-payment:${p.id}`,
      kind: 'payment',
      at: p.paidAt ?? p.created,
      title: `Thanh toán CRM · ${p.status}`,
      detail: [p.productName, p.label, p.method].filter(Boolean).join(' · '),
      amount: p.paidAmount,
    })),
    ...packageLedger.results.map((p) => ({
      id: `package:${p.id}`,
      kind: 'package',
      at: p.created,
      title: `Thẻ giờ · ${p.reason}`,
      detail: `${p.packageName} · ${p.delta > 0 ? '+' : ''}${p.delta} ${p.kind}${p.note ? ` · ${p.note}` : ''} · ${p.actor}`,
    })),
    ...loyaltyLedger.results.map((p) => ({
      id: `points:${p.id}`,
      kind: 'points',
      at: p.created,
      title: `Điểm thưởng · ${p.reason}`,
      detail: `${p.delta > 0 ? '+' : ''}${p.delta} điểm${p.bookingId ? ` · lượt ${p.bookingId}` : ''} · ${p.actor}`,
    })),
    ...notes.results.map((n) => ({
      id: `note:${n.id}`,
      kind: 'note',
      at: n.created,
      title: 'Ghi nhận liên hệ',
      detail: `${n.channel}${n.actor ? ` · ${n.actor}` : ''} · ${n.content}`,
    })),
    ...tasks.results.map((t) => ({
      id: `task:${t.id}`,
      kind: 'task',
      at: t.doneAt ?? t.dueAt ?? 0,
      title: `${t.title} · ${t.outcome || 'đang mở'}`,
      detail: [t.channel, t.note].filter(Boolean).join(' · '),
    })),
  ];
  timeline.sort((a, b) => b.at - a.at);
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
    timeline,
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
