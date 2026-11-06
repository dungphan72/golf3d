import { sendResult, httpError, originOf, requestNow } from '../../../../lib/server/http';
import { websiteLeadSchema, fromWebsite } from '../../../../lib/leads';
import { intake, tenantForToken } from '../../../../lib/server/lead-intake';
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
  const r = await intake(tenant, fromWebsite(parsed.data, now), originOf(req), now);
  return withCors(
    sendResult({
      status: 200,
      body: { ok: true, leadId: r.leadId, duplicate: r.duplicate, status: r.status },
    }),
  );
}
