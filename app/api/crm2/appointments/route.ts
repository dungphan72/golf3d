import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import { apptActions } from '../../../../modules/crm/server/inputs';
import {
  listAppointments,
  createAppointment,
  setAppointmentStatus,
} from '../../../../modules/crm/server/sales';
export const dynamic = 'force-dynamic';

const DAY = 86_400_000;
const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const p = new URL(req.url).searchParams;
    const from = Number(p.get('from')) || c.now - DAY;
    const to = Number(p.get('to')) || from + 30 * DAY;
    return listAppointments(c, from, Math.min(to, from + 120 * DAY));
  }
  const parsed = apptActions.safeParse(body);
  if (!parsed.success) return fail('Thông tin chưa hợp lệ');
  const a = parsed.data;
  return a.action === 'create' ? createAppointment(c, a) : setAppointmentStatus(c, a.id, a.status);
});
export const GET = route.GET;
export const POST = route.POST;
