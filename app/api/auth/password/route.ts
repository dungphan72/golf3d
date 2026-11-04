import { z } from 'zod';
import { changePassword, bootstrapOwner } from '../../../../lib/server/auth-service';
import { getAuth, sendResult, httpError, sameOrigin, sessionToken } from '../../../auth-session';
export const dynamic = 'force-dynamic';

// `change`: signed-in password user changes their own password.
// `setup`: platform-identified owner creates the first password login for the cabinet.
const input = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('change'),
    current: z.string().max(200),
    next: z.string().max(200),
  }),
  z.object({
    action: z.literal('setup'),
    email: z.string().max(200),
    name: z.string().max(100),
    password: z.string().max(200),
  }),
]);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const auth = await getAuth();
  if (!auth) return httpError('Vui lòng đăng nhập', 401);
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return httpError('Yêu cầu quá lớn', 413);
    body = input.parse(JSON.parse(raw));
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  if (body.action === 'setup') {
    if (auth.via !== 'sites')
      return httpError('Chỉ chủ cơ sở đăng nhập qua nền tảng mới thiết lập', 403);
    return sendResult(
      await bootstrapOwner(auth.tenant, body.email, body.name || auth.name, body.password),
    );
  }
  return sendResult(await changePassword(auth, body.current, body.next, await sessionToken()));
}
