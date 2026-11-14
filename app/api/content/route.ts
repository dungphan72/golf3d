import { authorize, httpError, sameOrigin, sendResult } from '../../auth-session';
import { deletePost, listAllPosts, listSignups, savePost, signupCounts } from '../../../lib/server/content-service';

export const dynamic = 'force-dynamic';

/** Staff side of the news and events module: list, save and delete. The public site reads published posts directly. */
export async function GET() {
  const { auth, response } = await authorize('settings.manage');
  if (response) return response;
  const [posts, signups] = await Promise.all([listAllPosts(auth.tenant), signupCounts(auth.tenant)]);
  return Response.json({ posts, signups }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  // Read the body before any early reply: an unread body upsets the worker runtime.
  const raw = await req.text().catch(() => '');
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('settings.manage');
  if (response) return response;
  if (raw.length > 60_000) return httpError('Nội dung quá lớn', 413);
  let body: { action?: string; id?: string; post?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  try {
    if (body.action === 'save') return sendResult(await savePost(auth.tenant, body.post, auth.name));
    if (body.action === 'delete' && typeof body.id === 'string')
      return sendResult(await deletePost(auth.tenant, body.id));
    if (body.action === 'signups' && typeof body.id === 'string')
      return Response.json({ signups: await listSignups(auth.tenant, body.id) }, { headers: { 'Cache-Control': 'no-store' } });
    return httpError('Thao tác không được hỗ trợ');
  } catch (e) {
    console.error(e);
    return httpError('Không thể xử lý yêu cầu. Vui lòng thử lại.', 500);
  }
}
