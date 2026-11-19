import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from './chatgpt-auth';
import {
  SESSION_COOKIE,
  SESSION_SECONDS,
  userFromSession,
  type AuthUser,
} from '../lib/server/auth-service';
import { can, type Permission } from '../lib/auth/permissions';
import { sendResult, httpError } from '../lib/server/http';

/**
 * While hosted on OpenAI Sites the platform injects a trusted identity header. Anywhere else that
 * header is attacker-controlled (anyone can send it and become the owner), so it is trusted only
 * when a deployment explicitly sets ENABLE_SITES_IDENTITY=1 and does not set DISABLE_SITES_IDENTITY.
 */
export function sitesIdentityEnabled() {
  const vars = env as unknown as Record<string, unknown>;
  const on = (v: unknown) => v === '1' || v === 1 || v === 'true' || v === true;
  return on(vars.ENABLE_SITES_IDENTITY) && !on(vars.DISABLE_SITES_IDENTITY);
}

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getAuth(): Promise<AuthUser | null> {
  const token = await sessionToken();
  if (token) {
    const user = await userFromSession(token);
    if (user) return user;
  }
  if (!sitesIdentityEnabled()) return null;
  const site = await getChatGPTUser();
  if (!site) return null;
  return {
    userId: site.userId,
    tenant: site.userId,
    role: 'owner',
    name: site.displayName,
    email: site.email,
    mustChange: false,
    via: 'sites',
  };
}

/** Resolves the signed-in user and checks a permission; otherwise returns the HTTP error to send. */
export async function authorize(
  permission: Permission,
): Promise<{ auth: AuthUser; response?: undefined } | { auth?: undefined; response: Response }> {
  const auth = await getAuth();
  if (!auth) return { response: httpError('Vui lòng đăng nhập', 401) };
  if (auth.mustChange) return { response: httpError('Hãy đổi mật khẩu tạm thời trước', 403) };
  if (!can(auth, permission))
    return { response: httpError('Bạn không có quyền thực hiện thao tác này', 403) };
  return { auth };
}

export async function authorizeAny(
  ...permissions: Permission[]
): Promise<{ auth: AuthUser; response?: undefined } | { auth?: undefined; response: Response }> {
  const auth = await getAuth();
  if (!auth) return { response: httpError('Vui lòng đăng nhập', 401) };
  if (auth.mustChange) return { response: httpError('Hãy đổi mật khẩu tạm thời trước', 403) };
  if (!permissions.some((p) => can(auth, p)))
    return { response: httpError('Bạn không có quyền thực hiện thao tác này', 403) };
  return { auth };
}

export function sessionCookie(token: string, request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`;
}
export const clearedCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) {
    // Non-browser clients send neither header. A browser always labels a cross-site request, so refuse those.
    const site = request.headers.get('sec-fetch-site');
    return !site || site === 'same-origin' || site === 'none';
  }

  try {
    const reqUrl = new URL(request.url);
    if (origin === reqUrl.origin) return true;

    // Behind reverse proxy (Nginx, Cloudflare): compare with Host or X-Forwarded-Host
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto =
      request.headers.get('x-forwarded-proto') || reqUrl.protocol.replace(':', '') || 'https';
    if (host) {
      if (
        origin === `${proto}://${host}` ||
        origin === `https://${host}` ||
        origin === `http://${host}`
      ) {
        return true;
      }
      const originHost = new URL(origin).host;
      if (originHost === host || originHost === host.split(':')[0]) {
        return true;
      }
    }

    // Known domain whitelist
    const originHostname = new URL(origin).hostname;
    const allowed = [
      'sigolf.vn',
      'www.sigolf.vn',
      'golfhub.cloud',
      'www.golfhub.cloud',
      '3dgolf.vn',
      'www.3dgolf.vn',
    ];
    if (allowed.includes(originHostname)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
export { sendResult, httpError };
