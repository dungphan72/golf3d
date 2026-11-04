import { z } from 'zod';
import { login } from '../../../../lib/server/auth-service';
import { sendResult, httpError, sameOrigin, sessionCookie } from '../../../auth-session';
export const dynamic = 'force-dynamic';

const input = z.object({ email: z.string().max(200), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return httpError('Yêu cầu quá lớn', 413);
    body = input.parse(JSON.parse(raw));
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const outcome = await login(body.email, body.password);
  if (!outcome.ok) return sendResult(outcome.result);
  const response = sendResult({
    status: 200,
    body: { ok: true, mustChange: outcome.user.mustChange },
  });
  response.headers.append('Set-Cookie', sessionCookie(outcome.token, req));
  return response;
}
