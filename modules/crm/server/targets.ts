import { audit, db } from '../../../lib/server/common';
import { isManager } from '../core/access';
import { monthKey, monthRange, progress, sanitizeTargets, validMonth, type Targets } from '../core/targets';
import { fail, getRuntime, reply, setRuntime, staffList, type Ctx, type Result } from './store';

const key = (month: string) => `targets:${month}`;

/**
 * Revenue collected in the month by the CRM: payments received (deposits and instalments) on orders that are not
 * cancelled, credited to the person who owns the order's lead. Payments of the club's own booking system are not here.
 */
async function collected(tenant: string, month: string) {
  const { start, end } = monthRange(month);
  const rows = (
    await db()
      .prepare(
        `SELECT l.owner AS owner,COALESCE(SUM(p.paid_amount),0) AS amount
         FROM crm2_order_payments p
         JOIN crm2_orders o ON o.id=p.order_id AND o.tenant=p.tenant
         JOIN crm2_leads l ON l.id=o.lead_id AND l.tenant=o.tenant
         WHERE p.tenant=? AND p.paid_amount>0 AND p.paid_at>=? AND p.paid_at<? AND o.status<>'CANCELLED'
         GROUP BY l.owner`,
      )
      .bind(tenant, start, end)
      .all<{ owner: string | null; amount: number }>()
  ).results;
  const byOwner: Record<string, number> = {};
  let club = 0;
  for (const r of rows) {
    club += r.amount;
    if (r.owner) byOwner[r.owner] = (byOwner[r.owner] ?? 0) + r.amount;
  }
  return { club, byOwner };
}

/** Targets and progress for a month. Managers see everyone; staff see the club total and their own row only. */
export async function targetsReport(c: Ctx, monthParam: string | null): Promise<Result> {
  const month = validMonth(monthParam) ? monthParam : monthKey(c.now);
  const saved = await getRuntime<unknown>(c.tenant, key(month)).catch(() => null);
  const targets = sanitizeTargets(saved?.value);
  const { club, byOwner } = await collected(c.tenant, month);
  const manager = isManager(c.role);
  const people = (await staffList(c.tenant)).filter((s) => ['sale', 'cskh'].includes(s.role) || targets.staff[s.id] || byOwner[s.id]);
  const staff = people
    .filter((s) => manager || s.id === c.userId)
    .map((s) => ({
      id: s.id,
      name: s.name,
      ...progress(targets.staff[s.id] ?? 0, byOwner[s.id] ?? 0, month, c.now),
    }));
  return reply({
    month,
    days: monthRange(month).days,
    club: progress(targets.club, club, month, c.now),
    staff,
    // the form that sets targets needs everyone, even people with no target yet
    editable: manager,
    people: manager ? people.map((s) => ({ id: s.id, name: s.name })) : [],
    now: c.now,
  });
}

export async function setTargets(c: Ctx, month: unknown, raw: unknown): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý đặt mục tiêu', 403);
  if (!validMonth(month)) return fail('Tháng không hợp lệ');
  const allowed = new Set((await staffList(c.tenant)).map((s) => s.id));
  const t = sanitizeTargets(raw);
  const clean: Targets = { club: t.club, staff: Object.fromEntries(Object.entries(t.staff).filter(([id]) => allowed.has(id))) };
  await setRuntime(c.tenant, key(month), clean, c.now);
  await audit(c.tenant, 'crm.targets', `Đặt mục tiêu doanh thu ${month}: CLB ${clean.club}, ${Object.keys(clean.staff).length} nhân viên`);
  return reply({ ok: true });
}
