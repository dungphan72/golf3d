import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import { viewLog } from '../../../../modules/crm/server/view-log';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.manage', write: 'crm.manage' }, async (c, req) => {
  if (req.method !== 'GET') return fail('Không hỗ trợ', 405);
  return viewLog(c, new URL(req.url).searchParams);
});
export const GET = route.GET;
export const POST = route.POST;
