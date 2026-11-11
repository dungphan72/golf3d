import { crmRoute } from '../../../../modules/crm/server/http';
import { blockedAct, blockedList } from '../../../../modules/crm/server/blocked';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.manage', write: 'crm.manage' }, async (c, req, body) =>
  req.method === 'GET' ? blockedList(c) : blockedAct(c, body),
);
export const GET = route.GET;
export const POST = route.POST;
