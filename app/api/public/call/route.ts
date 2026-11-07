import { bellInfo, bellStatus, ringBell } from '../../../../lib/server/call-service';
import { sendResult, httpError } from '../../../../lib/server/http';
import { SLUG_PATTERN } from '../../../../lib/online';
export const dynamic = 'force-dynamic';

const ID = /^[a-z0-9-]{1,40}$/i;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const slug = p.get('slug') ?? '';
  if (!SLUG_PATTERN.test(slug)) return httpError('Không tìm thấy cơ sở', 404);
  const id = p.get('id');
  if (id)
    return ID.test(id) ? sendResult(await bellStatus(slug, id)) : httpError('Mã không hợp lệ');
  const room = p.get('room') ?? '';
  return ID.test(room)
    ? sendResult(await bellInfo(slug, room))
    : httpError('Không tìm thấy line', 404);
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let body: { slug?: unknown; room?: unknown; kind?: unknown };
  try {
    const text = await req.text();
    if (text.length > 500) return httpError('Yêu cầu quá lớn', 413);
    body = JSON.parse(text);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const { slug, room, kind } = body;
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug))
    return httpError('Không tìm thấy cơ sở', 404);
  if (typeof room !== 'string' || !ID.test(room) || typeof kind !== 'string')
    return httpError('Dữ liệu không hợp lệ');
  return sendResult(await ringBell(slug, room, kind));
}
