import type { Permission } from '../../../lib/auth/permissions';
import { db, type ServiceResult } from '../../../lib/server/common';
import { enqueue } from '../../../lib/server/outbox-service';
import { sanitizeSettings, type CrmSettings } from '../core/settings';

export type Result = ServiceResult;
export const reply = (body: Record<string, unknown>, status = 200): Result => ({ status, body });
export const fail = (message: string, status = 400): Result => reply({ error: message }, status);
export const DAY = 86_400_000;
const VN = 7 * 3_600_000;
/** Start of the Vietnam day that contains t, as a timestamp. */
export const vnDayStart = (t: number) => Math.floor((t + VN) / DAY) * DAY - VN;

export type Ctx = { tenant: string; userId: string; role: string; permissions?: Permission[]; now: number; base: string };

export async function getSettings(tenant: string): Promise<CrmSettings> {
  const row = await db()
    .prepare('SELECT value FROM crm2_settings WHERE tenant=?')
    .bind(tenant)
    .first<{ value: string }>();
  let raw: unknown = null;
  try {
    raw = row ? JSON.parse(row.value) : null;
  } catch {
    raw = null; // a damaged value falls back to the defaults
  }
  return sanitizeSettings(raw);
}

export async function saveSettings(tenant: string, raw: unknown, now: number) {
  const clean = sanitizeSettings(raw);
  await db()
    .prepare(
      'INSERT INTO crm2_settings(tenant,value,updated) VALUES (?,?,?) ON CONFLICT(tenant) DO UPDATE SET value=excluded.value,updated=excluded.updated',
    )
    .bind(tenant, JSON.stringify(clean), now)
    .run();
  return clean;
}

export async function setRuntime(tenant: string, key: string, value: unknown, now: number) {
  await db()
    .prepare(
      'INSERT INTO crm2_runtime(tenant,key,value,updated) VALUES (?,?,?,?) ON CONFLICT(tenant,key) DO UPDATE SET value=excluded.value,updated=excluded.updated',
    )
    .bind(tenant, key, JSON.stringify(value), now)
    .run();
}
export async function getRuntime<T>(
  tenant: string,
  key: string,
): Promise<{ value: T; updated: number } | null> {
  const row = await db()
    .prepare('SELECT value,updated FROM crm2_runtime WHERE tenant=? AND key=?')
    .bind(tenant, key)
    .first<{ value: string; updated: number }>();
  return row ? { value: JSON.parse(row.value) as T, updated: row.updated } : null;
}

export async function addActivity(
  tenant: string,
  leadId: string,
  type: string,
  content: string,
  actor: string,
  now: number,
  meta: Record<string, unknown> = {},
) {
  await db()
    .prepare(
      'INSERT INTO crm2_activities(id,tenant,lead_id,type,content,meta,actor,created) VALUES (?,?,?,?,?,?,?,?)',
    )
    .bind(
      crypto.randomUUID(),
      tenant,
      leadId,
      type,
      content.slice(0, 2000),
      JSON.stringify(meta),
      actor,
      now,
    )
    .run();
}

export async function addTask(
  tenant: string,
  t: {
    leadId: string | null;
    title: string;
    type?: string;
    dueAt: number | null;
    assignee: string | null;
    createdBy: string;
    ukey?: string;
  },
  now: number,
) {
  const r = await db()
    .prepare(
      'INSERT OR IGNORE INTO crm2_tasks(id,tenant,lead_id,title,type,due_at,done_at,assignee,created_by,reminded_at,ukey,created) VALUES (?,?,?,?,?,?,NULL,?,?,NULL,?,?)',
    )
    .bind(
      crypto.randomUUID(),
      tenant,
      t.leadId,
      t.title.slice(0, 255),
      t.type ?? 'FOLLOW_UP',
      t.dueAt,
      t.assignee,
      t.createdBy,
      t.ukey ?? null,
      now,
    )
    .run();
  return r.meta.changes > 0;
}

export type StaffUser = { id: string; name: string; email: string; role: string };
/** Active staff who may work leads. */
export async function staffList(tenant: string): Promise<StaffUser[]> {
  const rows = (
    await db()
      .prepare(
        `SELECT u.id,u.name,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id AND u.active=1
         WHERE m.tenant=? ORDER BY u.name`,
      )
      .bind(tenant)
      .all<StaffUser>()
  ).results;
  return rows.filter((r) => ['owner', 'manager', 'sale', 'cskh', 'cashier'].includes(r.role));
}
export const SALES_ROLES = ['sale', 'cskh'];

/** Tells an employee by email (goes through the shared outbox, so it is sent once). */
export async function notifyStaff(
  tenant: string,
  userId: string | null,
  ukey: string,
  subject: string,
  body: string,
  now: number,
) {
  if (!userId) return;
  const u = await db()
    .prepare(
      `SELECT COALESCE(NULLIF(s.notify_email,''),u.email) AS email,COALESCE(s.zalo_id,'') AS zalo
       FROM users u LEFT JOIN crm2_staff s ON s.user_id=u.id AND s.tenant=? WHERE u.id=?`,
    )
    .bind(tenant, userId)
    .first<{ email: string | null; zalo: string }>();
  if (!u) return;
  const base = {
    subject,
    body,
    kind: 'crm2',
    audience: 'staff' as const,
    leadId: null,
    customerId: null,
  };
  const messages = [
    ...(u.email ? [{ ...base, ukey, channel: 'email' as const, recipient: u.email }] : []),
    // The same notice on Zalo when the person gave their Zalo ID (sent only once the OA is configured).
    ...(u.zalo
      ? [{ ...base, ukey: ukey + ':zalo', channel: 'zalo' as const, recipient: u.zalo }]
      : []),
  ];
  if (messages.length) await enqueue(tenant, messages, now).catch(() => undefined);
}
