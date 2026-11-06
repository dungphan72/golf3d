import { db, type ServiceResult } from './common';
import { configuredFor, sendEmail, sendZalo } from './providers';

type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });

export type Msg = {
  /** One message per event and channel, even when the flow runs again. */
  ukey: string;
  channel: 'email' | 'zalo';
  recipient: string;
  subject: string;
  body: string;
  kind: string;
  audience: 'staff' | 'customer';
  leadId?: string | null;
  customerId?: string | null;
  sendAt?: number;
};

const MAX_ATTEMPTS = 3;
const STAFF_EXPIRES_MS = 24 * 3_600_000;

/** Queues messages (INSERT OR IGNORE on the unique key). Returns how many were new. */
export async function enqueue(tenant: string, msgs: Msg[], now = Date.now()) {
  const ready = msgs.filter((m) => m.recipient.trim() && m.body.trim());
  if (!ready.length) return 0;
  const d = db();
  const results = await d.batch(
    ready.map((m) =>
      d
        .prepare(
          "INSERT OR IGNORE INTO crm_outbox(id,tenant,ukey,channel,recipient,subject,body,kind,audience,lead_id,customer_id,send_at,status,attempts,last_error,created,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',0,'',?,NULL)",
        )
        .bind(
          crypto.randomUUID(),
          tenant,
          m.ukey,
          m.channel,
          m.recipient.trim(),
          m.subject.slice(0, 200),
          m.body.slice(0, 4000),
          m.kind,
          m.audience,
          m.leadId ?? null,
          m.customerId ?? null,
          m.sendAt ?? now,
          now,
        ),
    ),
  );
  return results.reduce((n, r) => n + (r.meta.changes ? 1 : 0), 0);
}

/** Cancels messages that are no longer wanted (for example a reminder of a cancelled booking). */
export async function cancelPending(tenant: string, ukeyPrefix: string) {
  await db()
    .prepare(
      "UPDATE crm_outbox SET status='cancelled' WHERE tenant=? AND status='pending' AND ukey LIKE ?",
    )
    .bind(tenant, ukeyPrefix.replace(/[%_]/g, '') + '%')
    .run();
}

type Row = {
  id: string;
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  audience: string;
  attempts: number;
  created: number;
};

/**
 * Sends what is due. Channels that are not configured leave their messages pending (they go out once
 * configured, unless a staff alert is more than a day old). A claim on `attempts` makes sure two
 * concurrent runs never send the same message twice.
 */
export async function dispatchDue(tenant: string, now = Date.now(), limit = 25) {
  const d = db();
  const rows = (
    await d
      .prepare(
        "SELECT id,channel,recipient,subject,body,audience,attempts,created FROM crm_outbox WHERE tenant=? AND status='pending' AND send_at<=? ORDER BY send_at LIMIT ?",
      )
      .bind(tenant, now, limit)
      .all<Row>()
  ).results;
  let sent = 0;
  for (const m of rows) {
    if (m.audience === 'staff' && now - m.created > STAFF_EXPIRES_MS) {
      await d
        .prepare("UPDATE crm_outbox SET status='expired' WHERE id=? AND status='pending'")
        .bind(m.id)
        .run();
      continue;
    }
    if (!configuredFor(m.channel)) continue;
    const claim = await d
      .prepare(
        "UPDATE crm_outbox SET attempts=attempts+1 WHERE id=? AND status='pending' AND attempts=?",
      )
      .bind(m.id, m.attempts)
      .run();
    if (!claim.meta.changes) continue; // another run took it
    try {
      if (m.channel === 'email')
        await sendEmail(m.recipient, m.subject || 'Saigon Golf 3D Club', m.body);
      else await sendZalo(m.recipient, m.body);
      await d
        .prepare(
          "UPDATE crm_outbox SET status='sent',sent_at=?,last_error='' WHERE id=? AND status='pending'",
        )
        .bind(now, m.id)
        .run();
      sent++;
    } catch (e) {
      const failed = m.attempts + 1 >= MAX_ATTEMPTS;
      await d
        .prepare("UPDATE crm_outbox SET status=?,last_error=? WHERE id=? AND status='pending'")
        .bind(
          failed ? 'failed' : 'pending',
          (e instanceof Error ? e.message : String(e)).slice(0, 300),
          m.id,
        )
        .run();
    }
  }
  return sent;
}

/** Counts per channel and status, plus what is waiting for a channel that is not configured. */
export async function outboxSummary(tenant: string, recipient = '', kind = ''): Promise<R> {
  const rows = (
    await db()
      .prepare(
        'SELECT channel,audience,status,COUNT(*) AS n FROM crm_outbox WHERE tenant=? AND created>? GROUP BY channel,audience,status',
      )
      .bind(tenant, Date.now() - 7 * 86_400_000)
      .all<{ channel: string; audience: string; status: string; n: number }>()
  ).results;
  const recent = (
    await db()
      .prepare(
        "SELECT id,channel,audience,kind,recipient,subject,body,lead_id,status,attempts,last_error,created,sent_at,send_at FROM crm_outbox WHERE tenant=? AND (?='' OR recipient LIKE ?) AND (?='' OR kind=?) ORDER BY created DESC LIMIT 150",
      )
      .bind(tenant, recipient, `%${recipient.replace(/[%_]/g, '')}%`, kind, kind)
      .all()
  ).results;
  return reply({ counts: rows, recent });
}
