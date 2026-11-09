import { authorize, sendResult, httpError, sameOrigin } from '../../../app/auth-session';
import { originOf, requestNow } from '../../../lib/server/http';
import type { Permission } from '../../../lib/auth/permissions';
import type { Ctx, Result } from './store';

/**
 * Wraps a CRM route: signs the caller in, checks the permission (and the request origin for writes),
 * reads a small JSON body and hands a context to the handler.
 */
export function crmRoute(
  perm: { read: Permission; write: Permission },
  handler: (c: Ctx, req: Request, body: Record<string, unknown>) => Promise<Result | Response>,
) {
  const run = async (req: Request, write: boolean) => {
    // Read the body before any early reply: leaving it unread can upset the worker runtime.
    const raw = write ? await req.text().catch(() => '') : '';
    if (write && !sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
    const { auth, response } = await authorize(write ? perm.write : perm.read);
    if (response) return response;
    let body: Record<string, unknown> = {};
    if (write) {
      try {
        if (raw.length > 20_000) return httpError('Yêu cầu quá lớn', 413);
        const v = JSON.parse(raw) as unknown;
        if (!v || typeof v !== 'object' || Array.isArray(v))
          return httpError('Dữ liệu không hợp lệ');
        body = v as Record<string, unknown>;
      } catch {
        return httpError('Dữ liệu không hợp lệ');
      }
    }
    const ctx: Ctx = {
      tenant: auth.tenant,
      userId: auth.userId,
      role: auth.role,
      now: requestNow(req),
      base: originOf(req),
    };
    try {
      const out = await handler(ctx, req, body);
      return out instanceof Response ? out : sendResult(out);
    } catch (e) {
      console.error('crm2', e);
      return httpError('Không thể xử lý yêu cầu. Vui lòng thử lại.', 500);
    }
  };
  return {
    GET: (req: Request) => run(req, false),
    POST: (req: Request) => run(req, true),
  };
}
