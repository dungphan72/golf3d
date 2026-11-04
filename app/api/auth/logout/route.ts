import { logout } from '../../../../lib/server/auth-service';
import {
  sendResult,
  httpError,
  sameOrigin,
  sessionToken,
  clearedCookie,
} from '../../../auth-session';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const token = await sessionToken();
  if (token) await logout(token);
  const response = sendResult({ status: 200, body: { ok: true } });
  response.headers.append('Set-Cookie', clearedCookie);
  return response;
}
