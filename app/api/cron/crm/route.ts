import { sendResult, httpError, originOf, requestNow } from '../../../../lib/server/http';
import { secret } from '../../../../lib/server/providers';
import { db } from '../../../../lib/server/common';
import { sweepLeads } from '../../../../lib/server/lead-service';
export const dynamic = 'force-dynamic';

/**
 * Runs the lead sweep (overdue calls, queue, due messages) for every club. Call it every minute from
 * a scheduler (Cloudflare Cron, cron-job.org, UptimeRobot) with `Authorization: Bearer CRON_SECRET`.
 */
export async function POST(req: Request) {
  const expected = secret('CRON_SECRET');
  if (!expected) return httpError('Chưa cấu hình CRON_SECRET', 503);
  if (req.headers.get('authorization') !== `Bearer ${expected}`)
    return httpError('Không được phép', 401);
  const tenants = (await db().prepare('SELECT tenant FROM settings').all<{ tenant: string }>())
    .results;
  const now = requestNow(req);
  for (const t of tenants) await sweepLeads(t.tenant, originOf(req), now);
  return sendResult({ status: 200, body: { ok: true, clubs: tenants.length } });
}
