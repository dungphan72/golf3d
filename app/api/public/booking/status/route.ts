import { requestStatus, cancelRequest } from '../../../../../lib/server/online-service';
import { sendResult, httpError, clientIp } from '../../../../../lib/server/http';
import { overLimit } from '../../../../../lib/server/throttle';
import { sameOrigin } from '../../../../auth-session';
export const dynamic = 'force-dynamic';

const tooMany = () => httpError('Quá nhiều yêu cầu, thử lại sau ít phút', 429);

export async function GET(req: Request) {
  if (await overLimit('booking_status', clientIp(req), 10 * 60_000, 120)) return tooMany();
  return sendResult(await requestStatus(new URL(req.url).searchParams.get('code') ?? ''));
}
export async function POST(req: Request) {
  // The shared check understands reverse proxies (nginx in front of the Node server): comparing with the URL the
  // server itself sees would reject every browser request on the VPS.
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  if (await overLimit('booking_status', clientIp(req), 10 * 60_000, 120)) return tooMany();
  let code = '';
  try {
    const text = await req.text();
    if (text.length > 500) return httpError('Yêu cầu quá lớn', 413);
    code = String((JSON.parse(text) as { code?: unknown }).code ?? '');
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  return sendResult(await cancelRequest(code));
}
