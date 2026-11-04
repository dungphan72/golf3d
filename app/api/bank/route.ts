import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { bankOverview, applyBank, bankInput } from '../../../lib/server/bank-service';
import { can } from '../../../lib/auth/permissions';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const booking = new URL(req.url).searchParams.get('booking');
  const { auth, response } = await authorize('finance.operate');
  if (response) return response;
  return sendResult(await bankOverview(auth.tenant, booking));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('finance.operate');
  if (response) return response;
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 1000) return httpError('Yêu cầu quá lớn', 413);
    const parsed = bankInput.safeParse(JSON.parse(raw));
    if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
    input = parsed.data;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  // Setting or removing the webhook key changes where money is accepted from: settings only.
  if (input.action !== 'ignore' && !can(auth.role, 'settings.manage'))
    return httpError('Bạn không có quyền thực hiện thao tác này', 403);
  return sendResult(await applyBank(auth.tenant, input));
}
