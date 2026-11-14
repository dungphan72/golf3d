import { crmRoute } from '../../../../modules/crm/server/http';
import { crmHome } from '../../../../modules/crm/server/home';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.view', write: 'crm.view' }, async (c) => crmHome(c));
export const GET = route.GET;
