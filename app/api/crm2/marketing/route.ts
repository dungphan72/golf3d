import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import {
  marketingAction,
  marketingActions,
  marketingReport,
} from '../../../../modules/crm/server/marketing';
export const dynamic = 'force-dynamic';

/** Marketing: campaigns, daily ad spend, seeding numbers, source reassignment and the cost/return report. */
const route = crmRoute({ read: 'crm.manage', write: 'crm.manage' }, async (c, req, body) => {
  if (req.method === 'GET') return marketingReport(c, new URL(req.url).searchParams);
  const parsed = marketingActions.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
  return marketingAction(c, parsed.data);
});
export const GET = route.GET;
export const POST = route.POST;
