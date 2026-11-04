import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { listRequests, applyRequest, staffRequestInput } from '../../../lib/server/online-service';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { auth, response } = await authorize('booking.create');
  if (response) return response;
  return sendResult(await listRequests(auth.tenant));
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('booking.create');
  if (response) return response;
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return httpError('Yêu cầu quá lớn', 413);
    const parsed = staffRequestInput.safeParse(JSON.parse(raw));
    if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
    input = parsed.data;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  return sendResult(await applyRequest(auth.tenant, auth.userId, input));
}
