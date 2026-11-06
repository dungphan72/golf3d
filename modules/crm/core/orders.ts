/**
 * Sales orders ("booking" in the original spec): a customer buys a service or package, with a
 * payment schedule and outstanding balance. Money is whole dong.
 */
export type PayStatus = 'PLANNED' | 'PARTIAL' | 'PAID' | 'CANCELLED';
export type PayRow = {
  amount: number;
  paidAmount: number;
  dueDate: string | null; // YYYY-MM-DD, Vietnam date
  status: PayStatus;
};

export const orderCode = (year: number, seq: number) => `BK${year}-${String(seq).padStart(4, '0')}`;

export const CANCEL_WINDOW_DAYS = 30;
export type CancelRight = { allowed: boolean; needsOwner: boolean };
/** Owner always; manager within 30 days of creation; nobody else. */
export function canCancelOrder(role: string, createdAt: number, now: number): CancelRight {
  const late = now - createdAt > CANCEL_WINDOW_DAYS * 86_400_000;
  if (role === 'owner') return { allowed: true, needsOwner: late };
  if (role === 'manager') return { allowed: !late, needsOwner: late };
  return { allowed: false, needsOwner: false };
}

const VN = 7 * 3_600_000;
export const vnDate = (t: number) => new Date(t + VN).toISOString().slice(0, 10);

export type OrderSummary = {
  paid: number;
  outstanding: number;
  scheduled: number;
  overdue: number;
  overdueCount: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  /** Part of the price that is in no schedule row, so nobody will be reminded of it. */
  unscheduled: number;
  percentPaid: number;
};
export function summarizeOrder(price: number, rows: PayRow[], now: number): OrderSummary {
  const live = rows.filter((r) => r.status !== 'CANCELLED');
  const today = vnDate(now);
  const paid = live.reduce((a, r) => a + r.paidAmount, 0);
  let scheduled = 0;
  let overdue = 0;
  let overdueCount = 0;
  let nextDueDate: string | null = null;
  let nextDueAmount = 0;
  for (const r of live) {
    const left = Math.max(0, r.amount - r.paidAmount);
    if (!left) continue;
    scheduled += left;
    if (r.dueDate && r.dueDate < today) {
      overdue += left;
      overdueCount++;
    } else if (r.dueDate && (nextDueDate == null || r.dueDate < nextDueDate)) {
      nextDueDate = r.dueDate;
      nextDueAmount = left;
    } else if (r.dueDate && r.dueDate === nextDueDate) nextDueAmount += left;
  }
  const total = live.reduce((a, r) => a + r.amount, 0);
  return {
    paid,
    outstanding: Math.max(0, price - paid),
    scheduled,
    overdue,
    overdueCount,
    nextDueDate,
    nextDueAmount,
    unscheduled: Math.max(0, price - total),
    percentPaid: price > 0 ? Math.min(100, Math.round((paid / price) * 1000) / 10) : 0,
  };
}

export type ScheduleRow = { label: string; amount: number; dueDate: string };
export function buildSchedule(o: {
  remaining: number;
  installments: number;
  firstDue: string;
  intervalDays: number;
}): ScheduleRow[] | { error: string } {
  if (!(o.remaining > 0)) return { error: 'Không còn số tiền nào cần lên lịch' };
  if (!Number.isInteger(o.installments) || o.installments < 1 || o.installments > 36)
    return { error: 'Số đợt từ 1 đến 36' };
  const first = /^\d{4}-\d{2}-\d{2}$/.test(o.firstDue)
    ? Date.parse(o.firstDue + 'T00:00:00Z')
    : NaN;
  if (!Number.isFinite(first)) return { error: 'Ngày đến hạn đầu tiên không hợp lệ' };
  if (!Number.isInteger(o.intervalDays) || o.intervalDays < 1 || o.intervalDays > 365)
    return { error: 'Khoảng cách giữa các đợt từ 1 đến 365 ngày' };
  const n = o.installments;
  const each = Math.floor(o.remaining / n);
  const rows: ScheduleRow[] = [];
  for (let k = 0; k < n; k++) {
    const last = k === n - 1;
    rows.push({
      label: last && n > 1 ? 'Thanh toán cuối' : `Đợt ${k + 1}`,
      amount: last ? o.remaining - each * (n - 1) : each,
      dueDate: new Date(first + o.intervalDays * k * 86_400_000).toISOString().slice(0, 10),
    });
  }
  return rows;
}

/** A payment may not be zero, above what the row still owes, or above what the order still owes. */
export function validatePayment(o: {
  amount: number;
  rowLeft: number;
  orderLeft: number;
}): string | null {
  if (!Number.isInteger(o.amount) || o.amount <= 0) return 'Số tiền phải lớn hơn 0';
  if (o.amount > o.rowLeft) return 'Số tiền vượt phần còn phải thu của đợt này';
  if (o.amount > o.orderLeft) return 'Số tiền vượt phần còn phải thu của đơn';
  return null;
}

export const payStatusAfter = (amount: number, paid: number): PayStatus =>
  paid >= amount ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PLANNED';
