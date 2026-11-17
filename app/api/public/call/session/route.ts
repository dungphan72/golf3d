import { resolveQrToken, createGuestSession } from '../../../../../lib/server/service-call-service';
import { sendResult, httpError, clientIp } from '../../../../../lib/server/http';
import { overLimit } from '../../../../../lib/server/throttle';
import { sameOrigin } from '../../../../auth-session';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let body: { token?: unknown; phone?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > 500) return httpError('Dữ liệu quá lớn', 413);
    body = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ', 400);
  }

  const { token, phone } = body;
  if (typeof token !== 'string' || token.length < 10) {
    return httpError('Mã QR không hợp lệ', 400);
  }

  const ip = clientIp(req);
  if (await overLimit('sc_session_' + ip, ip, 60_000, 20)) {
    return httpError('Quá nhiều yêu cầu, vui lòng thử lại sau', 429);
  }

  const resolved = await resolveQrToken(token);
  if (resolved.status !== 200 || !resolved.body.ok) {
    return sendResult(resolved);
  }

  const resolvedData = resolved.body as {
    tenant: string;
    roomId: string;
    guestMode: 'MODE_A' | 'MODE_B' | 'MODE_C';
  };

  const strPhone = typeof phone === 'string' ? phone.trim() : undefined;
  if (resolvedData.guestMode === 'MODE_B' && (!strPhone || strPhone.length < 9)) {
    return httpError('Vui lòng nhập số điện thoại hợp lệ để tiếp tục', 400);
  }

  const ua = req.headers.get('user-agent') || undefined;
  return sendResult(
    await createGuestSession(resolvedData.tenant, resolvedData.roomId, token, strPhone, ip, ua)
  );
}
