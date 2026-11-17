import { verifyGuestSession, cancelServiceCall } from '../../../../../lib/server/service-call-service';
import { sendResult, httpError } from '../../../../../lib/server/http';
import { sameOrigin } from '../../../../auth-session';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let body: { callId?: unknown; sessionToken?: unknown; reason?: unknown };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return httpError('Dữ liệu không hợp lệ', 400);
  }

  const { callId, sessionToken, reason } = body;
  if (typeof callId !== 'string' || !callId) return httpError('Thiếu mã yêu cầu', 400);
  if (typeof sessionToken !== 'string' || !sessionToken) {
    return httpError('Phiên truy cập không hợp lệ', 401);
  }

  const sess = await verifyGuestSession(sessionToken);
  if (!sess) return httpError('Phiên truy cập đã hết hạn', 401);

  return sendResult(
    await cancelServiceCall({
      tenant: sess.tenant,
      callId,
      actorType: 'guest',
      reason: typeof reason === 'string' ? reason.slice(0, 200) : 'Khách tự hủy',
    })
  );
}
