import { crmRoute } from '../../../../modules/crm/server/http';
import { overview } from '../../../../modules/crm/server/leads';
import { loadLayout, saveLayout } from '../../../../modules/crm/server/dashboard';
import { fail, reply } from '../../../../modules/crm/server/store';
export const dynamic = 'force-dynamic';

// Reading needs crm.view; saving a layout only changes the caller's own view of the overview, so crm.view is enough too.
const route = crmRoute({ read: 'crm.view', write: 'crm.view' }, async (c, req, body) => {
  if (req.method !== 'GET') {
    if (body.action !== 'layout') return fail('Thao tác không hợp lệ');
    return saveLayout(c, body);
  }
  const layout = await loadLayout(c);
  const out = await overview(c, layout.days);
  return reply({ ...out.body, layout });
});
export const GET = route.GET;
export const POST = route.POST;
