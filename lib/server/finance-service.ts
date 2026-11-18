import { db as database, type ServiceResult } from './common';
import {
  type financeInput,
  reconciliation,
  shiftTotals,
  scopedShiftId,
  matchesEntry,
  type Shift,
  type ShiftSummary,
  type Entry,
} from '../finance';
import {
  OPEN_SHIFT_SQL,
  INSERT_ENTRY_SQL,
  INSERT_PART_ENTRY_SQL,
  CLOSE_SHIFT_SQL,
  SHIFT_SUMMARY_SQL,
} from '../finance-sql';
import { USE_BANK_TX_SQL } from '../bank-sql';
import type { z } from 'zod';
import { emitEvent } from '../../modules/crm/server/event-bus';
import { makeEventKey } from '../../modules/crm/core/events';
type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);

export type FinanceInput = z.infer<typeof financeInput>;
async function summaries(tenant: string) {
  return (await database().prepare(SHIFT_SUMMARY_SQL).bind(tenant).all<ShiftSummary>()).results;
}
export async function loadFinance(tenant: string, selectedId: string | null): Promise<R> {
  try {
    const shifts = await summaries(tenant);

    const selected = selectedId
      ? shifts.find((s) => s.id === selectedId)
      : (shifts.find((s) => s.status === 'open') ?? shifts[0]);
    if (selectedId && !selected) return error('Không tìm thấy ca trong 30 ca gần nhất', 404);
    const entries = selected
      ? (
          await database()
            .prepare(
              'SELECT * FROM finance_entries WHERE tenant=? AND shift_id=? ORDER BY created DESC,id DESC LIMIT 101',
            )
            .bind(tenant, selected.id)
            .all<Entry>()
        ).results
      : [];
    return reply({
      shifts,
      selectedId: selected?.id ?? null,
      entries: entries.slice(0, 100),
      hasMore: entries.length > 100,
    });
  } catch (e) {
    console.error('Finance load failed', e);
    return error('Không tải được sổ ca. Kiểm tra database đã áp dụng migration mới.', 503);
  }
}
export async function applyFinance(tenant: string, actor: string, input: FinanceInput): Promise<R> {
  const now = Date.now(),
    db = database();
  const openingId = input.action === 'open' ? await scopedShiftId(tenant, input.requestId) : null;
  // Replays are scoped to the authenticated tenant and must match the original operation.
  async function coveredByPackage(bookingId: string | null) {
    if (!bookingId) return 0;
    const row = await db
      .prepare('SELECT covered FROM package_redemptions WHERE tenant=? AND booking_id=?')
      .bind(tenant, bookingId)
      .first<{ covered: number }>();
    return row?.covered ?? 0;
  }
  async function replay() {
    if (input.action === 'open') {
      const old = await db
        .prepare('SELECT * FROM shifts WHERE tenant=? AND id=?')
        .bind(tenant, openingId)
        .first<Shift>();
      if (!old) return null;
      return old.name === input.name && old.opening_cash === input.openingCash
        ? reply({ ok: true, replayed: true })
        : error('Mã yêu cầu đã dùng với dữ liệu khác', 409);
    }
    if (input.action === 'close' || input.action === 'pay-group') return null;
    if (input.action === 'pay-split') {
      const rows = (
        await db
          .prepare('SELECT * FROM finance_entries WHERE tenant=? AND request_id LIKE ?')
          .bind(tenant, input.requestId + '-%')
          .all<Entry>()
      ).results;
      if (!rows.length) return null;
      const same =
        rows.length === input.parts.length &&
        rows.every(
          (r) =>
            r.booking_id === input.bookingId &&
            input.parts.some((p) => p.method === r.method && p.amount === r.amount),
        );
      return same
        ? reply({ ok: true, replayed: true })
        : error('Mã yêu cầu đã dùng với dữ liệu khác', 409);
    }
    const old = await db
      .prepare('SELECT * FROM finance_entries WHERE tenant=? AND request_id=?')
      .bind(tenant, input.requestId)
      .first<Entry>();
    if (!old) return null;
    const matches = matchesEntry(old, input, await coveredByPackage(old.booking_id));
    return matches
      ? reply({ ok: true, replayed: true })
      : error('Mã yêu cầu đã dùng với dữ liệu khác', 409);
  }
  try {
    const previous = await replay();
    if (previous) return previous;
    if (input.action === 'open') {
      await db
        .prepare(OPEN_SHIFT_SQL)
        .bind(openingId, tenant, input.name, actor, now, input.openingCash)
        .run();
      return reply({ ok: true });
    }
    if (input.action === 'close') {
      const shift = (await summaries(tenant)).find((s) => s.id === input.shiftId);
      if (!shift) return error('Không tìm thấy ca', 404);
      if (shift.status === 'closed') {
        const same =
          shift.counted_cash === input.countedCash &&
          shift.counted_transfer === input.countedTransfer &&
          shift.counted_card === input.countedCard &&
          shift.note === input.note &&
          shift.version === input.expectedVersion + 1;
        return same
          ? reply({ ok: true, replayed: true })
          : error('Ca đã đóng và không được sửa', 409);
      }
      const result = reconciliation(shiftTotals(shift), {
        cash: input.countedCash,
        transfer: input.countedTransfer,
        card: input.countedCard,
      });
      if (
        [result.cashDifference, result.transferDifference, result.cardDifference].some(
          (n) => n !== 0,
        ) &&
        input.note.length < 5
      )
        return error('Cần ghi lý do chênh lệch ít nhất 5 ký tự');
      const updated = await db
        .prepare(CLOSE_SHIFT_SQL)
        .bind(
          actor,
          now,
          input.countedCash,
          input.countedTransfer,
          input.countedCard,
          result.expectedCash,
          result.expectedTransfer,
          result.expectedCard,
          input.note,
          tenant,
          shift.id,
          input.expectedVersion,
        )
        .run();
      if (!updated.meta.changes)
        return error('Sổ tiền vừa thay đổi. Tải lại và đối soát trước khi đóng ca.', 409);
      return reply({ ok: true });
    }
    if (input.action === 'cash-entry') {
      await db
        .prepare(INSERT_ENTRY_SQL)
        .bind(
          crypto.randomUUID(),
          tenant,
          input.shiftId,
          input.kind,
          'cash',
          input.amount,
          null,
          input.requestId,
          input.note,
          actor,
          now,
        )
        .run();
      return reply({ ok: true });
    }
    if (input.action === 'pay-group') {
      const ids = [...new Set(input.bookingIds)];
      if (ids.length !== input.bookingIds.length) return error('Phiếu bị chọn trùng', 400);
      const done = await db
        .prepare('SELECT COUNT(*) AS n FROM finance_entries WHERE tenant=? AND request_id LIKE ?')
        .bind(tenant, input.requestId + '-%')
        .first<{ n: number }>();
      if (done && done.n > 0) return reply({ ok: true, replayed: true });
      const rows = (
        await db
          .prepare(
            `SELECT id,status,amount FROM bookings WHERE tenant=? AND id IN (${ids.map(() => '?').join(',')})`,
          )
          .bind(tenant, ...ids)
          .all<{ id: string; status: string; amount: number | null }>()
      ).results;
      if (rows.length !== ids.length) return error('Không tìm thấy một số phiếu', 404);
      if (rows.some((r) => r.status !== 'finished' || r.amount == null || r.amount <= 0))
        return error(
          'Chỉ thu gộp các phiếu đã kết thúc, có số tiền hợp lệ và chưa thanh toán',
          409,
        );
      for (const r of rows)
        if ((await coveredByPackage(r.id)) > 0)
          return error('Có phiếu đã trừ gói; hãy thu riêng phiếu đó', 409);
      const total = rows.reduce((n, r) => n + (r.amount ?? 0), 0);
      if (total !== input.expectedTotal)
        return error(
          'Tổng các phiếu vừa thay đổi. Xem lại và nhận đủ tiền trước khi xác nhận.',
          409,
        );
      const open = await db
        .prepare("SELECT id FROM shifts WHERE tenant=? AND status='open'")
        .bind(tenant)
        .first<{ id: string }>();
      if (!open) return error('Hãy mở ca trước khi xác nhận thu tiền', 409);
      await db.batch(
        rows.map((r, i) =>
          db
            .prepare(INSERT_ENTRY_SQL)
            .bind(
              crypto.randomUUID(),
              tenant,
              open.id,
              'payment',
              input.method,
              r.amount,
              r.id,
              input.requestId + '-' + i,
              `Thu gộp ${rows.length} phiếu`,
              actor,
              now,
            ),
        ),
      );
      return reply({ ok: true, bookingIds: ids });
    }
    const booking = await db
      .prepare('SELECT id,status,amount,phone FROM bookings WHERE tenant=? AND id=?')
      .bind(tenant, input.bookingId)
      .first<{ id: string; status: string; amount: number | null; phone: string }>();
    if (!booking) return error('Không tìm thấy phiếu', 404);
    if (booking.status !== 'finished' || booking.amount == null || booking.amount <= 0)
      return error('Chỉ thu phiếu đã kết thúc, có số tiền hợp lệ và chưa thanh toán', 409);
    const discountRow = await db
      .prepare('SELECT amount FROM bill_discounts WHERE tenant=? AND booking_id=?')
      .bind(tenant, input.bookingId)
      .first<{ amount: number }>();
    const discount = discountRow?.amount ?? 0;
    const covered = await coveredByPackage(booking.id);
    const netDue = Math.max(0, booking.amount - covered - discount);
    if (netDue !== input.expectedAmount)
      return error('Tổng phiếu vừa thay đổi. Xem lại và nhận đủ tiền trước khi xác nhận.', 409);
    const shift = await db
      .prepare("SELECT id FROM shifts WHERE tenant=? AND status='open'")
      .bind(tenant)
      .first<{ id: string }>();
    if (!shift) return error('Hãy mở ca trước khi xác nhận thu tiền', 409);
    if (covered + discount >= booking.amount) return error('Phiếu đã được thanh toán đủ', 409);
    const due = netDue;
    if (input.action === 'pay-split') {
      const methods = new Set(input.parts.map((p) => p.method));
      if (methods.size !== input.parts.length)
        return error('Mỗi hình thức thanh toán chỉ được nhập một lần', 400);
      const total = input.parts.reduce((n, p) => n + p.amount, 0);
      if (total !== due)
        return error(`Tổng các phần (${total}) phải bằng số phải thu (${due})`, 400);
      const withTx = input.parts.filter((p) => p.bankTxId);
      if (withTx.length > 1 || withTx.some((p) => p.method !== 'transfer'))
        return error('Chỉ phần chuyển khoản mới gắn được giao dịch ngân hàng', 400);
      const statements = input.parts.map((p) =>
        db
          .prepare(INSERT_PART_ENTRY_SQL)
          .bind(
            crypto.randomUUID(),
            tenant,
            shift.id,
            p.method,
            p.amount,
            booking.id,
            input.requestId + '-' + p.method,
            'Thanh toán chia phiếu ' + booking.id,
            actor,
            now,
          ),
      );
      const linked = withTx[0];
      if (linked) {
        const tx = await db
          .prepare('SELECT amount,status FROM bank_transactions WHERE tenant=? AND id=?')
          .bind(tenant, linked.bankTxId)
          .first<{ amount: number; status: string }>();
        if (!tx || tx.status !== 'received')
          return error('Giao dịch ngân hàng không còn khả dụng', 409);
        if (tx.amount !== linked.amount)
          return error(
            `Số tiền chuyển khoản (${tx.amount}) khác phần chuyển khoản (${linked.amount})`,
            409,
          );
        statements.push(db.prepare(USE_BANK_TX_SQL).bind(booking.id, tenant, linked.bankTxId));
      }
      await db.batch(statements);
      emitEvent({
        id: crypto.randomUUID(),
        type: 'pos.payment.completed',
        tenant,
        source: 'pos',
        actor,
        timestamp: now,
        idempotencyKey: makeEventKey('pos.payment.completed', tenant, booking.id, input.requestId),
        phone: booking.phone,
        data: {
          bookingId: booking.id,
          method: 'mixed',
          amount: due,
          shiftId: shift.id,
          requestId: input.requestId,
        },
      }).catch(() => {});
      return reply({ ok: true });
    }
    const entry = db
      .prepare(INSERT_ENTRY_SQL)
      .bind(
        crypto.randomUUID(),
        tenant,
        shift.id,
        'payment',
        input.method,
        due,
        booking.id,
        input.requestId,
        'Thanh toán phiếu ' + booking.id,
        actor,
        now,
      );
    if (input.bankTxId) {
      // Staff confirm a transfer that the bank already reported: the entry and the transaction's
      // "used" mark are one atomic batch, and the amount must match exactly.
      if (input.method !== 'transfer')
        return error('Giao dịch ngân hàng chỉ dùng cho thanh toán chuyển khoản', 400);
      const tx = await db
        .prepare('SELECT amount,status FROM bank_transactions WHERE tenant=? AND id=?')
        .bind(tenant, input.bankTxId)
        .first<{ amount: number; status: string }>();
      if (!tx || tx.status !== 'received')
        return error('Giao dịch ngân hàng không còn khả dụng', 409);
      if (tx.amount !== due)
        return error(`Số tiền chuyển khoản (${tx.amount}) khác số phải thu (${due})`, 409);
      await db.batch([entry, db.prepare(USE_BANK_TX_SQL).bind(booking.id, tenant, input.bankTxId)]);
    } else {
      await entry.run();
    }
    emitEvent({
      id: crypto.randomUUID(),
      type: 'pos.payment.completed',
      tenant,
      source: 'pos',
      actor,
      timestamp: now,
      idempotencyKey: makeEventKey('pos.payment.completed', tenant, booking.id, input.requestId),
      phone: booking.phone,
      data: {
        bookingId: booking.id,
        method: input.method,
        amount: due,
        shiftId: shift.id,
        requestId: input.requestId,
      },
    }).catch(() => {});
    return reply({ ok: true });
  } catch (e) {
    // A parallel identical request may have committed after replay() first checked.
    try {
      const previous = await replay();
      if (previous) return previous;
    } catch {
      /* Preserve the original storage failure below. */
    }
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('UNSERVED_FOOD_ORDERS'))
      return error('Còn món chưa phục vụ hoặc hủy. Hãy xử lý đơn món trước khi thu tiền.', 409);
    if (message.includes('INSUFFICIENT_CASH'))
      return error('Số tiền chi vượt tiền mặt dự kiến trong quỹ', 409);
    if (message.includes('SHIFT_NOT_OPEN'))
      return error('Ca đã đóng hoặc không thuộc cơ sở. Tải lại trước khi thao tác.', 409);
    if (message.includes('one_open_shift_per_tenant') || message.includes('shifts.tenant'))
      return error('Đã có ca đang mở. Hãy đóng ca trước khi mở ca mới.', 409);
    if (
      message.includes('BOOKING_NOT_PAYABLE') ||
      message.includes('booking_paid_once') ||
      message.includes('booking_part_method_once') ||
      message.includes('finance_entries.booking_id')
    )
      return error('Phiếu đã được thanh toán hoặc vừa thay đổi ở thiết bị khác', 409);
    if (message.includes('RECONCILIATION_CHANGED'))
      return error('Số tiền đã thay đổi. Tải lại và đối soát lại.', 409);
    console.error('Finance operation failed', e);
    return error(
      'Chưa xác minh được kết quả ghi sổ. Hãy tải lại để kiểm tra trước khi thử tiếp.',
      500,
    );
  }
}
