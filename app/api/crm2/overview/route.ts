import { crmRoute } from '../../../../modules/crm/server/http';
import { overview } from '../../../../modules/crm/server/leads';
import { reply } from '../../../../modules/crm/server/store';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.view', write: 'crm.manage' }, async (c) => overview(c));
export const GET = route.GET;
void reply;
