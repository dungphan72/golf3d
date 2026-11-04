import { receiveSepay } from '../../../../lib/server/bank-service';
import { sendResult, httpError } from '../../../../lib/server/http';
export const dynamic = 'force-dynamic';

// Called by SePay (no browser, no cookies). Authenticated only by the API key header.
export async function POST(req: Request) {
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 20_000) return httpError('Yêu cầu quá lớn', 413);
    body = JSON.parse(text);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  return sendResult(await receiveSepay(req.headers.get('authorization'), body));
}
