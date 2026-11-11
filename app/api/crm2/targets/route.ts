import { crmRoute } from '../../../../modules/crm/server/http';
import { setTargets, targetsReport } from '../../../../modules/crm/server/targets';
import { fail } from '../../../../modules/crm/server/store';
export const dynamic = 'force-dynamic';

// Everyone with CRM access reads their progress; only managers may change targets (checked in the service).
const route = crmRoute({ read: 'crm.view', write: 'crm.view' }, async (c, req, body) => {
  if (req.method === 'GET') return targetsReport(c, new URL(req.url).searchParams.get('month'));
  if (body.action !== 'set') return fail('Thao tác không hợp lệ');
  return setTargets(c, body.month, { club: body.club, staff: body.staff });
});
export const GET = route.GET;
export const POST = route.POST;
