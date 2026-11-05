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
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const trusted =
    String((env as unknown as Record<string, unknown>).TRUST_FORWARDED_IP ?? '') === '1';
  return (trusted && forwarded) || req.headers.get('cf-connecting-ip') || forwarded || 'unknown';
}
