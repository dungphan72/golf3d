import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { financeInput } from '../../../lib/finance';
import { loadFinance, applyFinance } from '../../../lib/server/finance-service';
import { can } from '../../../lib/auth/permissions';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const { auth, response } = await authorize('finance.view');
  if (response) return response;
  return sendResult(await loadFinance(auth.tenant, new URL(req.url).searchParams.get('shift')));
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('view');
  if (response) return response;
  let json: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 5000) return httpError('Yêu cầu quá lớn', 413);
    json = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const parsed = financeInput.safeParse(json);
  if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
  const needed =
    parsed.data.action === 'open' || parsed.data.action === 'close'
      ? 'finance.shift'
      : 'finance.operate';
  if (!can(auth.role, needed)) return httpError('Bạn không có quyền thực hiện thao tác này', 403);
  return sendResult(await applyFinance(auth.tenant, auth.userId, parsed.data));
}
