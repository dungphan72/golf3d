import { db, ok, fail, type ServiceResult } from './common';
import { tenantBySlug } from './online-service';
import { pushToTenant } from './webpush';
import { rooms } from '../club';

export const CALL_KINDS = [
  'Nhân viên hỗ trợ',
  'Hỗ trợ thiết bị',
  'Gọi đồ uống',
  'Tính tiền / thanh toán',
] as const;
const MAX_OPEN_PER_SESSION = 6;

/** A guest at a line rings the bell. Only a line with a running session can ring, and repeats are merged. */
export async function ringBell(slug: string, roomId: string, kind: string): Promise<ServiceResult> {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return fail('Không tìm thấy line', 404);
  if (!(CALL_KINDS as readonly string[]).includes(kind)) return fail('Loại yêu cầu không hợp lệ');
  const site = await tenantBySlug(slug);
  if (!site) return fail('Không tìm thấy cơ sở', 404);
  const tenant = site.tenant;
  const session = await db()
    .prepare(
      "SELECT id FROM bookings WHERE tenant=? AND room=? AND status IN ('playing','paused') ORDER BY started DESC LIMIT 1",
    )
    .bind(tenant, roomId)
    .first<{ id: string }>();
  if (!session)
    return fail('Line này chưa có phiên đang chơi. Vui lòng nhờ nhân viên tại quầy.', 409);
  const open = (
    await db()
      .prepare("SELECT id,kind FROM requests WHERE tenant=? AND booking=? AND status!='done'")
      .bind(tenant, session.id)
      .all<{ id: string; kind: string }>()
  ).results;
  const same = open.find((r) => r.kind === kind);
  if (same) return ok({ id: same.id, repeated: true });
  if (open.length >= MAX_OPEN_PER_SESSION)
    return fail('Đã có nhiều yêu cầu đang chờ, nhân viên sẽ đến ngay.', 429);
  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO requests VALUES (?,?,?,?,'new',?)")
    .bind(id, tenant, session.id, kind, Date.now())
    .run();
  await pushToTenant(tenant, {
    title: `🔔 ${room.name} gọi phục vụ`,
    body: kind,
    url: '/quan-ly',
  });
  return ok({ id });
}

/** What the guest sees after ringing: only the status of their own request. */
export async function bellStatus(slug: string, id: string): Promise<ServiceResult> {
  const site = await tenantBySlug(slug);
  if (!site) return fail('Không tìm thấy cơ sở', 404);
  const row = await db()
    .prepare('SELECT status,kind FROM requests WHERE tenant=? AND id=?')
    .bind(site.tenant, id)
    .first<{ status: string; kind: string }>();
  return row ? ok(row) : fail('Không tìm thấy yêu cầu', 404);
}

/** Public facts for the bell page: the line name and whether it can ring right now. */
export async function bellInfo(slug: string, roomId: string): Promise<ServiceResult> {
  const room = rooms.find((r) => r.id === roomId);
  const site = room ? await tenantBySlug(slug) : null;
  if (!room || !site) return fail('Không tìm thấy line', 404);
  const session = await db()
    .prepare(
      "SELECT id FROM bookings WHERE tenant=? AND room=? AND status IN ('playing','paused') LIMIT 1",
    )
    .bind(site.tenant, roomId)
    .first();
  return ok({ room: room.name, active: !!session, kinds: CALL_KINDS });
}
