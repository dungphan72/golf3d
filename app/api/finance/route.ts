import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { financeInput } from '../../../lib/finance';
import { loadFinance, applyFinance } from '../../../lib/server/finance-service';
import { can } from '../../../lib/auth/permissions';
import { originOf, requestNow } from '../../../lib/server/http';
import { onPaid } from '../../../lib/server/booking-messages';
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
  if (!can(auth, needed)) return httpError('Bạn không có quyền thực hiện thao tác này', 403);
  const result = await applyFinance(auth.tenant, auth.userId, parsed.data);
  // Payment confirmed: receipt now, thank-you tomorrow (queued once per booking, so a retry sends nothing twice).
  if (result.status === 200 && ['pay', 'pay-split', 'pay-group'].includes(parsed.data.action)) {
    const data = parsed.data;
    const ids =
      data.action === 'pay-group' ? data.bookingIds : 'bookingId' in data ? [data.bookingId] : [];
    try {
      await onPaid(auth.tenant, ids, originOf(req), requestNow(req));
    } catch (e) {
      console.error('receipt messages', e);
    }
  }
  return sendResult(result);
}
