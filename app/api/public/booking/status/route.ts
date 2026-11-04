import { requestStatus, cancelRequest } from '../../../../../lib/server/online-service';
import { sendResult, httpError } from '../../../../../lib/server/http';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return sendResult(await requestStatus(new URL(req.url).searchParams.get('code') ?? ''));
}
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return httpError('Nguồn yêu cầu không hợp lệ', 403);
  let code = '';
  try {
    const text = await req.text();
    if (text.length > 500) return httpError('Yêu cầu quá lớn', 413);
    code = String((JSON.parse(text) as { code?: unknown }).code ?? '');
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  return sendResult(await cancelRequest(code));
}
