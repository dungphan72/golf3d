import { db, type ServiceResult } from './common';
import {
  type fnbInput,
  lineQuote,
  orderQuote,
  orderFingerprint,
  type MenuItem,
  type FoodOrder,
  type FoodLine,
} from '../fnb';
import { scopedShiftId } from '../finance';
import {
  CREATE_ITEM_SQL,
  UPDATE_ITEM_SQL,
  CREATE_ORDER_SQL,
  TRANSITION_ORDER_SQL,
} from '../fnb-sql';
import type { z } from 'zod';
type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);

export type FnbInput = z.infer<typeof fnbInput>;
export async function loadFnb(tenant: string, booking: string | null): Promise<R> {
  try {
    if (
      booking &&
      !(await db()
        .prepare('SELECT id FROM bookings WHERE tenant=? AND id=?')
        .bind(tenant, booking)
        .first())
    )
      return error('Không tìm thấy phiên', 404);
    const menu = (
      await db()
        .prepare(
          'SELECT m.*,CASE WHEN s.low_level IS NULL THEN 0 ELSE 1 END AS stock_enabled,s.on_hand-s.reserved AS available FROM menu_items m JOIN stock_status s ON s.id=m.id AND s.tenant=m.tenant WHERE m.tenant=? ORDER BY m.active DESC,m.category,m.name LIMIT 500',
        )
        .bind(tenant)
        .all<MenuItem>()
    ).results;
    const orders = booking
      ? (
          await db()
            .prepare(
              'SELECT o.*,b.room FROM food_orders o JOIN bookings b ON b.id=o.booking_id AND b.tenant=o.tenant WHERE o.tenant=? AND o.booking_id=? ORDER BY o.created,o.id LIMIT 100',
            )
            .bind(tenant, booking)
            .all<FoodOrder>()
        ).results
      : (
          await db()
            .prepare(
              "SELECT o.*,b.room FROM food_orders o JOIN bookings b ON b.id=o.booking_id AND b.tenant=o.tenant WHERE o.tenant=? ORDER BY CASE WHEN o.status IN ('new','preparing','ready') THEN 0 ELSE 1 END,o.created DESC,o.id LIMIT 200",
            )
            .bind(tenant)
            .all<FoodOrder>()
        ).results;
    return reply({ menu, orders });
  } catch (e) {
    console.error('F&B load', e);
    return error('Chưa tải được thực đơn và đơn món. Kiểm tra migration mới.', 503);
  }
}
export async function applyFnb(tenant: string, input: FnbInput): Promise<R> {
  const now = Date.now();
  const replay = async () => {
    if (input.action === 'order') {
      const old = await db()
        .prepare('SELECT request_data FROM food_orders WHERE tenant=? AND request_id=?')
        .bind(tenant, input.requestId)
        .first<{ request_data: string }>();
      if (old)
        return old.request_data === orderFingerprint(input)
          ? reply({ ok: true, replayed: true })
          : error('Mã yêu cầu đã dùng với đơn khác', 409);
    }
    if (input.action === 'item-create') {
      const item = await db()
        .prepare('SELECT * FROM menu_items WHERE tenant=? AND id=?')
        .bind(tenant, await scopedShiftId(tenant, 'menu-' + input.requestId))
        .first<MenuItem>();
      if (item)
        return item.name === input.name &&
          item.price === input.price &&
          item.category === input.category &&
          item.unit === input.unit &&
          item.fee_bps === input.feeBps &&
          item.vat_bps === input.vatBps &&
          item.active === Number(input.active)
          ? reply({ ok: true, replayed: true })
          : error('Mã yêu cầu đã dùng với món khác', 409);
    }
    return null;
  };
  try {
    const old = await replay();
    if (old) return old;
    if (input.action === 'item-create') {
      await db()
        .prepare(CREATE_ITEM_SQL)
        .bind(
          await scopedShiftId(tenant, 'menu-' + input.requestId),
          tenant,
          input.name,
          input.category,
          input.unit,
          input.price,
          input.feeBps,
          input.vatBps,
          Number(input.active),
          now,
        )
        .run();
      return reply({ ok: true });
    }
    if (input.action === 'item-update') {
      const result = await db()
        .prepare(UPDATE_ITEM_SQL)
        .bind(
          input.name,
          input.category,
          input.unit,
          input.price,
          input.feeBps,
          input.vatBps,
          Number(input.active),
          tenant,
          input.id,
          input.expectedVersion,
        )
        .run();
      return result.meta.changes
        ? reply({ ok: true })
        : error('Món vừa thay đổi. Tải lại trước khi sửa.', 409);
    }
    if (input.action === 'order') {
      const items: FoodLine[] = [];
      for (const line of input.lines) {
        const item = await db()
          .prepare(
            'SELECT m.*,CASE WHEN s.low_level IS NULL THEN 0 ELSE 1 END AS stock_enabled,s.on_hand-s.reserved AS available FROM menu_items m JOIN stock_status s ON s.id=m.id AND s.tenant=m.tenant WHERE m.tenant=? AND m.id=? AND m.active=1',
          )
          .bind(tenant, line.itemId)
          .first<MenuItem>();
        if (!item || item.version !== line.expectedVersion)
          return error('Thực đơn vừa thay đổi. Kiểm tra lại món và giá.', 409);
        items.push({
          stockTracked: !!item.stock_enabled,
          itemId: item.id,
          name: item.name,
          unit: item.unit,
          category: item.category,
          price: item.price,
          qty: line.qty,
          version: item.version,
          feeBps: item.fee_bps,
          vatBps: item.vat_bps,
          ...lineQuote(item.price, line.qty, item.fee_bps, item.vat_bps),
        });
      }
      const q = orderQuote(items);
      await db()
        .prepare(CREATE_ORDER_SQL)
        .bind(
          crypto.randomUUID(),
          tenant,
          input.bookingId,
          input.requestId,
          orderFingerprint(input),
          JSON.stringify(items),
          q.subtotal,
          q.fee,
          q.vat,
          q.total,
          input.note,
          tenant,
          now,
          now,
        )
        .run();
      return reply({ ok: true });
    }
    const current = await db()
      .prepare('SELECT * FROM food_orders WHERE tenant=? AND id=?')
      .bind(tenant, input.id)
      .first<FoodOrder>();
    if (!current) return error('Không tìm thấy đơn món', 404);
    if (
      current.status === input.status &&
      current.version === input.expectedVersion + 1 &&
      current.reason === input.reason
    )
      return reply({ ok: true, replayed: true });
    const updated = await db()
      .prepare(TRANSITION_ORDER_SQL)
      .bind(input.status, input.reason, now, tenant, input.id, input.expectedVersion)
      .run();
    return updated.meta.changes
      ? reply({ ok: true })
      : error('Đơn vừa thay đổi. Tải lại trước khi thao tác.', 409);
  } catch (e) {
    try {
      const previous = await replay();
      if (previous) return previous;
    } catch {
      /* retain original failure */
    }
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('STOCK_UNAVAILABLE'))
      return error('Không đủ hàng khả dụng. Tải lại thực đơn trước khi gọi món.', 409);
    if (message.includes('STOCK_UNIT_LOCKED'))
      return error('Món đã theo dõi kho không được đổi đơn vị. Hãy tạo mã món mới.', 409);
    if (message.includes('MENU_CHANGED'))
      return error('Món hoặc giá vừa thay đổi; tải lại thực đơn.', 409);
    if (message.includes('SESSION_NOT_ORDERABLE'))
      return error(
        'Chỉ gọi món trong phiên đang chơi; không thay đổi đơn của phiếu đã thanh toán.',
        409,
      );
    if (message.includes('ORDER_ALREADY_FINAL') || message.includes('INVALID_ORDER_TRANSITION'))
      return error('Trạng thái đơn không phù hợp hoặc vừa được xử lý ở thiết bị khác.', 409);
    if (message.includes('ORDER_LIMIT'))
      return error(
        'Đã đạt giới hạn đơn hoặc tổng tiền của phiên. Hãy xử lý các đơn đang chờ.',
        409,
      );
    if (message.includes('MENU_LIMIT')) return error('Thực đơn đã đạt 500 món.', 409);
    console.error('F&B write', e);
    return error('Chưa xác minh được kết quả. Tải lại đơn món trước khi thử tiếp.', 500);
  }
}
