import { db } from './common';
import { tokenId } from '../auth/password';

/**
 * Failure counters per caller address, kept in D1 (table member_attempts, shared with the member
 * portal). Addresses are stored hashed. Used to slow down password guessing and webhook floods.
 */
const HOUR_MS = 3_600_000;

export async function recentAttempts(kind: string, ip: string, windowMs: number) {
  const row = await db()
    .prepare('SELECT COUNT(*) AS n FROM member_attempts WHERE kind=? AND ip_hash=? AND created>?')
    .bind(kind, await tokenId('ip:' + ip), Date.now() - windowMs)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function noteAttempt(kind: string, ip: string, subject = '') {
  const now = Date.now();
  await db()
    .prepare('INSERT INTO member_attempts(id,kind,ip_hash,subject,created) VALUES (?,?,?,?,?)')
    .bind(crypto.randomUUID(), kind, await tokenId('ip:' + ip), subject, now)
    .run();
  // Opportunistic cleanup keeps the table small.
  await db()
    .prepare('DELETE FROM member_attempts WHERE created<?')
    .bind(now - 24 * HOUR_MS)
    .run();
}

/** True (and records the call) when this address went over `max` calls of `kind` in the window. */
export async function overLimit(kind: string, ip: string, windowMs: number, max: number) {
  if (ip === 'unknown') return false;
  if ((await recentAttempts(kind, ip, windowMs)) >= max) return true;
  await noteAttempt(kind, ip);
  return false;
}

/** Constant-time string comparison for shared secrets. */
export function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
