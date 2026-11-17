import { resolveQrToken } from '../../../../../lib/server/service-call-service';
import { sendResult, httpError } from '../../../../../lib/server/http';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!token || token.length < 10) {
    return httpError('Mã QR không hợp lệ hoặc thiếu thông tin', 400);
  }
  return sendResult(await resolveQrToken(token));
}
