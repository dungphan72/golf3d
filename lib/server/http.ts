import { env } from 'cloudflare:workers';
import type { ServiceResult } from './common';

/** Maps a framework-agnostic service result to an HTTP response. */
export const sendResult = (r: ServiceResult) =>
  Response.json(r.body, {
    status: r.status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
export const httpError = (message: string, status = 400) =>
  sendResult({ status, body: { error: message } });

/**
 * Address of the caller for rate limits. Behind Cloudflare `cf-connecting-ip` is set by the edge and
 * cannot be forged. Only the end-to-end test server (TRUST_FORWARDED_IP=1, never set in production)
 * trusts `x-forwarded-for`, so tests can act as different visitors.
 */
export function clientIp(req: Request) {
  const e = env as unknown as Record<string, unknown>;
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const trusted = String(e.TRUST_FORWARDED_IP ?? '') === '1';
  // TRUST_PROXY=1: the app only listens on localhost behind our own nginx, which sets X-Real-IP itself. Without it
  // every visitor looked like "unknown" and shared one rate-limit bucket (one spammer could block all bookings).
  const behindProxy = String(e.TRUST_PROXY ?? '') === '1';
  if (trusted && forwarded) return forwarded;
  if (behindProxy) {
    // Our own nginx overwrites X-Real-IP; `cf-connecting-ip` is NOT trusted here because without Cloudflare in front
    // any client can send it and dodge every rate limit. A proxy appends the real peer last in X-Forwarded-For.
    const last = req.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
    return req.headers.get('x-real-ip')?.trim() || last || 'unknown';
  }
  return req.headers.get('cf-connecting-ip') || 'unknown';
}

/**
 * The public address used for links in notifications. PUBLIC_BASE_URL wins when set: behind a reverse proxy the URL
 * the Node server sees is http://127.0.0.1:port, which would put a dead link in every message.
 */
export const originOf = (req: Request) => {
  const configured = String((env as unknown as Record<string, unknown>).PUBLIC_BASE_URL ?? '').trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* fall through to the request's own origin */
    }
  }
  return new URL(req.url).origin;
};

/**
 * "Now" for time-dependent flows. The end-to-end test server (TRUST_FORWARDED_IP=1) lets tests move
 * the clock with `x-e2e-now` to exercise the 5-minute call deadline; real deployments ignore it.
 */
export function requestNow(req: Request) {
  const trusted =
    String((env as unknown as Record<string, unknown>).TRUST_FORWARDED_IP ?? '') === '1';
  const header = Number(req.headers.get('x-e2e-now'));
  return trusted && Number.isFinite(header) && header > 0 ? header : Date.now();
}
