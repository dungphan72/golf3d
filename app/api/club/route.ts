import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import {
  clubInput,
  loadDashboard,
  runClubAction,
  MAX_BODY,
} from '../../../lib/server/club-service';
import { can, permissionsOf, type Permission } from '../../../lib/auth/permissions';
import { requestNow } from '../../../lib/server/http';
import { afterClubAction } from '../../../lib/server/booking-messages';
export const dynamic = 'force-dynamic';

const ACTION_PERMISSION: Record<string, Permission> = {
  settings: 'settings.manage',
  book: 'booking.create',
  cancel: 'booking.cancel',
  start: 'session.operate',
  pause: 'session.operate',
  resume: 'session.operate',
  finish: 'session.operate',
  pay: 'finance.operate',
  support: 'support.handle',
  'no-show': 'booking.cancel',
  reschedule: 'booking.create',
  extend: 'session.operate',
  'switch-service': 'session.operate',
  'round-min': 'finance.operate',
  'keep-actual': 'finance.operate',
  walkin: 'session.operate',
  maintenance: 'session.operate',
  'request-update': 'support.handle',
  'clean-test-data': 'settings.manage',
};

export async function GET() {
  const { auth, response } = await authorize('view');
  if (response) return response;
  const data = await loadDashboard(auth.tenant, auth.name);
  return Response.json(
    { ...data, role: auth.role, permissions: permissionsOf(auth.role) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function POST(req: Request) {
  // Read the body before any early reply: an unread body upsets the worker runtime.
  const raw = await req.text().catch(() => '');
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('view');
  if (response) return response;
  let input;
  try {
    if (raw.length > MAX_BODY) return httpError('Yêu cầu quá lớn', 413);
    input = clubInput.parse(JSON.parse(raw));
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const needed = ACTION_PERMISSION[input.action];
  if (!needed || !can(auth.role, needed))
    return httpError('Bạn không có quyền thực hiện thao tác này', 403);
  // Wiping bookings, shifts and the cashbook is irreversible: only the facility owner may do it.
  if (input.action === 'clean-test-data' && auth.role !== 'owner')
    return httpError('Chỉ Chủ cơ sở được dọn dẹp dữ liệu', 403);
  try {
    const now = requestNow(req);
    const result = await runClubAction(auth.tenant, input, now);
    await afterClubAction(auth.tenant, input, result, now);
    return sendResult(result);
  } catch (e) {
    console.error(e);
    return httpError('Không thể xử lý yêu cầu. Vui lòng thử lại.', 500);
  }
}
