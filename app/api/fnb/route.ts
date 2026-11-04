import { getChatGPTUser } from '../../chatgpt-auth';
import { fnbInput } from '../../../lib/fnb';
import { loadFnb, applyFnb } from '../../../lib/server/fnb-service';
import { sendResult, httpError } from '../../../lib/server/http';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return httpError('Vui lòng đăng nhập', 401);
  return sendResult(await loadFnb(user.userId, new URL(req.url).searchParams.get('booking')));
}
export async function POST(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return httpError('Vui lòng đăng nhập', 401);
  if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
    return httpError('Nguồn yêu cầu không hợp lệ', 403);
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
  return sendResult(await applyFnb(user.userId, input));
}
