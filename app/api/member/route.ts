import { cookies } from 'next/headers';
import { sendResult, httpError, sameOrigin } from '../../auth-session';
import { turnstilePasses } from '../../../lib/server/turnstile';
import {
  memberActionInput,
  MEMBER_COOKIE,
  MEMBER_SESSION_SECONDS,
} from '../../../lib/member-account';
import {
  registerMember,
  loginMember,
  logoutMember,
  memberFromSession,
  memberOverview,
  updateProfile,
  changeMemberPassword,
  orderPackage,
  cancelOrder,
  bookAsMember,
  cancelBooking,
} from '../../../lib/server/member-account-service';
export const dynamic = 'force-dynamic';

const cookieFor = (token: string, request: Request) => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${MEMBER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MEMBER_SESSION_SECONDS}${secure}`;
};
const cleared = `${MEMBER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

function clientIp(req: Request) {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export async function GET() {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  const user = token ? await memberFromSession(token) : null;
  // Signed out is a normal state of the public page, not an error (keeps the browser console clean).
  if (!user) return sendResult({ status: 200, body: { signedOut: true } });
  try {
    return sendResult(await memberOverview(user));
  } catch (e) {
    console.error('member overview', e);
    return httpError('Chưa tải được thông tin hội viên', 503);
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 3000) return httpError('Yêu cầu quá lớn', 413);
    const parsed = memberActionInput.safeParse(JSON.parse(raw));
    if (!parsed.success) return httpError('Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.');
    input = parsed.data;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;

  if (input.action === 'register' || input.action === 'login') {
    if (input.action === 'register' && !(await turnstilePasses(input.captcha, clientIp(req))))
      return httpError('Chưa xác minh được bạn là người thật. Vui lòng thử lại.', 403);
    const outcome =
      input.action === 'register'
        ? await registerMember(input, clientIp(req))
        : await loginMember(input.phone, input.password, clientIp(req));
    const response = sendResult(outcome.result);
    if (outcome.token) response.headers.append('Set-Cookie', cookieFor(outcome.token, req));
    return response;
  }
  if (input.action === 'logout') {
    if (token) await logoutMember(token);
    const response = sendResult({ status: 200, body: { ok: true } });
    response.headers.append('Set-Cookie', cleared);
    return response;
  }
  const user = token ? await memberFromSession(token) : null;
  if (!user) return httpError('Vui lòng đăng nhập', 401);
  try {
    if (input.action === 'profile')
      return sendResult(await updateProfile(user, input.name, input.email));
    if (input.action === 'order') return sendResult(await orderPackage(user, input.typeId));
    if (input.action === 'order-cancel') return sendResult(await cancelOrder(user, input.id));
    if (input.action === 'book-cancel') return sendResult(await cancelBooking(user, input.id));
    if (input.action === 'book') return sendResult(await bookAsMember(user, input, clientIp(req)));
    return sendResult(await changeMemberPassword(user, input.current, input.next));
  } catch (e) {
    console.error('member action', e);
    return httpError('Chưa thực hiện được', 500);
  }
}
