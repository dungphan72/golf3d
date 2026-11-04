import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { stockInput } from '../../../lib/stock';
import { loadStock, applyStock } from '../../../lib/server/stock-service';
export const dynamic = 'force-dynamic';
export async function GET() {
  const { auth, response } = await authorize('view');
  if (response) return response;
  return sendResult(await loadStock(auth.tenant));
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('stock.manage');
  if (response) return response;
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 4000) return httpError('Yêu cầu quá lớn', 413);
    const parsed = stockInput.safeParse(JSON.parse(raw));
    if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
    input = parsed.data;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  return sendResult(await applyStock(auth.tenant, auth.userId, input));
}
