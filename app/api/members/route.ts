import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import {
  loadMembers,
  usablePackages,
  applyMember,
  memberInput,
} from '../../../lib/server/member-service';
import { can, type Permission } from '../../../lib/auth/permissions';
import { originOf, requestNow } from '../../../lib/server/http';
import { onPaid } from '../../../lib/server/booking-messages';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const booking = params.get('usableFor');
  if (booking) {
    // Used at the payment step, so it needs the payment permission rather than member.view.
    const { auth, response } = await authorize('finance.operate');
    if (response) return response;
    return sendResult(await usablePackages(auth.tenant, booking));
  }
  const { auth, response } = await authorize('member.view');
  if (response) return response;
  return sendResult(await loadMembers(auth.tenant, params.get('q') ?? '', params.get('customer')));
}

const NEEDED: Record<string, Permission> = {
  'customer-create': 'member.sell',
  'customer-update': 'member.sell',
  sell: 'member.sell',
  'points-redeem': 'member.sell',
  redeem: 'finance.operate',
  'wallet-pay': 'finance.operate',
  'wallet-topup': 'member.sell',
  'type-save': 'member.adjust',
  'type-delete': 'member.adjust',
  'types-seed': 'member.adjust',
  'account-verify': 'member.sell',
  'order-reject': 'member.sell',
  activate: 'member.sell',
  'absence-create': 'member.sell',
  'absence-cancel': 'member.sell',
  'account-reset': 'member.adjust',
  adjust: 'member.adjust',
};

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('view');
  if (response) return response;
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 6000) return httpError('Yêu cầu quá lớn', 413);
    const parsed = memberInput.safeParse(JSON.parse(raw));
    if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
    input = parsed.data;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const needed = NEEDED[input.action];
  if (!needed || !can(auth.role, needed))
    return httpError('Bạn không có quyền thực hiện thao tác này', 403);
  const result = await applyMember(auth.tenant, auth.userId, input);
  // A round fully covered by a package is paid: send the receipt like any other payment.
  if (result.status === 200 && (input.action === 'redeem' || input.action === 'wallet-pay')) {
    try {
      await onPaid(auth.tenant, [input.bookingId], originOf(req), requestNow(req));
    } catch (e) {
      console.error('receipt messages', e);
    }
  }
  return sendResult(result);
}
