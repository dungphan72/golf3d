import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { crmInput } from '../../../lib/crm';
import { loadTasks, loadCustomers, loadCustomer, applyCrm } from '../../../lib/server/crm-service';
import { can } from '../../../lib/auth/permissions';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { auth, response } = await authorize('crm.view');
  if (response) return response;
  const params = new URL(req.url).searchParams;
  const view = params.get('view') ?? 'tasks';
  if (view === 'customers')
    return sendResult(await loadCustomers(auth.tenant, params.get('q') ?? ''));
  if (view === 'customer') {
    const id = params.get('id') ?? '';
    if (!id || id.length > 100) return httpError('Thiếu mã khách');
    return sendResult(await loadCustomer(auth.tenant, id));
  }
  return sendResult(await loadTasks(auth.tenant, auth.userId));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('view');
  if (response) return response;
  let json: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 12000) return httpError('Yêu cầu quá lớn', 413);
    json = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const parsed = crmInput.safeParse(json);
  if (!parsed.success) return httpError(parsed.error.issues.map((i) => i.message).join(' · '));
  const needed = parsed.data.action === 'settings-save' ? 'crm.manage' : 'crm.work';
  if (!can(auth.role, needed)) return httpError('Bạn không có quyền thực hiện thao tác này', 403);
  return sendResult(await applyCrm(auth.tenant, auth.userId, parsed.data));
}
