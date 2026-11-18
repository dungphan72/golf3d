import { db } from '../../../lib/server/common';
import { normalizePhone } from '../core/phone';
import { tierFor } from '../core/customers';
import { isManager } from '../core/access';
import { fail, getSettings, reply, vnDayStart, DAY, type Ctx, type Result } from './store';

const VN = 7 * 3_600_000;

/** Creates the profile of a customer (code KH000001) on first sale or creation; safe to call again. */
export async function ensureProfile(tenant: string, phoneNorm: string, by: string, now: number) {
  const d = db();
  const found = await d
    .prepare('SELECT code FROM crm2_customer_profiles WHERE tenant=? AND phone_norm=?')
    .bind(tenant, phoneNorm)
    .first<{ code: string }>();
  if (found) return found.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    const n =
      ((
        await d
          .prepare('SELECT COUNT(*) AS n FROM crm2_customer_profiles WHERE tenant=?')
          .bind(tenant)
          .first<{ n: number }>()
      )?.n ?? 0) +
      1 +
      attempt;
    const code = 'KH' + String(n).padStart(6, '0');
    const r = await d
      .prepare(
        'INSERT OR IGNORE INTO crm2_customer_profiles(tenant,phone_norm,code,updated_by,created,updated) VALUES (?,?,?,?,?,?)',
      )
      .bind(tenant, phoneNorm, code, by, now, now)
      .run();
    if (r.meta.changes) return code;
    const again = await d
      .prepare('SELECT code FROM crm2_customer_profiles WHERE tenant=? AND phone_norm=?')
      .bind(tenant, phoneNorm)
      .first<{ code: string }>();
    if (again) return again.code; // another request created it
  }
  throw new Error('Không tạo được mã khách hàng');
}

type CustomerRow = {
  phoneNorm: string;
  fullName: string;
  phone: string;
  code: string | null;
  total: number;
  deals: number;
  lastWon: number | null;
  birthday: string | null;
  owner: string | null;
};

const CUSTOMER_SQL = `SELECT l.phone_norm AS phoneNorm,MAX(l.full_name) AS fullName,MAX(l.phone) AS phone,p.code AS code,
   SUM(l.expected_value) AS total,COUNT(*) AS deals,MAX(l.won_at) AS lastWon,p.birthday AS birthday,MAX(l.owner) AS owner
  FROM crm2_leads l LEFT JOIN crm2_customer_profiles p ON p.tenant=l.tenant AND p.phone_norm=l.phone_norm
  WHERE l.tenant=? AND l.stage='WON' AND l.phone_norm<>''`;

export async function listCustomers(c: Ctx, q: string, tier: string): Promise<Result> {
  const settings = await getSettings(c.tenant);
  const mgr = isManager(c.role);
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const rows = (
    await db()
      .prepare(
        `${CUSTOMER_SQL} AND (?=1 OR l.owner=?) AND (?='' OR l.full_name LIKE ? OR l.phone_norm LIKE ? OR p.code LIKE ?)
         GROUP BY l.phone_norm ORDER BY lastWon DESC LIMIT 300`,
      )
      .bind(c.tenant, mgr ? 1 : 0, c.userId, q, like, `%${normalizePhone(q) || q}%`, like)
      .all<CustomerRow>()
  ).results;
  const out = rows
    .map((r) => ({ ...r, tier: tierFor(r.total, settings.tiers) }))
    .filter((r) => !tier || r.tier.id === tier);
  const today = new Date(c.now + VN).toISOString().slice(5, 10);
  const month = today.slice(0, 2);
  const startToday = vnDayStart(c.now);
  return reply({
    customers: out,
    summary: {
      total: out.length,
      wonToday: out.filter((r) => (r.lastWon ?? 0) >= startToday).length,
      birthdayToday: out.filter((r) => (r.birthday ?? '').slice(-5) === today).length,
      birthdayMonth: out.filter((r) => (r.birthday ?? '').slice(-5, -3) === month).length,
    },
    tiers: settings.tiers,
  });
}

export async function customerDetail(c: Ctx, phone: string): Promise<Result> {
  const norm = normalizePhone(phone);
  const mgr = isManager(c.role);
  const d = db();
  const row = await d
    .prepare(`${CUSTOMER_SQL} AND l.phone_norm=? AND (?=1 OR l.owner=?) GROUP BY l.phone_norm`)
    .bind(c.tenant, norm, mgr ? 1 : 0, c.userId)
    .first<CustomerRow>();
  if (!row) return fail('Không tìm thấy khách hàng', 404);
  const settings = await getSettings(c.tenant);
  const [profile, leads, orders, appts, legacyBills, bookings] = await Promise.all([
    d
      .prepare(
        'SELECT code,birthday,gender,occupation,interests,note FROM crm2_customer_profiles WHERE tenant=? AND phone_norm=?',
      )
      .bind(c.tenant, norm)
      .first(),
    d
      .prepare(
        'SELECT id,stage,expected_value AS value,target_service AS service,won_at AS wonAt,created FROM crm2_leads WHERE tenant=? AND phone_norm=? ORDER BY created DESC',
      )
      .bind(c.tenant, norm)
      .all(),
    d
      .prepare(
        'SELECT o.id,o.code,o.product_name AS productName,o.price,o.status,o.created FROM crm2_orders o JOIN crm2_leads l ON l.id=o.lead_id AND l.tenant=o.tenant WHERE o.tenant=? AND l.phone_norm=? ORDER BY o.created DESC',
      )
      .bind(c.tenant, norm)
      .all(),
    d
      .prepare(
        'SELECT a.id,a.at,a.status,a.service FROM crm2_appointments a JOIN crm2_leads l ON l.id=a.lead_id AND l.tenant=a.tenant WHERE a.tenant=? AND l.phone_norm=? ORDER BY a.at DESC',
      )
      .bind(c.tenant, norm)
      .all(),
    d
      .prepare(
        "SELECT id,code,bill_at AS billAt,total,service,room,lines,method,status,created_by_name AS createdByName,bill_image_url AS billImageUrl FROM legacy_bills WHERE tenant=? AND (phone=? OR phone=?) AND status='approved' ORDER BY bill_at DESC LIMIT 30",
      )
      .bind(c.tenant, norm, phone)
      .all()
      .catch(() => ({ results: [] })),
    d
      .prepare(
        'SELECT id,room,service,people,start,end,status,amount,payment,started,finished FROM bookings WHERE tenant=? AND (phone=? OR phone=?) ORDER BY start DESC LIMIT 30',
      )
      .bind(c.tenant, norm, phone)
      .all()
      .catch(() => ({ results: [] })),
  ]);
  return reply({
    customer: { ...row, tier: tierFor(row.total, settings.tiers) },
    profile,
    leads: leads.results,
    orders: orders.results,
    appointments: appts.results,
    legacyBills: legacyBills.results,
    bookings: bookings.results,
  });
}

export async function updateProfile(
  c: Ctx,
  phone: string,
  p: {
    birthday?: string;
    gender?: string;
    occupation?: string;
    interests?: string[];
    note?: string;
  },
): Promise<Result> {
  const norm = normalizePhone(phone);
  const own = await db()
    .prepare(
      "SELECT 1 AS x FROM crm2_leads WHERE tenant=? AND phone_norm=? AND stage='WON' AND (?=1 OR owner=?) LIMIT 1",
    )
    .bind(c.tenant, norm, isManager(c.role) ? 1 : 0, c.userId)
    .first();
  if (!own) return fail('Không tìm thấy khách hàng', 404);
  await ensureProfile(c.tenant, norm, c.userId, c.now);
  await db()
    .prepare(
      `UPDATE crm2_customer_profiles SET birthday=COALESCE(?,birthday),gender=COALESCE(?,gender),occupation=COALESCE(?,occupation),
       interests=COALESCE(?,interests),note=COALESCE(?,note),updated_by=?,updated=? WHERE tenant=? AND phone_norm=?`,
    )
    .bind(
      p.birthday ?? null,
      p.gender ?? null,
      p.occupation?.slice(0, 80) ?? null,
      p.interests ? JSON.stringify(p.interests.slice(0, 20)) : null,
      p.note?.slice(0, 500) ?? null,
      c.userId,
      c.now,
      c.tenant,
      norm,
    )
    .run();
  return reply({ ok: true });
}

/** Birthday tasks for customers whose birthday is today (Vietnam time), once per year. */
export async function birthdayStep(tenant: string, now: number): Promise<number> {
  const mmdd = new Date(now + VN).toISOString().slice(5, 10);
  const year = new Date(now + VN).getUTCFullYear();
  const rows = (
    await db()
      .prepare(
        `SELECT p.phone_norm AS phoneNorm,(SELECT id FROM crm2_leads l WHERE l.tenant=p.tenant AND l.phone_norm=p.phone_norm AND l.stage='WON' ORDER BY won_at DESC LIMIT 1) AS leadId,
          (SELECT owner FROM crm2_leads l WHERE l.tenant=p.tenant AND l.phone_norm=p.phone_norm AND l.stage='WON' ORDER BY won_at DESC LIMIT 1) AS owner,
          (SELECT full_name FROM crm2_leads l WHERE l.tenant=p.tenant AND l.phone_norm=p.phone_norm LIMIT 1) AS name
         FROM crm2_customer_profiles p WHERE p.tenant=? AND substr(p.birthday,-5)=? AND COALESCE(p.birthday_task_year,0)<>?`,
      )
      .bind(tenant, mmdd, year)
      .all<{
        phoneNorm: string;
        leadId: string | null;
        owner: string | null;
        name: string | null;
      }>()
  ).results;
  let n = 0;
  for (const r of rows) {
    await db()
      .prepare(
        "INSERT OR IGNORE INTO crm2_tasks(id,tenant,lead_id,title,type,due_at,assignee,created_by,ukey,created) VALUES (?,?,?,?,'FOLLOW_UP',?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        tenant,
        r.leadId,
        `Chúc mừng sinh nhật ${r.name ?? 'khách'}`,
        now,
        r.owner,
        'Hệ thống',
        `bday:${r.phoneNorm}:${year}`,
        now,
      )
      .run();
    await db()
      .prepare(
        'UPDATE crm2_customer_profiles SET birthday_task_year=? WHERE tenant=? AND phone_norm=?',
      )
      .bind(year, tenant, r.phoneNorm)
      .run();
    n++;
  }
  return n;
}
void DAY;
