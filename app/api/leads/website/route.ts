import { overLimit } from '../../../../lib/server/throttle';
import { sendResult, httpError, originOf, requestNow, clientIp } from '../../../../lib/server/http';
import { websiteLeadSchema, fromWebsite } from '../../../../lib/leads';
import { intake } from '../../../../lib/server/lead-intake';
import { tenantForToken } from '../../../../modules/crm/server/tokens';
import { getSettings } from '../../../../modules/crm/server/store';
import { ingestWebsiteLead } from '../../../../modules/crm/server/leads';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-lead-token',
};
const withCors = (res: Response) => {
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
};
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });

/** Form on another site (for example 3dgolf.vn) posting a lead. Needs the "Website" token from the admin. */
export async function POST(req: Request) {
  // Read the body first: replying without reading it can upset the worker runtime.
  const raw = await req.text().catch(() => '');
  const tenant = await tenantForToken('website', req.headers.get('x-lead-token'));
  if (!tenant) return withCors(httpError('Mã webhook không hợp lệ hoặc chưa được tạo', 401));
  if (await overLimit('lead_website', clientIp(req), 10 * 60_000, 20))
    return withCors(httpError('Quá nhiều yêu cầu, thử lại sau ít phút', 429));
  let body: unknown;
  try {
    if (raw.length > 6000) return withCors(httpError('Yêu cầu quá lớn', 413));
    body = JSON.parse(raw);
  } catch {
    return withCors(httpError('Dữ liệu không hợp lệ'));
  }
  const parsed = websiteLeadSchema.safeParse(body);
  if (!parsed.success) return withCors(httpError('Thông tin chưa hợp lệ'));
  const now = requestNow(req);
  // The club decides in CRM > Cấu hình where website leads go; the old CRM stays the default.
  if ((await getSettings(tenant)).websiteLeads === 'CRM2')
    return withCors(
      sendResult({
        status: 200,
        body: { ok: true, ...(await ingestWebsiteLead(tenant, parsed.data, originOf(req), now)) },
      }),
    );
  const r = await intake(tenant, fromWebsite(parsed.data, now), originOf(req), now);
  return withCors(
    sendResult({
      status: 200,
      body: { ok: true, leadId: r.leadId, duplicate: r.duplicate, status: r.status },
    }),
  );
}
