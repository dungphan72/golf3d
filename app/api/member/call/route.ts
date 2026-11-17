import { cookies } from 'next/headers';
import { sendResult, httpError, sameOrigin } from '../../../auth-session';
import { MEMBER_COOKIE } from '../../../../lib/member-account';
import { memberFromSession } from '../../../../lib/server/member-account-service';
import {
  getServiceCallSettings,
  getServiceCallCategories,
  createServiceCall,
  getActiveMenuItems,
} from '../../../../lib/server/service-call-service';
import { db } from '../../../../lib/server/common';
import type { ServiceCall, ServiceCallCategory } from '../../../../lib/service-call';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  const user = token ? await memberFromSession(token) : null;
  if (!user) return sendResult({ status: 401, body: { error: 'Chưa đăng nhập hội viên' } });

  const categories = await getServiceCallCategories(user.tenant);
  const settings = await getServiceCallSettings(user.tenant);
  const menuItems = await getActiveMenuItems(user.tenant);

  // Check active calls for this member phone or memberId
  const activeCall = await db()
    .prepare(
      "SELECT * FROM sc_calls WHERE tenant=? AND (customer_phone=? OR member_id=?) AND status IN ('CREATED','ACKNOWLEDGED','IN_PROGRESS') ORDER BY created_at DESC LIMIT 1"
    )
    .bind(user.tenant, user.phone, user.customerId)
    .first<ServiceCall>();

  return sendResult({
    status: 200,
    body: {
      ok: true,
      categories: categories.filter((c: ServiceCallCategory) => c.is_active),
      menuItems,
      settings,
      activeCall: activeCall || null,
    },
  });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  const user = token ? await memberFromSession(token) : null;
  if (!user) return sendResult({ status: 401, body: { error: 'Chưa đăng nhập hội viên' } });

  let body: any;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return httpError('Dữ liệu không hợp lệ', 400);
  }

  const { categoryCode, note, roomId: requestedRoomId, items } = body;
  if (!categoryCode) return httpError('Vui lòng chọn loại yêu cầu', 400);

  // Find active playing booking for this member
  let targetRoomId = requestedRoomId;

  const activeBooking = await db()
    .prepare(
      "SELECT id, room, customer FROM bookings WHERE tenant=? AND phone=? AND status IN ('playing','paused') LIMIT 1"
    )
    .bind(user.tenant, user.phone)
    .first<{ id: string; room: string; customer: string }>();

  if (activeBooking) {
    targetRoomId = activeBooking.room;
  } else if (!targetRoomId) {
    return httpError('Không tìm thấy phiên chơi đang hoạt động của bạn. Vui lòng quét mã QR tại Line để gọi.', 400);
  }

  const result = await createServiceCall({
    tenant: user.tenant,
    roomId: targetRoomId,
    categoryCode,
    source: 'member_app',
    customerName: activeBooking?.customer || user.phone,
    customerPhone: user.phone,
    memberId: user.customerId,
    note,
    items,
  });

  return sendResult(result);
}
