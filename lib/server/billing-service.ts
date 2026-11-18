import { db, type ServiceResult } from './common';
import type { BillInfo, BillingInput } from '../billing';
import { scopedShiftId } from '../finance';
import { emitEvent } from '../../modules/crm/server/event-bus';
import { makeEventKey } from '../../modules/crm/core/events';

type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);

const ERRORS: [string, string, number][] = [
  ['SHIFT_NOT_OPEN', 'Hãy mở ca trước khi hoàn tiền', 409],
  [
    'REFUND_NOT_ALLOWED',
    'Không hoàn được: phiếu chưa thanh toán, hoặc số tiền hoàn vượt số đã thu bằng hình thức này',
    409,
  ],
  ['INSUFFICIENT_CASH', 'Tiền mặt trong két không đủ để hoàn', 409],
  [
    'BOOKING_NOT_DISCOUNTABLE',
    'Chỉ giảm giá được phiếu đã kết thúc, chưa thu tiền, chưa trả bằng gói, và mức giảm nhỏ hơn tiền chơi',
    409,
  ],
  ['INVALID_DISCOUNT', 'Mức giảm hoặc lý do không hợp lệ', 400],
  ['bill_discount_once', 'Phiếu này đã được giảm giá', 409],
  ['bill_discounts.tenant, bill_discounts.booking_id', 'Phiếu này đã được giảm giá', 409],
  ['finance_request_once', 'Mã yêu cầu đã dùng cho thao tác khác', 409],
];

function explain(e: unknown): R {
  const message = e instanceof Error ? e.message : String(e);
  for (const [needle, text, status] of ERRORS)
    if (message.includes(needle)) return error(text, status);
  console.error('billing operation', e);
  return error('Chưa xác minh được kết quả. Tải lại phiếu trước khi thử tiếp.', 500);
}

/** Discount, payments and refunds of one bill, for the receipt and the refund dialog. */
export async function loadBill(tenant: string, bookingId: string): Promise<R> {
  try {
    const d = db();
    const [discount, payments, refunds] = await Promise.all([
      d
        .prepare(
          'SELECT amount,reason,actor,created FROM bill_discounts WHERE tenant=? AND booking_id=?',
        )
        .bind(tenant, bookingId)
        .first<NonNullable<BillInfo['discount']>>(),
      d
        .prepare(
          "SELECT method,amount,created FROM finance_entries WHERE tenant=? AND booking_id=? AND kind='payment' ORDER BY created",
        )
        .bind(tenant, bookingId)
        .all<BillInfo['payments'][number]>(),
      d
        .prepare(
          "SELECT id,method,amount,note,actor,created FROM finance_entries WHERE tenant=? AND booking_id=? AND kind='refund' ORDER BY created",
        )
        .bind(tenant, bookingId)
        .all<BillInfo['refunds'][number]>(),
    ]);
    const bill: BillInfo = {
      discount: discount ?? null,
      payments: payments.results,
      refunds: refunds.results,
      paid: payments.results.reduce((n, p) => n + p.amount, 0),
      refunded: refunds.results.reduce((n, p) => n + p.amount, 0),
    };
    return reply({ bill });
  } catch (e) {
    console.error('bill load', e);
    return error('Chưa tải được chi tiết phiếu. Kiểm tra migration 0014.', 503);
  }
}

export async function applyBilling(tenant: string, actor: string, input: BillingInput): Promise<R> {
  const d = db();
  const now = Date.now();
  try {
    if (input.action === 'discount') {
      await d
        .prepare(
          'INSERT INTO bill_discounts(id,tenant,booking_id,amount,reason,actor,created) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(crypto.randomUUID(), tenant, input.bookingId, input.amount, input.reason, actor, now)
        .run();
      return reply({ ok: true });
    }
    const key = 'refund-' + input.requestId;
    const old = await d
      .prepare(
        'SELECT booking_id,method,amount FROM finance_entries WHERE tenant=? AND request_id=?',
      )
      .bind(tenant, key)
      .first<{ booking_id: string; method: string; amount: number }>();
    if (old)
      return old.booking_id === input.bookingId &&
        old.method === input.method &&
        old.amount === input.amount
        ? reply({ ok: true, replayed: true })
        : error('Mã yêu cầu đã dùng cho thao tác khác', 409);
    const shift = await d
      .prepare("SELECT id FROM shifts WHERE tenant=? AND status='open'")
      .bind(tenant)
      .first<{ id: string }>();
    if (!shift) return error('Hãy mở ca trước khi hoàn tiền', 409);
    await d
      .prepare(
        "INSERT INTO finance_entries(id,tenant,shift_id,kind,method,amount,booking_id,request_id,note,actor,created,part) VALUES (?,?,?,'refund',?,?,?,?,?,?,?,2)",
      )
      .bind(
        await scopedShiftId(tenant, key),
        tenant,
        shift.id,
        input.method,
        input.amount,
        input.bookingId,
        key,
        input.reason,
        actor,
        now,
      )
      .run();
    emitEvent({
      id: crypto.randomUUID(),
      type: 'pos.refund.completed',
      tenant,
      source: 'pos',
      actor,
      timestamp: now,
      idempotencyKey: makeEventKey('pos.refund.completed', tenant, input.bookingId, key),
      data: {
        bookingId: input.bookingId,
        method: input.method,
        amount: input.amount,
        reason: input.reason,
        requestId: key,
      },
    }).catch(() => {});
    return reply({ ok: true });
  } catch (e) {
    return explain(e);
  }
}
