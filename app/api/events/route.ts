import { httpError, sameOrigin, sendResult } from '../../auth-session';
import { clientIp } from '../../../lib/server/http';
import { overLimit } from '../../../lib/server/throttle';
import { signUpForEvent } from '../../../lib/server/content-service';
import { publicTenant } from '../../../lib/server/member-account-service';

export const dynamic = 'force-dynamic';

/** Public: a guest signs up for an event. Same-origin only, limited per address, honeypot field. */
export async function POST(req: Request) {
  // Read the body before any early reply: an unread body upsets the worker runtime.
  const raw = await req.text().catch(() => '');
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  if (raw.length > 2000) return httpError('Yêu cầu quá lớn', 413);
  if (await overLimit('event-signup', clientIp(req), 3_600_000, 10))
    return httpError('Bạn gửi quá nhiều lần. Vui lòng thử lại sau.', 429);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const tenant = await publicTenant();
  if (!tenant) return httpError('Chưa mở đăng ký', 404);
  try {
    return sendResult(await signUpForEvent(tenant, body));
  } catch (e) {
    console.error(e);
    return httpError('Không thể xử lý yêu cầu. Vui lòng thử lại.', 500);
  }
}
