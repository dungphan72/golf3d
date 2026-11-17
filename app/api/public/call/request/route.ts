import {
  verifyGuestSession,
  resolveQrToken,
  createServiceCall,
  getCallStatusForGuest,
} from '../../../../../lib/server/service-call-service';
import { sendResult, httpError, clientIp } from '../../../../../lib/server/http';
import { overLimit } from '../../../../../lib/server/throttle';
import { sameOrigin } from '../../../../auth-session';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const callId = p.get('callId') ?? '';
  const tenant = p.get('tenant') ?? '';
  const sessionToken = p.get('sessionToken') ?? '';

  if (!callId) return httpError('Thiếu mã yêu cầu', 400);

  let finalTenant = tenant;
  if (!finalTenant && sessionToken) {
    const sess = await verifyGuestSession(sessionToken);
    if (sess) finalTenant = sess.tenant;
  }

  if (!finalTenant) return httpError('Thiếu thông tin xác thực', 400);

  return sendResult(await getCallStatusForGuest(finalTenant, callId));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let body: {
    token?: unknown;
    sessionToken?: unknown;
    categoryCode?: unknown;
    customerName?: unknown;
    customerPhone?: unknown;
    note?: unknown;
    idempotencyKey?: unknown;
    items?: unknown;
  };

  try {
    const raw = await req.text();
    if (raw.length > 5000) return httpError('Dữ liệu quá lớn', 413);
    body = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ', 400);
  }

  const { token, sessionToken, categoryCode, customerName, customerPhone, note, idempotencyKey, items } = body;
  if (typeof categoryCode !== 'string' || !categoryCode) {
    return httpError('Vui lòng chọn loại yêu cầu', 400);
  }

  const ip = clientIp(req);
  if (await overLimit('sc_req_' + ip, ip, 60_000, 15)) {
    return httpError('Quá nhiều yêu cầu gửi liên tiếp, vui lòng thử lại sau', 429);
  }

  let tenant = '';
  let roomId = '';
  let verifiedPhone: string | undefined = typeof customerPhone === 'string' ? customerPhone.trim() : undefined;

  // Option 1: Verify via sessionToken
  if (typeof sessionToken === 'string' && sessionToken.length > 5) {
    const sess = await verifyGuestSession(sessionToken);
    if (!sess) return httpError('Phiên truy cập đã hết hạn, vui lòng quét lại mã QR', 401);
    tenant = sess.tenant;
    roomId = sess.room_id;
    if (sess.phone && !verifiedPhone) verifiedPhone = sess.phone;
  }
  // Option 2: Fallback direct verify via token
  else if (typeof token === 'string' && token.length >= 10) {
    const resolved = await resolveQrToken(token);
    if (resolved.status !== 200 || !resolved.body.ok) return sendResult(resolved);
    const d = resolved.body as { tenant: string; roomId: string };
    tenant = d.tenant;
    roomId = d.roomId;
  } else {
    return httpError('Mã QR hoặc phiên truy cập không hợp lệ', 400);
  }

  return sendResult(
    await createServiceCall({
      tenant,
      roomId,
      categoryCode,
      source: 'guest_qr',
      customerName: typeof customerName === 'string' ? customerName.slice(0, 100) : undefined,
      customerPhone: verifiedPhone,
      note: typeof note === 'string' ? note.slice(0, 250) : undefined,
      idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey.slice(0, 80) : undefined,
      items: Array.isArray(items) ? (items as any) : undefined,
    })
  );
}
