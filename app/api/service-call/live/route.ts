import { authorize, sendResult } from '../../../auth-session';
import { getLiveServiceCalls } from '../../../../lib/server/service-call-service';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { auth, response } = await authorize('view');
  if (response) return response;

  const data = await getLiveServiceCalls(auth.tenant);
  return sendResult({
    status: 200,
    body: { ok: true, ...data },
  });
}
