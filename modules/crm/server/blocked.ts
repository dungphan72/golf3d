import { audit, db } from '../../../lib/server/common';
import { isManager } from '../core/access';
import { MIN_DEDUP_DIGITS, normalizePhone } from '../core/phone';
import { fail, reply, type Ctx, type Result } from './store';

/**
 * Blocked numbers: spam, competitors, staff test numbers. A lead from a blocked number is dropped silently at intake
 * (the sender learns nothing). Managers only.
 */
export async function blockedList(c: Ctx): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý xem danh sách số bị chặn', 403);
  const rows = (
    await db()
      .prepare(
        `SELECT b.phone_norm AS phone,b.reason,b.created,COALESCE(u.name,'') AS addedBy
         FROM crm2_blocked_phones b LEFT JOIN users u ON u.id=b.added_by
         WHERE b.tenant=? ORDER BY b.created DESC LIMIT 500`,
      )
      .bind(c.tenant)
      .all()
  ).results;
  return reply({ rows });
}

export async function blockedAct(c: Ctx, body: Record<string, unknown>): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý được sửa danh sách số bị chặn', 403);
  const phone = normalizePhone(String(body.phone ?? ''));
  if (phone.length < MIN_DEDUP_DIGITS || phone.length > 15) return fail('Số điện thoại không hợp lệ');
  if (body.action === 'add') {
    const reason = String(body.reason ?? '').trim().slice(0, 200);
    const r = await db()
      .prepare(
        'INSERT OR IGNORE INTO crm2_blocked_phones(tenant,phone_norm,reason,added_by,created) VALUES (?,?,?,?,?)',
      )
      .bind(c.tenant, phone, reason, c.userId, c.now)
      .run();
    if (!r.meta.changes) return fail('Số này đã nằm trong danh sách chặn', 409);
    await audit(c.tenant, 'crm.block', `Chặn số ${phone}${reason ? ': ' + reason : ''}`);
    return reply({ ok: true });
  }
  if (body.action === 'remove') {
    const r = await db()
      .prepare('DELETE FROM crm2_blocked_phones WHERE tenant=? AND phone_norm=?')
      .bind(c.tenant, phone)
      .run();
    if (!r.meta.changes) return fail('Không tìm thấy số này', 404);
    await audit(c.tenant, 'crm.unblock', `Bỏ chặn số ${phone}`);
    return reply({ ok: true });
  }
  return fail('Thao tác không hợp lệ');
}
