import { sendResult, httpError } from '../../auth-session';
import { publicTenant } from '../../../lib/server/member-account-service';
import { publicBoard } from '../../../lib/server/tournament-score-service';
export const dynamic = 'force-dynamic';

/** Public ranking of a published tournament (confirmed score cards only). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const tenant = await publicTenant();
  if (!tenant) return httpError('Chưa có giải đấu', 404);
  return sendResult(await publicBoard(tenant, q.get('post') ?? '', q.get('round'), q.get('group')));
}
