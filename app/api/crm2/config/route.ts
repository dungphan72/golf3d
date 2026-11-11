import { crmRoute } from '../../../../modules/crm/server/http';
import {
  fail,
  reply,
  getSettings,
  saveSettings,
  getRuntime,
  staffList,
} from '../../../../modules/crm/server/store';
import {
  createStaff,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  type AuthUser,
} from '../../../../lib/server/auth-service';
import type { ServiceResult } from '../../../../lib/server/common';
import type { Role } from '../../../../lib/auth/permissions';
import { hashPassword, passwordProblem, STAFF_MIN_LENGTH } from '../../../../lib/auth/password';
import { db } from '../../../../lib/server/common';
import { audit } from '../../../../lib/server/common';
export const dynamic = 'force-dynamic';

/** Settings, staff list and background configuration. */
/** Turns a failed ServiceResult into the CRM error reply, or null when it succeeded. */
function failed(res: ServiceResult) {
  if (res.status < 400) return null;
  return fail(String(res.body.error ?? 'Không thể xử lý yêu cầu'), res.status);
}

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

  const actor: AuthUser = {
    userId: c.userId,
    tenant: c.tenant,
    role: c.role as Role,
    name: '',
    email: '',
    mustChange: false,
    via: 'password',
  };

  // 1. Action: Create sales staff member
  if (body.action === 'create_sale') {
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const role = String(body.role ?? 'sale');
    const pwd = body.password ? String(body.password).trim() : '';

    if (pwd) {
      const problem = passwordProblem(pwd, email, STAFF_MIN_LENGTH);
      if (problem) return fail(problem);
    }
    const res = await createStaff(actor, { email, name, role });
    const bad = failed(res);
    if (bad) return bad;
    const userId = String(res.body.id);
    let tempPass = res.body.temporaryPassword as string | undefined;

    if (pwd) {
      await db()
        .prepare('UPDATE users SET password_hash=?,must_change=0 WHERE id=?')
        .bind(await hashPassword(pwd), userId)
        .run();
      tempPass = pwd;
    }

    const notifyEmail = String(body.notifyEmail ?? '').trim().slice(0, 200);
    await db()
      .prepare(
        'INSERT INTO crm2_staff(tenant,user_id,team,is_leader,extension,zalo_id,notify_email,updated) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(tenant,user_id) DO UPDATE SET team=excluded.team,is_leader=excluded.is_leader,extension=excluded.extension,zalo_id=excluded.zalo_id,notify_email=excluded.notify_email,updated=excluded.updated',
      )
      .bind(
        c.tenant,
        userId,
        String(body.team ?? '').slice(0, 100),
        body.isLeader ? 1 : 0,
        String(body.extension ?? '').slice(0, 20),
        String(body.zaloId ?? '').trim().slice(0, 100),
        notifyEmail,
        c.now,
      )
      .run();

    const receiveLeads = body.receiveLeads !== false;
    const curSettings = await getSettings(c.tenant);
    const paused = (curSettings.distribution as { paused: string[] }).paused || [];
    let nextPaused = paused;
    if (!receiveLeads && !paused.includes(userId)) {
      nextPaused = [...paused, userId];
    } else if (receiveLeads && paused.includes(userId)) {
      nextPaused = paused.filter((id) => id !== userId);
    }
    if (nextPaused !== paused) {
      await saveSettings(
        c.tenant,
        {
          ...curSettings,
          distribution: { ...curSettings.distribution, paused: nextPaused },
        },
        c.now,
      );
    }

    await audit(c.tenant, 'crm.staff.create', `Thêm nhân sự sales ${name} (${email}) - ${role}`);
    return reply({ ok: true, id: userId, temporaryPassword: tempPass });
  }

  // 2. Action: Update sales staff member & role/permissions
  if (body.action === 'update_sale') {
    const userId = String(body.userId ?? '');
    if (!userId) return fail('Thiếu mã nhân viên');

    const updatePayload: { userId: string; name?: string; role?: string; active?: boolean } = { userId };
    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.role !== undefined) updatePayload.role = String(body.role);
    if (body.active !== undefined) updatePayload.active = Boolean(body.active);

    const res = await updateStaff(actor, updatePayload);
    const bad = failed(res);
    if (bad) return bad;

    const notifyEmail = String(body.notifyEmail ?? '').trim().slice(0, 200);
    if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
      return fail('Email thông báo không hợp lệ');
    }

    await db()
      .prepare(
        'INSERT INTO crm2_staff(tenant,user_id,team,is_leader,extension,zalo_id,notify_email,updated) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(tenant,user_id) DO UPDATE SET team=excluded.team,is_leader=excluded.is_leader,extension=excluded.extension,zalo_id=excluded.zalo_id,notify_email=excluded.notify_email,updated=excluded.updated',
      )
      .bind(
        c.tenant,
        userId,
        String(body.team ?? '').slice(0, 100),
        body.isLeader ? 1 : 0,
        String(body.extension ?? '').slice(0, 20),
        String(body.zaloId ?? '').trim().slice(0, 100),
        notifyEmail,
        c.now,
      )
      .run();

    if (body.receiveLeads !== undefined) {
      const curSettings = await getSettings(c.tenant);
      const paused = (curSettings.distribution as { paused: string[] }).paused || [];
      let nextPaused = paused;
      if (!body.receiveLeads && !paused.includes(userId)) {
        nextPaused = [...paused, userId];
      } else if (body.receiveLeads && paused.includes(userId)) {
        nextPaused = paused.filter((id) => id !== userId);
      }
      if (nextPaused !== paused) {
        await saveSettings(
          c.tenant,
          {
            ...curSettings,
            distribution: { ...curSettings.distribution, paused: nextPaused },
          },
          c.now,
        );
      }
    }

    await audit(c.tenant, 'crm.staff.update', `Cập nhật nhân sự sales ${userId}`);
    return reply({ ok: true });
  }

  // 3. Action: Delete sales staff member
  if (body.action === 'delete_sale') {
    const userId = String(body.userId ?? '');
    if (!userId) return fail('Thiếu mã nhân viên');

    const res = await deleteStaff(actor, userId);
    const bad = failed(res);
    if (bad) return bad;

    const curSettings = await getSettings(c.tenant);
    const paused = (curSettings.distribution as { paused: string[] }).paused || [];
    if (paused.includes(userId)) {
      await saveSettings(
        c.tenant,
        {
          ...curSettings,
          distribution: { ...curSettings.distribution, paused: paused.filter((id) => id !== userId) },
        },
        c.now,
      );
    }

    await audit(c.tenant, 'crm.staff.delete', `Xóa nhân sự sales ${userId}`);
    return reply({ ok: true });
  }

  // 4. Action: Reset password
  if (body.action === 'reset_password') {
    const userId = String(body.userId ?? '');
    if (!userId) return fail('Thiếu mã nhân viên');

    const res = await resetStaffPassword(actor, userId);
    const bad = failed(res);
    if (bad) return bad;
    await audit(c.tenant, 'crm.staff.reset_password', `Cấp lại mật khẩu nhân sự ${userId}`);
    return reply({ temporaryPassword: res.body.temporaryPassword });
  }

  // Legacy quick inline staff update
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
