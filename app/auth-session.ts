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
  if (!can(auth.role, permission))
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
  return !origin || origin === new URL(request.url).origin;
}
export { sendResult, httpError };
