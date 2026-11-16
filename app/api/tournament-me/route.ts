import { cookies } from 'next/headers';
import { z } from 'zod';
import { sendResult, httpError, sameOrigin } from '../../auth-session';
import { MEMBER_COOKIE } from '../../../lib/member-account';
import { memberFromSession } from '../../../lib/server/member-account-service';
import { memberSubmitScore, memberTournament } from '../../../lib/server/tournament-score-service';
export const dynamic = 'force-dynamic';

const input = z.object({
  postId: z.string().min(1).max(80),
  roundId: z.string().min(1).max(80),
  holes: z.array(z.number().int().nullable()).max(18),
});

async function user() {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  return token ? await memberFromSession(token) : null;
}

export async function GET(req: Request) {
  const u = await user();
  // Signed out is a normal state of the public page.
  if (!u) return sendResult({ status: 200, body: { signedOut: true } });
  return sendResult(await memberTournament(u, new URL(req.url).searchParams.get('post') ?? ''));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const u = await user();
  if (!u) return httpError('Vui lòng đăng nhập hội viên', 401);
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return httpError('Yêu cầu quá lớn', 413);
    body = input.parse(JSON.parse(raw));
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  return sendResult(await memberSubmitScore(u, body));
}
