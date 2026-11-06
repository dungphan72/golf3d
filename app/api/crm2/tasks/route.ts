import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import { taskActions } from '../../../../modules/crm/server/inputs';
import { listTasks, createTask, completeTask } from '../../../../modules/crm/server/leads';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const p = new URL(req.url).searchParams;
    return listTasks(c, p.get('scope') === 'all' ? 'all' : 'mine', p.get('done') === '1');
  }
  const parsed = taskActions.safeParse(body);
  if (!parsed.success) return fail('Thông tin chưa hợp lệ');
  const a = parsed.data;
  return a.action === 'create' ? createTask(c, a) : completeTask(c, a.id);
});
export const GET = route.GET;
export const POST = route.POST;
