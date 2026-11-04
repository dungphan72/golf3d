import { publicInfo, submitRequest } from '../../../../lib/server/online-service';
import { sendResult, httpError } from '../../../../lib/server/http';
import { SLUG_PATTERN } from '../../../../lib/online';
export const dynamic = 'force-dynamic';

function clientIp(req: Request) {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  if (!SLUG_PATTERN.test(slug)) return httpError('Không tìm thấy cơ sở', 404);
  return sendResult(await publicInfo(slug));
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 3000) return httpError('Yêu cầu quá lớn', 413);
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const { slug, ...rest } = body;
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug))
    return httpError('Không tìm thấy cơ sở', 404);
  return sendResult(await submitRequest(slug, rest, clientIp(req)));
}
