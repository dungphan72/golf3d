import { db, loadConfig, type ServiceResult } from './common';
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
import { normalizePhone, validPhone } from '../member';
import { CREATE_CUSTOMER_SQL } from '../package-sql';
import { rooms } from '../club';
import { MEMBER_SESSION_SECONDS } from '../member-account';

type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
const DUMMY_HASH =
  'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const BAD_LOGIN = 'Số điện thoại hoặc mật khẩu không đúng';

export type MemberUser = {
  accountId: string;
  tenant: string;
  customerId: string;
  phone: string;
  email: string;
  verified: boolean;
};

/** The club whose members sign up on the public site: the one taking online bookings, else the first. */
export async function publicTenant(): Promise<string | null> {
  const row =
    (await db()
      .prepare("SELECT tenant FROM settings WHERE json_extract(value,'$.onlineEnabled')=1 LIMIT 1")
      .first<{ tenant: string }>()) ??
    (await db().prepare('SELECT tenant FROM settings LIMIT 1').first<{ tenant: string }>());
  return row?.tenant ?? null;
}

async function openSession(accountId: string) {
  const token = newToken();
  const now = Date.now();
  await db()
    .prepare('INSERT INTO member_sessions(id,account_id,expires,created) VALUES (?,?,?,?)')
    .bind(await tokenId(token), accountId, now + MEMBER_SESSION_SECONDS * 1000, now)
    .run();
  await db().prepare('DELETE FROM member_sessions WHERE expires<?').bind(now).run();
  return token;
}

export type Outcome = { result: R; token?: string };

export async function registerMember(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
}): Promise<Outcome> {
  const phone = normalizePhone(input.phone);
  if (!validPhone(phone)) return { result: error('Số điện thoại không hợp lệ') };
  const email = normalizeEmail(input.email);
  if (email && !validEmail(email)) return { result: error('Email không hợp lệ') };
  const problem = passwordProblem(input.password, email);
  if (problem) return { result: error(problem) };
  try {
    const tenant = await publicTenant();
    if (!tenant) return { result: error('Chưa mở đăng ký hội viên', 404) };
    const d = db();
    const now = Date.now();
    const existing = await d
      .prepare('SELECT id FROM customers WHERE tenant=? AND phone=?')
      .bind(tenant, phone)
      .first<{ id: string }>();
    const customerId = existing?.id ?? crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const hash = await hashPassword(input.password);
    const statements = [
      ...(existing
        ? []
        : [d.prepare(CREATE_CUSTOMER_SQL).bind(customerId, tenant, input.name, phone, '', now)]),
      d
        .prepare(
          'INSERT INTO member_accounts(id,tenant,customer_id,phone,email,password_hash,verified,failed_count,locked_until,created) VALUES (?,?,?,?,?,?,0,0,0,?)',
        )
        .bind(accountId, tenant, customerId, phone, email, hash, now),
    ];
    await d.batch(statements);
    return { result: reply({ ok: true, verified: false }), token: await openSession(accountId) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('member_account_phone') || message.includes('member_accounts.phone'))
      return { result: error('Số điện thoại này đã có tài khoản. Hãy đăng nhập.', 409) };
    if (message.includes('RATE_LIMITED'))
      return { result: error('Đang có quá nhiều lượt đăng ký. Vui lòng thử lại sau.', 429) };
    console.error('member register', e);
    return { result: error('Chưa đăng ký được. Vui lòng thử lại hoặc gọi câu lạc bộ.', 500) };
  }
}

export async function loginMember(phoneInput: string, password: string): Promise<Outcome> {
  const phone = normalizePhone(phoneInput);
  try {
    const tenant = await publicTenant();
    const row =
      tenant && validPhone(phone)
        ? await db()
            .prepare(
              'SELECT id,password_hash,failed_count,locked_until FROM member_accounts WHERE tenant=? AND phone=?',
            )
            .bind(tenant, phone)
            .first<{
              id: string;
              password_hash: string;
              failed_count: number;
              locked_until: number;
            }>()
        : null;
    const now = Date.now();
    if (!row) {
      await verifyPassword(password, DUMMY_HASH);
      return { result: error(BAD_LOGIN, 401) };
    }
    if (row.locked_until > now)
      return {
        result: error('Tài khoản tạm khóa do nhập sai nhiều lần. Thử lại sau ít phút.', 429),
      };
    if (!(await verifyPassword(password, row.password_hash))) {
      const failures = row.failed_count + 1;
      await db()
        .prepare('UPDATE member_accounts SET failed_count=?,locked_until=? WHERE id=?')
        .bind(
          failures >= MAX_FAILURES ? 0 : failures,
          failures >= MAX_FAILURES ? now + LOCK_MS : 0,
          row.id,
        )
        .run();
      return { result: error(BAD_LOGIN, 401) };
    }
    await db()
      .prepare('UPDATE member_accounts SET failed_count=0,locked_until=0 WHERE id=?')
      .bind(row.id)
      .run();
    return { result: reply({ ok: true }), token: await openSession(row.id) };
  } catch (e) {
    console.error('member login', e);
    return { result: error('Chưa đăng nhập được. Vui lòng thử lại.', 500) };
  }
}

export async function memberFromSession(token: string): Promise<MemberUser | null> {
  try {
    const row = await db()
      .prepare(
        `SELECT a.id,a.tenant,a.customer_id,a.phone,a.email,a.verified FROM member_sessions s
         JOIN member_accounts a ON a.id=s.account_id WHERE s.id=? AND s.expires>?`,
      )
      .bind(await tokenId(token), Date.now())
      .first<{
        id: string;
        tenant: string;
        customer_id: string;
        phone: string;
        email: string;
        verified: number;
      }>();
    return row
      ? {
          accountId: row.id,
          tenant: row.tenant,
          customerId: row.customer_id,
          phone: row.phone,
          email: row.email,
          verified: !!row.verified,
        }
      : null;
  } catch {
    return null; // before migration 0012 is applied
  }
}

export async function logoutMember(token: string) {
  await db()
    .prepare('DELETE FROM member_sessions WHERE id=?')
    .bind(await tokenId(token))
    .run();
}

type PackageRow = {
  id: string;
  name: string;
  source: string;
  perks: string;
  room: string;
  purchased: number;
  expires: number;
  balances: string | null;
};

/** Everything the member's own page shows. Card and play history are withheld until staff verify the phone. */
export async function memberOverview(user: MemberUser): Promise<R> {
  const d = db();
  const customer = await d
    .prepare('SELECT name FROM customers WHERE tenant=? AND id=?')
    .bind(user.tenant, user.customerId)
    .first<{ name: string }>();
  const profile = {
    name: customer?.name ?? '',
    phone: user.phone,
    email: user.email,
    verified: user.verified,
  };
  if (!user.verified) return reply({ profile });
  const now = Date.now();
  const config = await loadConfig(user.tenant);
  const [packages, usage, points, bookings, requests] = await Promise.all([
    d
      .prepare(
        `SELECT cp.id,cp.name,cp.source,cp.perks,cp.room,cp.purchased,cp.expires,
           (SELECT json_group_array(json_object('kind',b.kind,'remaining',b.remaining)) FROM package_balances b WHERE b.tenant=cp.tenant AND b.package_id=cp.id) AS balances
         FROM customer_packages cp WHERE cp.tenant=? AND cp.customer_id=? ORDER BY cp.purchased DESC LIMIT 50`,
      )
      .bind(user.tenant, user.customerId)
      .all<PackageRow>(),
    d
      .prepare(
        `SELECT l.created,l.kind,-l.delta AS units,cp.name AS package,b.start,b.room,b.service FROM package_ledger l
         JOIN customer_packages cp ON cp.id=l.package_id AND cp.tenant=l.tenant
         LEFT JOIN bookings b ON b.id=l.booking_id AND b.tenant=l.tenant
         WHERE l.tenant=? AND cp.customer_id=? AND l.reason='use' ORDER BY l.created DESC LIMIT 40`,
      )
      .bind(user.tenant, user.customerId)
      .all<{
        created: number;
        kind: string;
        units: number;
        package: string;
        start: number | null;
        room: string | null;
        service: string | null;
      }>(),
    d
      .prepare('SELECT points FROM customer_points WHERE tenant=? AND customer_id=?')
      .bind(user.tenant, user.customerId)
      .first<{ points: number }>(),
    d
      .prepare(
        `SELECT id,room,service,people,start,end,status FROM bookings WHERE tenant=? AND phone=? AND status<>'cancelled' ORDER BY start DESC LIMIT 30`,
      )
      .bind(user.tenant, user.phone)
      .all<{
        id: string;
        room: string;
        service: string;
        people: number;
        start: number;
        end: number;
        status: string;
      }>(),
    d
      .prepare(
        `SELECT service,vip,people,start,status FROM booking_requests WHERE tenant=? AND phone=? AND status IN ('pending','confirmed') AND start>? ORDER BY start LIMIT 10`,
      )
      .bind(user.tenant, user.phone, now - 3_600_000)
      .all<{ service: string; vip: number; people: number; start: number; status: string }>(),
  ]);
  const roomName = (id: string | null) => rooms.find((r) => r.id === id)?.name ?? id ?? '';
  return reply({
    profile,
    club: { name: config.name, address: config.address },
    points: points?.points ?? 0,
    packages: packages.results.map((p) => ({
      ...p,
      balances: p.balances ? (JSON.parse(p.balances) as { kind: string; remaining: number }[]) : [],
    })),
    usage: usage.results.map((u) => ({ ...u, room: roomName(u.room) })),
    bookings: bookings.results.map((b) => ({ ...b, room: roomName(b.room) })),
    requests: requests.results,
  });
}

export async function updateProfile(
  user: MemberUser,
  name: string,
  emailInput: string,
): Promise<R> {
  const email = normalizeEmail(emailInput);
  if (email && !validEmail(email)) return error('Email không hợp lệ');
  const d = db();
  await d.batch([
    d
      .prepare('UPDATE customers SET name=? WHERE tenant=? AND id=?')
      .bind(name, user.tenant, user.customerId),
    d.prepare('UPDATE member_accounts SET email=? WHERE id=?').bind(email, user.accountId),
  ]);
  return reply({ ok: true });
}

export async function changeMemberPassword(
  user: MemberUser,
  current: string,
  next: string,
): Promise<R> {
  const row = await db()
    .prepare('SELECT password_hash FROM member_accounts WHERE id=?')
    .bind(user.accountId)
    .first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(current, row.password_hash)))
    return error('Mật khẩu hiện tại không đúng', 403);
  const problem = passwordProblem(next, user.email);
  if (problem) return error(problem);
  await db()
    .prepare('UPDATE member_accounts SET password_hash=? WHERE id=?')
    .bind(await hashPassword(next), user.accountId)
    .run();
  return reply({ ok: true });
}

// ---- Staff side ----

export async function verifyAccount(tenant: string, customerId: string): Promise<R> {
  const r = await db()
    .prepare('UPDATE member_accounts SET verified=1 WHERE tenant=? AND customer_id=?')
    .bind(tenant, customerId)
    .run();
  return r.meta.changes ? reply({ ok: true }) : error('Khách này chưa có tài khoản web', 404);
}

/** Sets a throwaway password (shown once to staff) and signs the member out everywhere. */
export async function resetAccountPassword(tenant: string, customerId: string): Promise<R> {
  const d = db();
  const acct = await d
    .prepare('SELECT id FROM member_accounts WHERE tenant=? AND customer_id=?')
    .bind(tenant, customerId)
    .first<{ id: string }>();
  if (!acct) return error('Khách này chưa có tài khoản web', 404);
  const password = temporaryPassword();
  await d.batch([
    d
      .prepare(
        'UPDATE member_accounts SET password_hash=?,failed_count=0,locked_until=0 WHERE id=?',
      )
      .bind(await hashPassword(password), acct.id),
    d.prepare('DELETE FROM member_sessions WHERE account_id=?').bind(acct.id),
  ]);
  return reply({ ok: true, password });
}
