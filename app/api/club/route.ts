import { getChatGPTUser } from '../../chatgpt-auth';
import {
  clubInput,
  loadDashboard,
  runClubAction,
  MAX_BODY,
} from '../../../lib/server/club-service';
import { fail } from '../../../lib/server/common';
export const dynamic = 'force-dynamic';
const send = (r: { status: number; body: Record<string, unknown> }) =>
  Response.json(r.body, { status: r.status });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return send(fail('Vui lòng đăng nhập', 401));
  return Response.json(await loadDashboard(user.userId, user.displayName), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
export async function POST(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return send(fail('Vui lòng đăng nhập', 401));
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return send(fail('Nguồn yêu cầu không hợp lệ', 403));
  let input;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return send(fail('Yêu cầu quá lớn', 413));
    input = clubInput.parse(JSON.parse(raw));
  } catch {
    return send(fail('Dữ liệu không hợp lệ'));
  }
  try {
    return send(await runClubAction(user.userId, input));
  } catch (e) {
    console.error(e);
    return send(fail(e instanceof Error ? e.message : 'Không thể xử lý yêu cầu', 500));
  }
}
