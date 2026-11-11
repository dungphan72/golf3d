import { crmRoute } from '../../../../modules/crm/server/http';
import { responseReport } from '../../../../modules/crm/server/response';
import { fail } from '../../../../modules/crm/server/store';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.manage', write: 'crm.manage' }, async (c, req) => {
  if (req.method !== 'GET') return fail('Không hỗ trợ', 405);
  return responseReport(c, Number(new URL(req.url).searchParams.get('days') ?? 30));
});
export const GET = route.GET;
export const POST = route.POST;
