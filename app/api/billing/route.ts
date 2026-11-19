import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { billingInput } from '../../../lib/billing';
import { loadBill, applyBilling } from '../../../lib/server/billing-service';
import { can } from '../../../lib/auth/permissions';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { auth, response } = await authorize('finance.view');
  if (response) return response;
  const booking = new URL(req.url).searchParams.get('booking') ?? '';
  if (!booking || booking.length > 100) return httpError('Thiếu mã phiếu');
  return sendResult(await loadBill(auth.tenant, booking));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('view');
  if (response) return response;
  let json: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 3000) return httpError('Yêu cầu quá lớn', 413);
    json = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const parsed = billingInput.safeParse(json);
  if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
  const needed = parsed.data.action === 'discount' ? 'billing.discount' : 'billing.refund';
  if (!can(auth, needed)) return httpError('Bạn không có quyền thực hiện thao tác này', 403);
  return sendResult(await applyBilling(auth.tenant, auth.userId, parsed.data));
}
