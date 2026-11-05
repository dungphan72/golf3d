import { authorize, sendResult } from '../../auth-session';
import { revenueReport } from '../../../lib/server/report-service';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { auth, response } = await authorize('finance.view');
  if (response) return response;
  const q = new URL(req.url).searchParams;
  return sendResult(await revenueReport(auth.tenant, q.get('from'), q.get('to')));
}
