import { crmRoute } from '../../../../modules/crm/server/http';
import {
  fail,
  reply,
  getSettings,
  saveSettings,
  getRuntime,
  staffList,
} from '../../../../modules/crm/server/store';
import { db } from '../../../../lib/server/common';
import { audit } from '../../../../lib/server/common';
export const dynamic = 'force-dynamic';

/** Settings, staff list and the last background run. Saving needs the manager permission. */
const route = crmRoute({ read: 'crm.view', write: 'crm.manage' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const [settings, staff, cron, extra] = await Promise.all([
      getSettings(c.tenant),
      staffList(c.tenant),
      getRuntime(c.tenant, 'cron'),
      db()
        .prepare(
          'SELECT user_id AS userId,team,is_leader AS isLeader,extension,zalo_id AS zaloId,notify_email AS notifyEmail FROM crm2_staff WHERE tenant=?',
        )
        .bind(c.tenant)
        .all(),
    ]);
    return reply({ settings, staff, staffExtra: extra.results, cron, me: c.userId, role: c.role });
  }
  if (body.staff && typeof body.staff === 'object') {
    const s = body.staff as Record<string, unknown>;
    const userId = String(s.userId ?? '');
    if (!userId) return fail('Thiếu nhân viên');
    const notifyEmail = String(s.notifyEmail ?? '')
      .trim()
      .slice(0, 200);
    if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail))
      return fail('Email không hợp lệ');
    await db()
      .prepare(
        'INSERT INTO crm2_staff(tenant,user_id,team,is_leader,extension,zalo_id,notify_email,updated) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(tenant,user_id) DO UPDATE SET team=excluded.team,is_leader=excluded.is_leader,extension=excluded.extension,zalo_id=excluded.zalo_id,notify_email=excluded.notify_email,updated=excluded.updated',
      )
      .bind(
        c.tenant,
        userId,
        String(s.team ?? '').slice(0, 100),
        s.isLeader ? 1 : 0,
        String(s.extension ?? '').slice(0, 20),
        String(s.zaloId ?? '')
          .trim()
          .slice(0, 100),
        notifyEmail,
        c.now,
      )
      .run();
    return reply({ ok: true });
  }
  if (!body.settings) return fail('Thiếu cấu hình');
  const saved = await saveSettings(c.tenant, body.settings, c.now);
  await audit(c.tenant, 'crm.settings', 'Cập nhật cấu hình CRM');
  return reply({ ok: true, settings: saved });
});
export const GET = route.GET;
export const POST = route.POST;
