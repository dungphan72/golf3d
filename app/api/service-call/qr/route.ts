import { authorize, sendResult, httpError, sameOrigin } from '../../../auth-session';
import { listQrCodes, revokeAndRotateQr } from '../../../../lib/server/service-call-service';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { auth, response } = await authorize('view');
  if (response) return response;

  const qrList = await listQrCodes(auth.tenant);
  return sendResult({
    status: 200,
    body: { ok: true, qrCodes: qrList, qrs: qrList },
  });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('settings.manage');
  if (response) return response;

  let body: any;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return httpError('Dữ liệu không hợp lệ', 400);
  }

  const { action, roomId } = body;
  if (action === 'rotate' && roomId) {
    const updated = await revokeAndRotateQr(auth.tenant, roomId);
    return sendResult({
      status: 200,
      body: { ok: true, qr: updated },
    });
  }

  return httpError('Hành động không hợp lệ', 400);
}
