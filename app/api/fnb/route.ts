import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { fnbInput } from '../../../lib/fnb';
import { loadFnb, applyFnb } from '../../../lib/server/fnb-service';
import { can } from '../../../lib/auth/permissions';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const { auth, response } = await authorize('view');
  if (response) return response;
  return sendResult(await loadFnb(auth.tenant, new URL(req.url).searchParams.get('booking')));
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('view');
  if (response) return response;
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 16000) return httpError('Yêu cầu quá lớn', 413);
    const parsed = fnbInput.safeParse(JSON.parse(raw));
    if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
    input = parsed.data;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const needed =
    input.action === 'order'
      ? 'fnb.order'
      : input.action === 'transition'
        ? 'fnb.kitchen'
        : 'menu.manage';
  if (!can(auth, needed)) return httpError('Bạn không có quyền thực hiện thao tác này', 403);
  return sendResult(await applyFnb(auth.tenant, auth.userId, input));
}
