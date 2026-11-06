import { authorize, sendResult, httpError, sameOrigin } from '../../../auth-session';
import { originOf, requestNow } from '../../../../lib/server/http';
import { leadInput } from '../../../../lib/leads';
import {
  loadLeads,
  applyLeadAction,
  loadLeadEvents,
  loadLeadReport,
} from '../../../../lib/server/lead-service';
import { can } from '../../../../lib/auth/permissions';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { auth, response } = await authorize('crm.view');
  if (response) return response;
  const params = new URL(req.url).searchParams;
  const customer = params.get('customer');
  const report = Number(params.get('report'));
  if (report > 0) {
    if (!can(auth.role, 'crm.manage')) return httpError('Không đủ quyền', 403);
    return sendResult(await loadLeadReport(auth.tenant, report, requestNow(req)));
  }
  if (customer)
    return sendResult({ status: 200, body: await loadLeadEvents(auth.tenant, customer) });
  return sendResult(await loadLeads(auth.tenant, auth.userId, originOf(req), requestNow(req)));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('crm.work');
  if (response) return response;
  let json: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 6000) return httpError('Yêu cầu quá lớn', 413);
    json = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const parsed = leadInput.safeParse(json);
  if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
  return sendResult(
    await applyLeadAction(
      auth.tenant,
      { id: auth.userId, role: auth.role },
      parsed.data,
      originOf(req),
      requestNow(req),
    ),
  );
}
