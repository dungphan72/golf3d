import { getChatGPTUser } from '../../chatgpt-auth';
import { financeInput } from '../../../lib/finance';
import { loadFinance, applyFinance } from '../../../lib/server/finance-service';
import { sendResult, httpError } from '../../../lib/server/http';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return httpError('Vui lòng đăng nhập', 401);
  return sendResult(await loadFinance(user.userId, new URL(req.url).searchParams.get('shift')));
}
export async function POST(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return httpError('Vui lòng đăng nhập', 401);
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let json: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 5000) return httpError('Yêu cầu quá lớn', 413);
    json = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const parsed = financeInput.safeParse(json);
  if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
  return sendResult(await applyFinance(user.userId, parsed.data));
}
