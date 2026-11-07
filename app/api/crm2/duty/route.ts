import { crmRoute } from '../../../../modules/crm/server/http';
import { fail, getSettings, reply, saveSettings } from '../../../../modules/crm/server/store';
export const dynamic = 'force-dynamic';

/** Whether the signed-in person is receiving new leads; they switch it themselves when their shift starts or ends. */
const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  const settings = await getSettings(c.tenant);
  const paused = settings.distribution.paused;
  if (req.method === 'GET') return reply({ onDuty: !paused.includes(c.userId) });
  if (typeof body.onDuty !== 'boolean') return fail('Thiếu trạng thái trực');
  const next = body.onDuty
    ? paused.filter((id) => id !== c.userId)
    : [...new Set([...paused, c.userId])];
  await saveSettings(
    c.tenant,
    { ...settings, distribution: { ...settings.distribution, paused: next } },
    c.now,
  );
  return reply({ onDuty: body.onDuty });
});
export const GET = route.GET;
export const POST = route.POST;
