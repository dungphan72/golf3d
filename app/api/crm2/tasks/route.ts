import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import { taskActions } from '../../../../modules/crm/server/inputs';
import { listTasks, createTask, completeTask } from '../../../../modules/crm/server/leads';
import {
  claimCareTask,
  finishCareTask,
  listCareTasks,
  skipCareTask,
  snoozeCareTask,
} from '../../../../modules/crm/server/care';
import { reply } from '../../../../modules/crm/server/store';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const p = new URL(req.url).searchParams;
    if (p.get('kind') === 'care')
      return reply({
        tasks: await listCareTasks(
          c,
          p.get('scope') === 'all' ? 'all' : 'mine',
          p.get('done') === '1',
        ),
        now: c.now,
      });
    return listTasks(c, p.get('scope') === 'all' ? 'all' : 'mine', p.get('done') === '1');
  }
  const parsed = taskActions.safeParse(body);
  if (!parsed.success) return fail('Thông tin chưa hợp lệ');
  const a = parsed.data;
  switch (a.action) {
    case 'create':
      return createTask(c, a);
    case 'done':
      return completeTask(c, a.id);
    case 'care-done':
      return finishCareTask(c, a);
    case 'care-skip':
      return skipCareTask(c, a);
    case 'care-snooze':
      return snoozeCareTask(c, a);
    case 'care-claim':
      return claimCareTask(c, a.id);
  }
});
export const GET = route.GET;
export const POST = route.POST;
