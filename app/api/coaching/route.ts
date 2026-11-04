import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { loadCoaching, applyCoaching, coachingInput } from '../../../lib/server/coaching-service';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { auth, response } = await authorize('coach.view');
  if (response) return response;
  const params = new URL(req.url).searchParams;
  const from = Number(params.get('from') ?? Date.now() - 86_400_000);
  const to = Number(params.get('to') ?? from + 14 * 86_400_000);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from)
    return httpError('Khoảng thời gian không hợp lệ');
  return sendResult(await loadCoaching(auth, from, to, params.get('coach') ?? ''));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('coach.view');
  if (response) return response;
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 3000) return httpError('Yêu cầu quá lớn', 413);
    const parsed = coachingInput.safeParse(JSON.parse(raw));
    if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
    input = parsed.data;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  return sendResult(await applyCoaching(auth, input));
}
