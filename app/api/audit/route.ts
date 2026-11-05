import { authorize, sendResult } from '../../auth-session';
import { auditLog } from '../../../lib/server/audit-service';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { auth, response } = await authorize('staff.manage');
  if (response) return response;
  const q = new URL(req.url).searchParams;
  const before = Number(q.get('before'));
  return sendResult(
    await auditLog(
      auth.tenant,
      Number.isSafeInteger(before) && before > 0 ? before : null,
      q.get('q') ?? '',
    ),
  );
}
