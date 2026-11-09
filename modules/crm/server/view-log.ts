import { db } from '../../../lib/server/common';
import { isManager } from '../core/access';
import { DAY, fail, reply, type Ctx, type Result } from './store';

/** Managers see who opened which customer's phone number, newest first. */
export async function viewLog(c: Ctx, q: URLSearchParams): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý xem nhật ký', 403);
  const days = Math.min(Math.max(Math.round(Number(q.get('days') ?? 7)) || 7, 1), 90);
  const user = (q.get('user') ?? '').slice(0, 100);
  const args: (string | number)[] = [c.tenant, c.now - days * DAY];
  let where = 'v.tenant=? AND v.created>=?';
  if (user) {
    where += ' AND v.user_id=?';
    args.push(user);
  }
  const rows = (
    await db()
      .prepare(
        `SELECT v.id,v.user_id AS userId,COALESCE(u.name,'(đã xóa)') AS userName,v.lead_id AS leadId,v.lead_name AS leadName,v.kind,v.created
         FROM crm2_view_log v LEFT JOIN users u ON u.id=v.user_id
         WHERE ${where} ORDER BY v.created DESC LIMIT 500`,
      )
      .bind(...args)
      .all()
  ).results;
  const perUser = (
    await db()
      .prepare(
        `SELECT v.user_id AS userId,COALESCE(u.name,'(đã xóa)') AS userName,COUNT(*) AS views,COUNT(DISTINCT v.lead_id) AS leads
         FROM crm2_view_log v LEFT JOIN users u ON u.id=v.user_id WHERE v.tenant=? AND v.created>=? GROUP BY v.user_id ORDER BY views DESC LIMIT 50`,
      )
      .bind(c.tenant, c.now - days * DAY)
      .all()
  ).results;
  return reply({ days, rows, perUser });
}
