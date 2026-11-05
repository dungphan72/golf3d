import { env } from 'cloudflare:workers';

/**
 * Optional Cloudflare Turnstile bot check for the public booking form.
 * Enabled only when both TURNSTILE_SITE_KEY (variable) and TURNSTILE_SECRET (secret) are set;
 * otherwise the honeypot and per-IP rate limits remain the only protection.
 */
export const turnstileSiteKey = () =>
  env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET ? env.TURNSTILE_SITE_KEY : null;

export async function turnstilePasses(token: unknown, ip: string): Promise<boolean> {
  if (!turnstileSiteKey()) return true;
  if (typeof token !== 'string' || token.length < 10 || token.length > 2100) return false;
  try {
    const form = new FormData();
    form.set('secret', env.TURNSTILE_SECRET as string);
    form.set('response', token);
    if (ip !== 'unknown') form.set('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    return ((await r.json()) as { success?: boolean }).success === true;
  } catch (e) {
    console.error('turnstile verify', e);
    return false; // fail closed: staff still take bookings by phone
  }
}
