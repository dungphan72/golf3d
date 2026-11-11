import { publicInfo, submitRequest } from '../../../../lib/server/online-service';
import { sendResult, httpError, clientIp, originOf } from '../../../../lib/server/http';
import { turnstilePasses } from '../../../../lib/server/turnstile';
import { SLUG_PATTERN } from '../../../../lib/online';
import { sameOrigin } from '../../../auth-session';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  if (!SLUG_PATTERN.test(slug)) return httpError('Không tìm thấy cơ sở', 404);
  return sendResult(await publicInfo(slug));
}

export async function POST(req: Request) {
  // The shared check understands reverse proxies (nginx in front of the Node server): comparing with the URL the
  // server itself sees would reject every browser request on the VPS.
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 3000) return httpError('Yêu cầu quá lớn', 413);
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const { slug, captcha, ...rest } = body;
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug))
    return httpError('Không tìm thấy cơ sở', 404);
  const ip = clientIp(req);
  if (!(await turnstilePasses(captcha, ip)))
    return httpError('Chưa xác minh được bạn là người thật. Vui lòng thử lại.', 403);
  return sendResult(await submitRequest(slug, rest, ip, originOf(req)));
}
