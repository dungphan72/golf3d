import { memberCode } from '../member-card';
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
import { submitRequest } from './online-service';
import { sendWebsiteLead } from './website-lead';
import { MEMBER_SESSION_SECONDS } from '../member-account';

type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);

// Per-IP limits (a stranger cannot lock someone else's account from another address).
const WINDOW_MS = 15 * 60_000;
const HOUR_MS = 3_600_000;
const LOGIN_FAILS_PER_IP_PHONE = 5; // wrong passwords for one phone from one address in 15 minutes
const LOGIN_FAILS_PER_PHONE = 30; // same, from all addresses together
const REGISTERS_PER_IP_HOUR = 5;
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

async function attempts(
  kind: string,
  column: 'ip_hash' | 'subject',
  value: string,
  since: number,
  extra?: [string, string],
) {
  const row = await db()
    .prepare(
      `SELECT COUNT(*) AS n FROM member_attempts WHERE kind=? AND ${column}=? AND created>?${extra ? ` AND ${extra[0]}=?` : ''}`,
    )
    .bind(...[kind, value, since, ...(extra ? [extra[1]] : [])])
    .first<{ n: number }>();
  return row?.n ?? 0;
}
async function record(kind: string, ipHash: string, subject: string) {
  const now = Date.now();
  await db()
    .prepare('INSERT INTO member_attempts(id,kind,ip_hash,subject,created) VALUES (?,?,?,?,?)')
    .bind(crypto.randomUUID(), kind, ipHash, subject, now)
    .run();
  // Opportunistic cleanup keeps the table small.
  await db()
    .prepare('DELETE FROM member_attempts WHERE created<?')
    .bind(now - 24 * HOUR_MS)
    .run();
}

export async function registerMember(
  input: { name: string; phone: string; email: string; password: string },
  ip = 'unknown',
  base = '',
): Promise<Outcome> {
  const phone = normalizePhone(input.phone);
  if (!validPhone(phone)) return { result: error('Số điện thoại không hợp lệ') };
  const email = normalizeEmail(input.email);
  if (email && !validEmail(email)) return { result: error('Email không hợp lệ') };
  const problem = passwordProblem(input.password, email);
  if (problem) return { result: error(problem) };
  try {
    const ipHash = await tokenId('ip:' + ip);
    if (
      (await attempts('register', 'ip_hash', ipHash, Date.now() - HOUR_MS)) >= REGISTERS_PER_IP_HOUR
    )
      return {
        result: error(
          'Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau hoặc gọi câu lạc bộ.',
          429,
        ),
      };
    await record('register', ipHash, '');
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
    // A new account is also a lead: the CRM gets the person to call and confirm the phone number.
    await sendWebsiteLead(
      tenant,
      {
        name: input.name,
        phone,
        email,
        need: '',
        guests: 0,
        preferredStart: null,
        message: 'Đăng ký tài khoản hội viên trên website (chờ xác nhận số điện thoại)',
        campaign: 'dang-ky-hoi-vien',
        extKey: 'member-register:' + accountId,
        consent: false,
      },
      base,
      now,
    );
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

export async function loginMember(
  phoneInput: string,
  password: string,
  ip = 'unknown',
): Promise<Outcome> {
  const phone = normalizePhone(phoneInput);
  try {
    const ipHash = await tokenId('ip:' + ip);
    const subject = await tokenId('phone:' + phone);
    const since = Date.now() - WINDOW_MS;
    if (
      (await attempts('login_fail', 'ip_hash', ipHash, since, ['subject', subject])) >=
        LOGIN_FAILS_PER_IP_PHONE ||
      (await attempts('login_fail', 'subject', subject, since)) >= LOGIN_FAILS_PER_PHONE
    )
      return { result: error('Nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.', 429) };
    const tenant = await publicTenant();
    const row =
      tenant && validPhone(phone)
        ? await db()
            .prepare('SELECT id,password_hash FROM member_accounts WHERE tenant=? AND phone=?')
            .bind(tenant, phone)
            .first<{ id: string; password_hash: string }>()
        : null;
    if (!row) {
      await verifyPassword(password, DUMMY_HASH);
      await record('login_fail', ipHash, subject);
      return { result: error(BAD_LOGIN, 401) };
    }
    if (!(await verifyPassword(password, row.password_hash))) {
      await record('login_fail', ipHash, subject);
      return { result: error(BAD_LOGIN, 401) };
    }
    await db()
      .prepare('DELETE FROM member_attempts WHERE kind=? AND ip_hash=? AND subject=?')
      .bind('login_fail', ipHash, subject)
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
    .prepare('SELECT name,created FROM customers WHERE tenant=? AND id=?')
    .bind(user.tenant, user.customerId)
    .first<{ name: string; created: number }>();
  const profile = {
    name: customer?.name ?? '',
    phone: user.phone,
    email: user.email,
    verified: user.verified,
  };
  if (!user.verified) return reply({ profile });
  const now = Date.now();
  const config = await loadConfig(user.tenant);
  const [packages, usage, points, bookings, requests, catalog, orders] = await Promise.all([
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
        `SELECT id,service,vip,people,start,status,quote FROM booking_requests WHERE tenant=? AND phone=? AND status IN ('pending','confirmed') AND start>? ORDER BY start LIMIT 10`,
      )
      .bind(user.tenant, user.phone, now - 3_600_000)
      .all<{
        id: string;
        service: string;
        vip: number;
        people: number;
        start: number;
        status: string;
        quote: string;
      }>(),
    d
      .prepare(
        'SELECT id,name,price,room,section,valid_days FROM package_types WHERE tenant=? AND active=1 ORDER BY price LIMIT 60',
      )
      .bind(user.tenant)
      .all<{
        id: string;
        name: string;
        price: number;
        room: string;
        section: string;
        valid_days: number;
      }>(),
    d
      .prepare(
        "SELECT id,name,price,created FROM package_orders WHERE tenant=? AND customer_id=? AND status='pending' ORDER BY created DESC LIMIT 10",
      )
      .bind(user.tenant, user.customerId)
      .all<{ id: string; name: string; price: number; created: number }>(),
  ]);
  const roomName = (id: string | null) => rooms.find((r) => r.id === id)?.name ?? id ?? '';
  return reply({
    profile,
    club: { name: config.name, address: config.address },
    code: memberCode(user.customerId),
    since: customer?.created ?? null,
    points: points?.points ?? 0,
    packages: packages.results.map((p) => ({
      ...p,
      balances: p.balances ? (JSON.parse(p.balances) as { kind: string; remaining: number }[]) : [],
    })),
    usage: usage.results.map((u) => ({ ...u, room: roomName(u.room) })),
    bookings: bookings.results.map((b) => ({ ...b, room: roomName(b.room) })),
    requests: requests.results.map(({ quote, ...r }) => ({
      ...r,
      guests: (JSON.parse(quote) as { guests?: number }).guests ?? 0,
    })),
    catalog: catalog.results,
    orders: orders.results,
    booking: {
      enabled: !!config.onlineEnabled && !!config.onlineSlug,
      vip: (config.vipCapacity ?? 0) > 0,
      services: (['gdr', '9', '18'] as const).filter((s) =>
        (config.priceRules ?? []).some((r) => r.enabled && r.service === s),
      ),
      days: config.days,
    },
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

// ---- Requests from the member page ----

const PACKAGE_ORDER_ERRORS: [string, string, number][] = [
  ['PACKAGE_TYPE_UNAVAILABLE', 'Gói này không còn bán hoặc giá vừa đổi. Hãy tải lại trang.', 409],
  [
    'TOO_MANY_PENDING_ORDERS',
    'Bạn đang có 3 yêu cầu mua gói chờ xử lý. Vui lòng chờ câu lạc bộ liên hệ.',
    429,
  ],
];

export async function orderPackage(user: MemberUser, typeId: string): Promise<R> {
  if (!user.verified) return error('Tài khoản chưa được câu lạc bộ xác nhận', 403);
  const type = await db()
    .prepare('SELECT id,name,price FROM package_types WHERE tenant=? AND id=? AND active=1')
    .bind(user.tenant, typeId)
    .first<{ id: string; name: string; price: number }>();
  if (!type) return error('Gói không tồn tại hoặc đã ngừng bán', 404);
  try {
    await db()
      .prepare(
        "INSERT INTO package_orders(id,tenant,customer_id,type_id,name,price,status,package_id,handled_by,handled_at,created) VALUES (?,?,?,?,?,?,'pending',NULL,NULL,NULL,?)",
      )
      .bind(
        crypto.randomUUID(),
        user.tenant,
        user.customerId,
        type.id,
        type.name,
        type.price,
        Date.now(),
      )
      .run();
    return reply({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    for (const [needle, text, status] of PACKAGE_ORDER_ERRORS)
      if (message.includes(needle)) return error(text, status);
    console.error('package order', e);
    return error('Chưa gửi được yêu cầu. Vui lòng thử lại.', 500);
  }
}

export async function cancelOrder(user: MemberUser, id: string): Promise<R> {
  const r = await db()
    .prepare(
      "UPDATE package_orders SET status='cancelled' WHERE tenant=? AND customer_id=? AND id=? AND status='pending'",
    )
    .bind(user.tenant, user.customerId, id)
    .run();
  return r.meta.changes
    ? reply({ ok: true })
    : error('Yêu cầu đã được xử lý hoặc không tồn tại', 409);
}

/** Booking request made from the signed-in member page: same pipeline as the public form, with the member's own name and phone. */
export async function bookAsMember(
  user: MemberUser,
  input: { service: 'gdr' | '9' | '18'; vip: boolean; guests: number; start: number; note: string },
  ip: string,
): Promise<R> {
  if (!user.verified) return error('Tài khoản chưa được câu lạc bộ xác nhận', 403);
  const config = await loadConfig(user.tenant);
  if (!config.onlineEnabled || !config.onlineSlug)
    return error('Câu lạc bộ chưa nhận đặt lịch online', 409);
  const customer = await db()
    .prepare('SELECT name FROM customers WHERE tenant=? AND id=?')
    .bind(user.tenant, user.customerId)
    .first<{ name: string }>();
  return submitRequest(
    config.onlineSlug,
    {
      name: customer?.name ?? 'Hội viên',
      phone: user.phone,
      service: input.service,
      vip: input.vip,
      guests: input.guests,
      start: input.start,
      minutes: input.service === 'gdr' ? 60 : 0,
      note: input.note,
      website: '',
    },
    ip,
  );
}

export async function cancelBooking(user: MemberUser, id: string): Promise<R> {
  const r = await db()
    .prepare(
      "UPDATE booking_requests SET status='cancelled' WHERE tenant=? AND phone=? AND id=? AND status='pending' AND handled_by IS NULL",
    )
    .bind(user.tenant, user.phone, id)
    .run();
  return r.meta.changes
    ? reply({ ok: true })
    : error('Yêu cầu đã được xử lý nên không thể hủy tại đây. Vui lòng gọi câu lạc bộ.', 409);
}
