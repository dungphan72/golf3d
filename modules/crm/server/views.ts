import { addView, sanitizeViews, type LeadView } from '../core/views';
import { fail, getRuntime, reply, setRuntime, type Ctx, type Result } from './store';

const key = (userId: string) => `leadviews:${userId}`;

async function load(c: Ctx): Promise<LeadView[]> {
  const saved = await getRuntime<unknown>(c.tenant, key(c.userId)).catch(() => null);
  return sanitizeViews(saved?.value);
}

/** A person's saved lead-list filters. Each person only ever sees and changes their own. */
export async function listViews(c: Ctx): Promise<Result> {
  return reply({ views: await load(c) });
}

export async function changeViews(c: Ctx, body: Record<string, unknown>): Promise<Result> {
  const views = await load(c);
  if (body.action === 'save') {
    const name = String(body.name ?? '').trim();
    if (name.length < 2) return fail('Hãy đặt tên cho chế độ xem');
    const next = addView(
      views,
      { name, stage: String(body.stage ?? ''), q: String(body.q ?? '') },
      crypto.randomUUID().slice(0, 8),
    );
    await setRuntime(c.tenant, key(c.userId), next, c.now);
    return reply({ ok: true, views: next });
  }
  if (body.action === 'delete') {
    const next = views.filter((v) => v.id !== String(body.id ?? ''));
    if (next.length === views.length) return fail('Không tìm thấy chế độ xem', 404);
    await setRuntime(c.tenant, key(c.userId), next, c.now);
    return reply({ ok: true, views: next });
  }
  return fail('Thao tác không hợp lệ');
}
