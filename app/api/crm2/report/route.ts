import { crmRoute } from '../../../../modules/crm/server/http';
import { fail, reply } from '../../../../modules/crm/server/store';
import { leadReport } from '../../../../modules/crm/server/report';
import { getFullFunnelReport } from '../../../../modules/crm/server/funnel-report';

export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.manage', write: 'crm.manage' }, async (c, req) => {
  if (req.method !== 'GET') return fail('Không hỗ trợ', 405);
  const days = Number(new URL(req.url).searchParams.get('days') ?? 30);
  const [baseRep, fullFunnel] = await Promise.all([
    leadReport(c, days),
    getFullFunnelReport(c, days),
  ]);
  const baseBody = baseRep.status === 200 ? baseRep.body : {};
  return reply({
    ...baseBody,
    fullFunnel,
  });
});
export const GET = route.GET;
export const POST = route.POST;
