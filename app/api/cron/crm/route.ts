import { sendResult, httpError, originOf, requestNow } from '../../../../lib/server/http';
import { secret } from '../../../../lib/server/providers';
import { db } from '../../../../lib/server/common';
import { safeEqual } from '../../../../lib/server/throttle';
import { runCrmCron } from '../../../../modules/crm/server/cron';
export const dynamic = 'force-dynamic';

/**
 * Kept so schedulers already pointed at /api/cron/crm keep working: runs the CRM module's background work
 * (same as /api/crm2/cron). Call every 5 minutes with `Authorization: Bearer CRON_SECRET`.
 */
export async function POST(req: Request) {
  await req.text().catch(() => '');
  const expected = secret('CRON_SECRET');
  if (!expected || expected.length < 16) return httpError('Chưa cấu hình CRON_SECRET', 503);
  if (!safeEqual(req.headers.get('authorization') ?? '', `Bearer ${expected}`))
    return httpError('Không được phép', 401);
  const tenants = (
    await db().prepare('SELECT DISTINCT tenant FROM memberships').all<{ tenant: string }>()
  ).results;
  const reports = [];
  for (const t of tenants) reports.push(await runCrmCron(t.tenant, originOf(req), requestNow(req)));
  return sendResult({ status: 200, body: { ok: true, reports } });
}
