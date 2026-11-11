import { crmRoute } from '../../../../modules/crm/server/http';
import { changeViews, listViews } from '../../../../modules/crm/server/views';
export const dynamic = 'force-dynamic';

// Saved filters belong to the caller alone, so crm.view is enough to read and change them.
const route = crmRoute({ read: 'crm.view', write: 'crm.view' }, async (c, req, body) =>
  req.method === 'GET' ? listViews(c) : changeViews(c, body),
);
export const GET = route.GET;
export const POST = route.POST;
