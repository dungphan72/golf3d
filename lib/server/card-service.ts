import { db, type ServiceResult } from './common';
import { scopedShiftId } from '../finance';
import type { Grant } from '../member';
import {
  DAY_MS,
  REMIND_BEFORE_DAYS,
  absenceDays,
  canCancelAbsence,
  checkAbsence,
  clubDay,
  expiryOnActivation,
  isPeriodCard,
  termForSale,
} from '../card-term';
import {
  ACTIVATE_PACKAGE_SQL,
  CANCEL_ABSENCE_SQL,
  INSERT_ABSENCE_SQL,
  PACKAGE_TERM_SQL,
  SHIFT_BACK_SQL,
  SHIFT_EXPIRY_SQL,
} from '../package-sql';
import { enqueue, type Msg } from './outbox-service';

type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);

type TermRow = {
  id: string;
  customer_id: string;
  type_id: string | null;
  name: string;
  grants: string;
  room: string;
  perks: string;
  expires: number;
  valid_days: number;
  activated_at: number | null;
  activate_by: number | null;
  purchased: number;
};

async function loadTerm(tenant: string, packageId: string, customerId?: string) {
  const row = await db().prepare(PACKAGE_TERM_SQL).bind(tenant, packageId).first<TermRow>();
  if (!row || (customerId && row.customer_id !== customerId)) return null;
  return row;
}

export const fmtDay = (ms: number) => clubDay(ms).split('-').reverse().join('/');

/** Sale terms for a package type: an unlimited (monthly) card starts unactivated. */
export const saleTerm = (now: number, validDays: number, grants: Grant[]) =>
  termForSale(now, validDays, isPeriodCard(grants));

/** Starts the term of a monthly card. Idempotent: an activated card is left alone. */
export async function activateCard(
  tenant: string,
  packageId: string,
  customerId?: string,
  now = Date.now(),
): Promise<R> {
  const p = await loadTerm(tenant, packageId, customerId);
  if (!p) return error('Không tìm thấy thẻ', 404);
  if (p.activated_at != null || p.activate_by == null) return reply({ ok: true, replayed: true });
  await db()
    .prepare(ACTIVATE_PACKAGE_SQL)
    .bind(now, expiryOnActivation(now, p.valid_days), tenant, p.id)
    .run();
  return reply({ ok: true, expires: expiryOnActivation(now, p.valid_days) });
}

export async function addAbsence(
  tenant: string,
  actor: string,
  source: 'customer' | 'staff',
  i: { requestId: string; packageId: string; startDay: string; endDay: string; note?: string },
  customerId?: string,
  now = Date.now(),
): Promise<R> {
  const d = db();
  const id = await scopedShiftId(tenant, 'pabs-' + i.requestId);
  const dupe = await d
    .prepare('SELECT package_id FROM package_absences WHERE tenant=? AND id=?')
    .bind(tenant, id)
    .first<{ package_id: string }>();
  if (dupe)
    return dupe.package_id === i.packageId
      ? reply({ ok: true, replayed: true })
      : error('Mã yêu cầu đã dùng cho thao tác khác', 409);
  const p = await loadTerm(tenant, i.packageId, customerId);
  if (!p) return error('Không tìm thấy thẻ', 404);
  if (!isPeriodCard(JSON.parse(p.grants) as Grant[]))
    return error('Chỉ thẻ tháng mới được báo lịch vắng', 409);
  const active = (
    await d
      .prepare(
        "SELECT id,start_day,end_day,days FROM package_absences WHERE tenant=? AND package_id=? AND status='active'",
      )
      .bind(tenant, p.id)
      .all<{ id: string; start_day: string; end_day: string; days: number }>()
  ).results.map((a) => ({ id: a.id, startDay: a.start_day, endDay: a.end_day, days: a.days }));
  const problem = checkAbsence({
    now,
    startDay: i.startDay,
    endDay: i.endDay,
    activated: p.activated_at != null,
    expires: p.expires,
    validDays: p.valid_days,
    active,
  });
  if (problem) return error(problem, 409);
  const days = absenceDays(i.startDay, i.endDay);
  await d.batch([
    d
      .prepare(INSERT_ABSENCE_SQL)
      .bind(id, tenant, p.id, i.startDay, i.endDay, days, source, actor, i.note ?? '', now),
    d.prepare(SHIFT_EXPIRY_SQL).bind(days * DAY_MS, tenant, p.id),
  ]);
  return reply({ ok: true, days, expires: p.expires + days * DAY_MS });
}

export async function cancelAbsence(
  tenant: string,
  absenceId: string,
  customerId?: string,
  now = Date.now(),
): Promise<R> {
  const d = db();
  const a = await d
    .prepare('SELECT package_id,start_day,days,status FROM package_absences WHERE tenant=? AND id=?')
    .bind(tenant, absenceId)
    .first<{ package_id: string; start_day: string; days: number; status: string }>();
  if (!a) return error('Không tìm thấy lịch vắng', 404);
  const p = await loadTerm(tenant, a.package_id, customerId);
  if (!p) return error('Không tìm thấy lịch vắng', 404);
  if (a.status !== 'active') return reply({ ok: true, replayed: true });
  if (!canCancelAbsence(now, a.start_day))
    return error('Lịch vắng đã bắt đầu nên không huỷ được', 409);
  await d.batch([
    d.prepare(SHIFT_BACK_SQL).bind(a.days * DAY_MS, tenant, a.package_id, tenant, absenceId),
    d.prepare(CANCEL_ABSENCE_SQL).bind(now, tenant, absenceId),
  ]);
  return reply({ ok: true });
}

export type CardReport = { activated: number; reminders: number };

/**
 * Daily work (called from the CRM cron, safe to run every few minutes): activates monthly cards whose
 * 30 days passed (on day 30, not on the day the job happened to run) and queues a customer reminder
 * once before a card expires or is auto-activated.
 */
export async function runCardMaintenance(tenant: string, now: number): Promise<CardReport> {
  const d = db();
  const rep: CardReport = { activated: 0, reminders: 0 };
  const due = (
    await d
      .prepare(
        'SELECT id,activate_by,valid_days FROM customer_packages WHERE tenant=? AND activated_at IS NULL AND activate_by IS NOT NULL AND activate_by<=? LIMIT 200',
      )
      .bind(tenant, now)
      .all<{ id: string; activate_by: number; valid_days: number }>()
  ).results;
  for (const c of due) {
    const r = await d
      .prepare(ACTIVATE_PACKAGE_SQL)
      .bind(c.activate_by, expiryOnActivation(c.activate_by, c.valid_days), tenant, c.id)
      .run();
    if (r.meta.changes) rep.activated++;
  }

  const horizon = now + REMIND_BEFORE_DAYS * DAY_MS;
  type Who = { id: string; name: string; email: string; zalo: string; customer: string };
  const who = `c.name AS customer,c.email AS email,c.zalo_id AS zalo,cp.id AS id,cp.name AS name`;
  const send = async (row: Who, ukey: string, subject: string, body: string, mark: D1PreparedStatement) => {
    const msgs: Msg[] = [];
    if (row.email)
      msgs.push({ ukey: ukey + ':email', channel: 'email', recipient: row.email, subject, body, kind: 'card', audience: 'customer' });
    if (row.zalo)
      msgs.push({ ukey: ukey + ':zalo', channel: 'zalo', recipient: row.zalo, subject, body, kind: 'card', audience: 'customer' });
    // Mark first so a failing send never repeats; a customer with no contact is simply skipped.
    await mark.run();
    if (msgs.length) rep.reminders += await enqueue(tenant, msgs, now);
  };

  const activating = (
    await d
      .prepare(
        `SELECT ${who},cp.activate_by AS due FROM customer_packages cp JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
         WHERE cp.tenant=? AND cp.activated_at IS NULL AND cp.activate_by IS NOT NULL AND cp.activate_by>? AND cp.activate_by<=? AND cp.reminded_activate IS NULL LIMIT 200`,
      )
      .bind(tenant, now, horizon)
      .all<Who & { due: number }>()
  ).results;
  for (const r of activating)
    await send(
      r,
      `card:activate:${r.id}`,
      'Thẻ tháng sắp tự kích hoạt',
      `Chào ${r.customer}, ${r.name} của bạn sẽ tự kích hoạt vào ${fmtDay(r.due)} nếu chưa dùng. Bạn có thể kích hoạt sớm hoặc báo lịch vắng sau khi kích hoạt.`,
      d.prepare('UPDATE customer_packages SET reminded_activate=? WHERE tenant=? AND id=?').bind(now, tenant, r.id),
    );

  const expiring = (
    await d
      .prepare(
        `SELECT ${who},cp.expires AS expires,cp.grants AS grants,
           COALESCE((SELECT remaining FROM package_balances b WHERE b.tenant=cp.tenant AND b.package_id=cp.id AND b.kind='gdr'),0) AS hrs
         FROM customer_packages cp JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
         WHERE cp.tenant=? AND cp.source='sale' AND cp.activated_at IS NOT NULL AND cp.expires<=? AND cp.expires>=?
           AND (cp.reminded_expiry IS NULL OR cp.reminded_expiry<>cp.expires) LIMIT 200`,
      )
      .bind(tenant, horizon, now - 30 * DAY_MS)
      .all<Who & { expires: number; grants: string; hrs: number }>()
  ).results;
  for (const r of expiring) {
    const grants = JSON.parse(r.grants) as Grant[];
    const period = isPeriodCard(grants);
    if (!period) continue;
    const lapsed = r.expires < now;
    const body = `Chào ${r.customer}, ${r.name} ${lapsed ? 'đã hết hạn từ' : 'sẽ hết hạn vào'} ${fmtDay(r.expires)}. Vui lòng liên hệ câu lạc bộ để gia hạn.`;
    await send(
      r,
      `card:expiry:${r.id}:${r.expires}`,
      lapsed ? 'Thẻ đã hết hạn' : 'Thẻ sắp hết hạn',
      body,
      d.prepare('UPDATE customer_packages SET reminded_expiry=? WHERE tenant=? AND id=?').bind(r.expires, tenant, r.id),
    );
  }
  return rep;
}
