import { isManager } from '../core/access';
import { defaultLayout, sanitizeLayout, type DashLayout } from '../core/dashboard';
import { getRuntime, reply, setRuntime, type Ctx, type Result } from './store';

const key = (userId: string) => `dashboard:${userId}`;

/** A person's saved overview layout (kept in crm2_runtime, no extra table), cleaned for their role. */
export async function loadLayout(c: Ctx): Promise<DashLayout> {
  const saved = await getRuntime<unknown>(c.tenant, key(c.userId)).catch(() => null);
  return saved ? sanitizeLayout(saved.value, isManager(c.role)) : defaultLayout(isManager(c.role));
}

export async function saveLayout(c: Ctx, body: Record<string, unknown>): Promise<Result> {
  const layout = body.reset === true
    ? defaultLayout(isManager(c.role))
    : sanitizeLayout(body, isManager(c.role));
  await setRuntime(c.tenant, key(c.userId), layout, c.now);
  return reply({ ok: true, layout });
}
