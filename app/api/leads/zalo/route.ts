import { sendResult, httpError, originOf, requestNow } from '../../../../lib/server/http';
import { fromZaloEvent } from '../../../../lib/leads';
import { zaloSignatureOk } from '../../../../lib/server/providers';
import { publicTenant } from '../../../../lib/server/member-account-service';
import { ingestZaloLead } from '../../../../modules/crm/server/channels';
export const dynamic = 'force-dynamic';

/** Zalo Official Account webhook: a customer wrote to the OA. */
export async function POST(req: Request) {
  const raw = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  if (
    !(await zaloSignatureOk(
      raw,
      req.headers.get('x-zevent-signature'),
      String(body.timestamp ?? ''),
    ))
  )
    return httpError('Chữ ký không hợp lệ', 401);
  const tenant = await publicTenant();
  if (!tenant) return httpError('Chưa có cơ sở', 404);
  const now = requestNow(req);
  // The signature covers the timestamp, so a stale one means a captured request being replayed.
  const sentAt = Number(body.timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > 10 * 60_000)
    return httpError('Yêu cầu đã hết hạn', 401);
  const lead = fromZaloEvent(body, now);
  if (!lead) return sendResult({ status: 200, body: { ok: true, ignored: true } });
  return sendResult({
    status: 200,
    body: { ok: true, ...(await ingestZaloLead(tenant, lead, originOf(req), now)) },
  });
}
