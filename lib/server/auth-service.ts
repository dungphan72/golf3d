import { db, ok, fail, type ServiceResult } from './common';
import {
  hashPassword,
  verifyPassword,
  passwordProblem,
  normalizeEmail,
  validEmail,
  newToken,
  tokenId,
  temporaryPassword,
} from '../auth/password';
import { isRole, canAssignRole, type Role } from '../auth/permissions';
import { noteAttempt, recentAttempts } from './throttle';

export type AuthUser = {
  userId: string;
  tenant: string;
  role: Role;
  name: string;
  email: string;
  mustChange: boolean;
  via: 'password' | 'sites';
};

export const SESSION_COOKIE = 'g3d_session';
export const SESSION_SECONDS = 14 * 24 * 3600;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
// Verifying against a fixed hash keeps response time similar for unknown emails.
const DUMMY_HASH =
  'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const BAD_LOGIN = 'Email hoặc mật khẩu không đúng';

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  must_change: number;
  failed_count: number;
  locked_until: number;
  active: number;
};

export type LoginOutcome =
  { ok: true; token: string; user: AuthUser } | { ok: false; result: ServiceResult };

const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_FAILS_PER_IP = 20; // wrong passwords from one address in 15 minutes, across all accounts

export async function login(
  emailInput: string,
  password: string,
  ip = 'unknown',
): Promise<LoginOutcome> {
  if (
    ip !== 'unknown' &&
    (await recentAttempts('staff_login_fail', ip, LOGIN_WINDOW_MS)) >= LOGIN_FAILS_PER_IP
  )
    return {
      ok: false,
      result: fail('Đăng nhập sai quá nhiều lần từ thiết bị này. Thử lại sau ít phút.', 429),
    };
  const email = normalizeEmail(emailInput);
  const row = validEmail(email)
    ? await db().prepare('SELECT * FROM users WHERE email=?').bind(email).first<UserRow>()
    : null;
  const now = Date.now();
  if (!row || !row.active) {
    await verifyPassword(password, DUMMY_HASH);
    if (ip !== 'unknown') await noteAttempt('staff_login_fail', ip);
    return { ok: false, result: fail(BAD_LOGIN, 401) };
  }
  if (row.locked_until > now)
    return {
      ok: false,
      result: fail('Tài khoản tạm khóa do nhập sai nhiều lần. Thử lại sau ít phút.', 429),
    };
  if (!(await verifyPassword(password, row.password_hash))) {
    if (ip !== 'unknown') await noteAttempt('staff_login_fail', ip);
    const failures = row.failed_count + 1;
    await db()
      .prepare('UPDATE users SET failed_count=?,locked_until=? WHERE id=?')
      .bind(
        failures >= MAX_FAILURES ? 0 : failures,
        failures >= MAX_FAILURES ? now + LOCK_MS : 0,
        row.id,
      )
      .run();
    return { ok: false, result: fail(BAD_LOGIN, 401) };
  }
  const membership = await db()
    .prepare('SELECT tenant,role FROM memberships WHERE user_id=? ORDER BY created LIMIT 1')
    .bind(row.id)
    .first<{ tenant: string; role: string }>();
  if (!membership || !isRole(membership.role))
    return { ok: false, result: fail('Tài khoản chưa được cấp quyền vào cơ sở nào', 403) };
  await db()
    .prepare('UPDATE users SET failed_count=0,locked_until=0 WHERE id=?')
    .bind(row.id)
    .run();
  const token = newToken();
  await db()
    .prepare('INSERT INTO sessions(id,user_id,tenant,expires,created) VALUES (?,?,?,?,?)')
    .bind(await tokenId(token), row.id, membership.tenant, now + SESSION_SECONDS * 1000, now)
    .run();
  // Opportunistic cleanup of expired sessions.
  await db().prepare('DELETE FROM sessions WHERE expires<?').bind(now).run();
  return {
    ok: true,
    token,
    user: {
      userId: row.id,
      tenant: membership.tenant,
      role: membership.role,
      name: row.name,
      email: row.email,
      mustChange: !!row.must_change,
      via: 'password',
    },
  };
}

export async function userFromSession(token: string): Promise<AuthUser | null> {
  const row = await db()
    .prepare(
      `SELECT u.id,u.email,u.name,u.must_change,u.active,s.tenant,m.role
       FROM sessions s JOIN users u ON u.id=s.user_id
       JOIN memberships m ON m.user_id=s.user_id AND m.tenant=s.tenant
       WHERE s.id=? AND s.expires>?`,
    )
    .bind(await tokenId(token), Date.now())
    .first<{
      id: string;
      email: string;
      name: string;
      must_change: number;
      active: number;
      tenant: string;
      role: string;
    }>();
  if (!row || !row.active || !isRole(row.role)) return null;
  return {
    userId: row.id,
    tenant: row.tenant,
    role: row.role,
    name: row.name,
    email: row.email,
    mustChange: !!row.must_change,
    via: 'password',
  };
}

export async function logout(token: string) {
  await db()
    .prepare('DELETE FROM sessions WHERE id=?')
    .bind(await tokenId(token))
    .run();
}

export async function changePassword(
  user: AuthUser,
  current: string,
  next: string,
  keepToken: string | null,
): Promise<ServiceResult> {
  if (user.via !== 'password') return fail('Tài khoản này chưa dùng mật khẩu', 400);
  const row = await db()
    .prepare('SELECT password_hash FROM users WHERE id=?')
    .bind(user.userId)
    .first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(current, row.password_hash)))
    return fail('Mật khẩu hiện tại không đúng', 403);
  const problem = passwordProblem(next, user.email);
  if (problem) return fail(problem);
  await db()
    .prepare('UPDATE users SET password_hash=?,must_change=0 WHERE id=?')
    .bind(await hashPassword(next), user.userId)
    .run();
  // Sign out every other device after a password change.
  await db()
    .prepare('DELETE FROM sessions WHERE user_id=? AND id<>?')
    .bind(user.userId, keepToken ? await tokenId(keepToken) : '')
    .run();
  return ok();
}

/**
 * First-time setup for the owner who is identified by the hosting platform: creates a password
 * login bound to the existing tenant, so current data stays attached to the same cabinet.
 */
export async function bootstrapOwner(
  tenant: string,
  email: string,
  name: string,
  password: string,
): Promise<ServiceResult> {
  const normalized = normalizeEmail(email);
  if (!validEmail(normalized)) return fail('Email không hợp lệ');
  const problem = passwordProblem(password, normalized);
  if (problem) return fail(problem);
  const existing = await db()
    .prepare("SELECT 1 AS x FROM memberships WHERE tenant=? AND role='owner'")
    .bind(tenant)
    .first();
  if (existing) return fail('Cơ sở này đã có tài khoản chủ', 409);
  const id = crypto.randomUUID(),
    now = Date.now();
  try {
    await db().batch([
      db()
        .prepare(
          'INSERT INTO users(id,email,name,password_hash,must_change,created) VALUES (?,?,?,?,0,?)',
        )
        .bind(
          id,
          normalized,
          name.trim().slice(0, 100) || normalized,
          await hashPassword(password),
          now,
        ),
      db()
        .prepare("INSERT INTO memberships(user_id,tenant,role,created) VALUES (?,?,'owner',?)")
        .bind(id, tenant, now),
    ]);
  } catch {
    return fail('Email đã được dùng', 409);
  }
  return ok();
}

export type StaffRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  created: number;
};

export async function listStaff(tenant: string): Promise<StaffRow[]> {
  const rows = (
    await db()
      .prepare(
        `SELECT u.id,u.email,u.name,u.active,u.created,m.role FROM memberships m
         JOIN users u ON u.id=m.user_id WHERE m.tenant=? ORDER BY m.created LIMIT 200`,
      )
      .bind(tenant)
      .all<{
        id: string;
        email: string;
        name: string;
        active: number;
        created: number;
        role: string;
      }>()
  ).results;
  return rows
    .filter((r) => isRole(r.role))
    .map((r) => ({ ...r, role: r.role as Role, active: !!r.active }));
}

async function target(tenant: string, userId: string) {
  return db()
    .prepare(
      'SELECT u.id,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant=? AND u.id=?',
    )
    .bind(tenant, userId)
    .first<{ id: string; email: string; role: string }>();
}

export async function createStaff(
  actor: AuthUser,
  input: { email: string; name: string; role: string },
): Promise<ServiceResult> {
  const email = normalizeEmail(input.email);
  if (!validEmail(email)) return fail('Email không hợp lệ');
  if (input.name.trim().length < 2) return fail('Vui lòng nhập tên nhân viên');
  if (!isRole(input.role) || !canAssignRole(actor.role, input.role))
    return fail('Không đủ quyền gán vai trò này', 403);
  const existing = await db()
    .prepare('SELECT id FROM users WHERE email=?')
    .bind(email)
    .first<{ id: string }>();
  const now = Date.now();
  if (existing) {
    // An account that already exists elsewhere is never taken over: refuse to avoid hijacking.
    return fail('Email đã có tài khoản. Hãy dùng email khác.', 409);
  }
  const id = crypto.randomUUID(),
    password = temporaryPassword();
  await db().batch([
    db()
      .prepare(
        'INSERT INTO users(id,email,name,password_hash,must_change,created) VALUES (?,?,?,?,1,?)',
      )
      .bind(id, email, input.name.trim().slice(0, 100), await hashPassword(password), now),
    db()
      .prepare('INSERT INTO memberships(user_id,tenant,role,created) VALUES (?,?,?,?)')
      .bind(id, actor.tenant, input.role, now),
  ]);
  return ok({ id, temporaryPassword: password });
}

export async function updateStaff(
  actor: AuthUser,
  input: { userId: string; name?: string; role?: string; active?: boolean },
): Promise<ServiceResult> {
  const t = await target(actor.tenant, input.userId);
  if (!t || !isRole(t.role)) return fail('Không tìm thấy nhân viên', 404);
  if (!canAssignRole(actor.role, t.role)) return fail('Không đủ quyền sửa nhân viên này', 403);
  if (
    input.userId === actor.userId &&
    (input.active === false || (input.role && input.role !== t.role))
  )
    return fail('Không thể tự khóa hoặc tự đổi vai trò của mình', 409);
  if (input.name !== undefined && input.name.trim().length >= 2) {
    await db()
      .prepare('UPDATE users SET name=? WHERE id=?')
      .bind(input.name.trim().slice(0, 100), input.userId)
      .run();
  }
  if (input.role !== undefined) {
    if (!isRole(input.role) || !canAssignRole(actor.role, input.role))
      return fail('Không đủ quyền gán vai trò này', 403);
    await db()
      .prepare('UPDATE memberships SET role=? WHERE tenant=? AND user_id=?')
      .bind(input.role, actor.tenant, input.userId)
      .run();
  }
  if (input.active !== undefined) {
    await db()
      .prepare('UPDATE users SET active=? WHERE id=?')
      .bind(input.active ? 1 : 0, input.userId)
      .run();
    if (!input.active)
      await db().prepare('DELETE FROM sessions WHERE user_id=?').bind(input.userId).run();
  }
  return ok();
}

export async function deleteStaff(actor: AuthUser, userId: string): Promise<ServiceResult> {
  const t = await target(actor.tenant, userId);
  if (!t || !isRole(t.role)) return fail('Không tìm thấy nhân viên', 404);
  if (userId === actor.userId) return fail('Không thể tự xóa tài khoản của chính mình', 409);
  if (t.role === 'owner') return fail('Không thể xóa tài khoản Chủ cơ sở', 403);
  if (!canAssignRole(actor.role, t.role)) return fail('Không đủ quyền xóa nhân viên này', 403);

  // Terminate active sessions and remove from crm sales extra & tenant membership
  await db().prepare('DELETE FROM sessions WHERE user_id=?').bind(userId).run().catch(() => undefined);
  await db().prepare('DELETE FROM crm2_staff WHERE tenant=? AND user_id=?').bind(actor.tenant, userId).run().catch(() => undefined);
  await db().prepare('DELETE FROM memberships WHERE tenant=? AND user_id=?').bind(actor.tenant, userId).run();

  // If no remaining memberships in other branches, delete from users table
  const other = await db()
    .prepare('SELECT 1 AS x FROM memberships WHERE user_id=? LIMIT 1')
    .bind(userId)
    .first();
  if (!other) {
    await db().prepare('DELETE FROM users WHERE id=?').bind(userId).run().catch(() => undefined);
  }
  return ok();
}

export async function resetStaffPassword(actor: AuthUser, userId: string): Promise<ServiceResult> {
  const t = await target(actor.tenant, userId);
  if (!t || !isRole(t.role)) return fail('Không tìm thấy nhân viên', 404);
  if (userId === actor.userId) return fail('Hãy dùng chức năng đổi mật khẩu của chính mình', 409);
  if (!canAssignRole(actor.role, t.role)) return fail('Không đủ quyền', 403);
  const password = temporaryPassword();
  await db().batch([
    db()
      .prepare(
        'UPDATE users SET password_hash=?,must_change=1,failed_count=0,locked_until=0 WHERE id=?',
      )
      .bind(await hashPassword(password), userId),
    db().prepare('DELETE FROM sessions WHERE user_id=?').bind(userId),
  ]);
  return ok({ temporaryPassword: password });
}
