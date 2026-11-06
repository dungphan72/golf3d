import { overLimit } from '../../../../lib/server/throttle';
import { sendResult, httpError, originOf, requestNow, clientIp } from '../../../../lib/server/http';
import { adsLeadSchema, fromAds } from '../../../../lib/leads';
import { intake, tenantForToken } from '../../../../lib/server/lead-intake';
import { getSettings } from '../../../../modules/crm/server/store';
import { ingestAdsLead } from '../../../../modules/crm/server/channels';
export const dynamic = 'force-dynamic';

/** Lead forms of ad platforms and automation tools. Needs the "Quảng cáo" token from the admin. */
export async function POST(req: Request) {
  // Read the body first: replying without reading it can upset the worker runtime.
  const raw = await req.text().catch(() => '');
  const tenant = await tenantForToken('ads', req.headers.get('x-lead-token'));
  if (!tenant) return httpError('Mã webhook không hợp lệ hoặc chưa được tạo', 401);
  if (await overLimit('lead_ads', clientIp(req), 10 * 60_000, 300))
    return httpError('Quá nhiều yêu cầu, thử lại sau ít phút', 429);
  let body: unknown;
  try {
    if (raw.length > 6000) return httpError('Yêu cầu quá lớn', 413);
    body = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const parsed = adsLeadSchema.safeParse(body);
  if (!parsed.success) return httpError('Thông tin chưa hợp lệ');
  const now = requestNow(req);
  const lead = fromAds(parsed.data, now);
  // The club decides in CRM > Cấu hình where ad leads go; the old CRM stays the default.
  if ((await getSettings(tenant)).adsLeads === 'CRM2') {
    const r = await ingestAdsLead(tenant, lead.extKey, parsed.data, originOf(req), now);
    return sendResult({ status: 200, body: { ok: true, ...r } });
  }
  const r = await intake(tenant, lead, originOf(req), now);
  return sendResult({
    status: 200,
    body: { ok: true, leadId: r.leadId, duplicate: r.duplicate, status: r.status },
  });
}
