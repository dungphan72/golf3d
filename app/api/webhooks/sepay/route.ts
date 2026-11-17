import { receiveSepay } from '../../../../lib/server/bank-service';
import { sendResult, httpError, clientIp } from '../../../../lib/server/http';
import { noteAttempt, recentAttempts } from '../../../../lib/server/throttle';
export const dynamic = 'force-dynamic';

// Called by SePay (no browser, no cookies). Authenticated only by the API key header.
export async function POST(req: Request) {
  let body: unknown;
  try {
    const text = await req.text();
    console.log('[SePay Webhook Incoming Text]:', text);
    if (text.length > 20_000) return httpError('Yêu cầu quá lớn', 413);
    body = JSON.parse(text);
  } catch (err) {
    console.error('[SePay Webhook JSON Error]:', err);
    return httpError('Dữ liệu không hợp lệ');
  }
  // Guessing the API key is slowed down per address; valid callers are never counted.
  const ip = clientIp(req);
  if (ip !== 'unknown' && (await recentAttempts('sepay_fail', ip, 10 * 60_000)) >= 20)
    return httpError('Quá nhiều yêu cầu, thử lại sau ít phút', 429);
  const result = await receiveSepay(
    req.headers.get('authorization'),
    body,
    req.headers.get('x-api-key'),
  );
  console.log('[SePay Webhook Result]:', result);
  if (result.status === 401 && ip !== 'unknown') await noteAttempt('sepay_fail', ip);
  return sendResult(result);
}
