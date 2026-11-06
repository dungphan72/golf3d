import { sendResult, httpError, originOf, requestNow } from '../../../../lib/server/http';
import { fromZaloEvent } from '../../../../lib/leads';
import { zaloSignatureOk } from '../../../../lib/server/providers';
import { intake } from '../../../../lib/server/lead-intake';
import { publicTenant } from '../../../../lib/server/member-account-service';
import { getSettings } from '../../../../modules/crm/server/store';
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
  const lead = fromZaloEvent(body, now);
  if (!lead) return sendResult({ status: 200, body: { ok: true, ignored: true } });
  // The club decides in CRM > Cấu hình where Zalo messages go; the old CRM stays the default.
  if ((await getSettings(tenant)).zaloLeads === 'CRM2')
    return sendResult({
      status: 200,
      body: { ok: true, ...(await ingestZaloLead(tenant, lead, originOf(req), now)) },
    });
  const r = await intake(tenant, lead, originOf(req), now);
  return sendResult({ status: 200, body: { ok: true, leadId: r.leadId, duplicate: r.duplicate } });
}
