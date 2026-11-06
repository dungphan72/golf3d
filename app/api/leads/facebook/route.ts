import { sendResult, httpError, originOf, requestNow } from '../../../../lib/server/http';
import { fromFacebookFields } from '../../../../lib/leads';
import { safeEqual } from '../../../../lib/server/throttle';
import { facebookSignatureOk, fetchFacebookLead, secret } from '../../../../lib/server/providers';
import { intake } from '../../../../lib/server/lead-intake';
import { publicTenant } from '../../../../lib/server/member-account-service';
import { getSettings } from '../../../../modules/crm/server/store';
import { ingestFacebookLead } from '../../../../modules/crm/server/channels';
export const dynamic = 'force-dynamic';

/** Facebook subscription check: echo the challenge when the verify token matches. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const expected = secret('FB_VERIFY_TOKEN');
  if (
    expected &&
    p.get('hub.mode') === 'subscribe' &&
    safeEqual(p.get('hub.verify_token') ?? '', expected)
  )
    return new Response(p.get('hub.challenge') ?? '', { status: 200 });
  return httpError('Không xác minh được', 403);
}

type Change = { field?: string; value?: Record<string, unknown> };
type Field = { name?: string; values?: unknown[] };

/** Lead Ads webhook. The signature is checked with the app secret; details come from the Graph API. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!(await facebookSignatureOk(raw, req.headers.get('x-hub-signature-256'))))
    return httpError('Chữ ký không hợp lệ', 401);
  const tenant = await publicTenant();
  if (!tenant) return httpError('Chưa có cơ sở', 404);
  let body: { entry?: { changes?: Change[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const now = requestNow(req);
  // The club decides in CRM > Cấu hình where Facebook leads go; the old CRM stays the default.
  const toCrm2 = (await getSettings(tenant)).facebookLeads === 'CRM2';
  let processed = 0;
  for (const entry of body.entry ?? [])
    for (const ch of entry.changes ?? []) {
      if (ch.field !== 'leadgen' || !ch.value) continue;
      const v = ch.value;
      const leadgenId = String(v.leadgen_id ?? '');
      if (!leadgenId) continue;
      let fields = (v.field_data as Field[] | undefined) ?? null;
      let campaign = String(v.campaign_name ?? '');
      let adId = String(v.ad_id ?? '');
      let formId = String(v.form_id ?? '');
      if (!fields) {
        try {
          const detail = await fetchFacebookLead(leadgenId);
          fields = detail?.field_data ?? null;
          campaign = campaign || detail?.campaign_name || '';
          adId = adId || detail?.ad_id || '';
          formId = formId || detail?.form_id || '';
        } catch {
          fields = null;
        }
      }
      const lead = fromFacebookFields(
        fields ?? [],
        { leadgenId, formId, adId, campaign, created: Number(v.created_time) || undefined },
        now,
      );
      // Without the details (no page token) the lead still arrives: staff answer on Facebook.
      if (!fields)
        lead.message = `Lead Facebook ${leadgenId}: chưa lấy được chi tiết biểu mẫu (cần FB_PAGE_TOKEN). Mở Facebook Lead Center để xem.`;
      if (toCrm2) await ingestFacebookLead(tenant, lead, originOf(req), now);
      else await intake(tenant, lead, originOf(req), now);
      processed++;
    }
  return sendResult({ status: 200, body: { ok: true, processed } });
}
