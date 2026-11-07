import { db } from '../../../lib/server/common';
import { isManager } from '../core/access';
import { DAY, fail, reply, type Ctx, type Result } from './store';

/** Consulting and care report for managers: funnel, sources, lost reasons, people, and care task results. */
export async function leadReport(c: Ctx, days: number): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý xem báo cáo', 403);
  const span = Math.min(Math.max(Math.round(days) || 30, 1), 365);
  const since = c.now - span * DAY;
  const d = db();
  const all = async (sql: string) => (await d.prepare(sql).bind(c.tenant, since).all()).results;
  const [stages, sources, lost, agents, care] = await Promise.all([
    all('SELECT stage,COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND created>=? GROUP BY stage'),
    all(
      `SELECT source,COUNT(*) AS leads,SUM(stage='WON') AS won,SUM(stage='LOST') AS lost,
         COALESCE(SUM(CASE WHEN stage='WON' THEN expected_value END),0) AS value
       FROM crm2_leads WHERE tenant=? AND created>=? GROUP BY source ORDER BY leads DESC LIMIT 20`,
    ),
    all(
      `SELECT lost_reason AS reason,COUNT(*) AS n FROM crm2_leads
       WHERE tenant=? AND created>=? AND stage='LOST' AND lost_reason<>'' GROUP BY lost_reason ORDER BY n DESC LIMIT 10`,
    ),
    all(
      `SELECT l.owner AS userId,COALESCE(u.name,'Kho số (chưa phân)') AS name,COUNT(*) AS leads,
         SUM(l.first_response_at IS NOT NULL) AS responded,SUM(l.stage='WON') AS won,
         COALESCE(SUM(CASE WHEN l.stage='WON' THEN l.expected_value END),0) AS value,
         AVG(l.first_response_min) AS avgMin
       FROM crm2_leads l LEFT JOIN users u ON u.id=l.owner
       WHERE l.tenant=? AND l.created>=? GROUP BY l.owner ORDER BY won DESC, leads DESC LIMIT 30`,
    ),
    all(
      `SELECT rule,COUNT(*) AS total,SUM(outcome='done') AS done,SUM(outcome='skipped') AS skipped
       FROM crm2_tasks WHERE tenant=? AND customer_id IS NOT NULL AND created>=? GROUP BY rule ORDER BY total DESC`,
    ),
  ]);
  const total = (stages as { n: number }[]).reduce((a, x) => a + x.n, 0);
  return reply({ days: span, total, stages, sources, lost, agents, care, now: c.now });
}
