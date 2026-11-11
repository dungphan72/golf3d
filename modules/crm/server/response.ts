import { db } from '../../../lib/server/common';
import { isManager } from '../core/access';
import { groupStats, statsOf, type ResponseRow } from '../core/response';
import { DAY, fail, getSettings, reply, type Ctx, type Result } from './store';

/**
 * Response-time report (managers): from the moment a lead has an owner to the first contact, per staff member,
 * team and source, plus the leads still waiting longer than the SLA.
 */
export async function responseReport(c: Ctx, days: number): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý xem báo cáo phản hồi', 403);
  const span = Math.min(Math.max(Math.round(days) || 30, 1), 365);
  const since = c.now - span * DAY;
  const sla = (await getSettings(c.tenant)).slaMinutes;
  const d = db();
  const rows = (
    await d
      .prepare(
        `SELECT l.owner,COALESCE(u.name,'(đã xóa)') AS ownerName,COALESCE(s.team,'') AS team,l.source,
           l.first_response_min AS minutes,l.first_response_work_min AS workMinutes
         FROM crm2_leads l
         LEFT JOIN users u ON u.id=l.owner
         LEFT JOIN crm2_staff s ON s.tenant=l.tenant AND s.user_id=l.owner
         WHERE l.tenant=? AND l.owner IS NOT NULL AND l.owned_at>=? AND l.seeding=0
         LIMIT 5000`,
      )
      .bind(c.tenant, since)
      .all<ResponseRow>()
  ).results;
  const waiting = (
    await d
      .prepare(
        `SELECT l.id,l.full_name AS fullName,l.source,l.owned_at AS ownedAt,COALESCE(u.name,'') AS ownerName
         FROM crm2_leads l LEFT JOIN users u ON u.id=l.owner
         WHERE l.tenant=? AND l.owner IS NOT NULL AND l.first_response_at IS NULL AND l.stage='NEW' AND l.seeding=0
           AND l.owned_at<=? ORDER BY l.owned_at ASC LIMIT 20`,
      )
      .bind(c.tenant, c.now - sla * 60_000)
      .all<{ id: string; fullName: string; source: string; ownedAt: number; ownerName: string }>()
  ).results;
  return reply({
    days: span,
    slaMinutes: sla,
    overall: statsOf(rows, sla),
    byStaff: groupStats(rows, (r) => r.ownerName, sla),
    byTeam: groupStats(rows, (r) => r.team, sla),
    bySource: groupStats(rows, (r) => r.source, sla),
    waiting,
    now: c.now,
  });
}
