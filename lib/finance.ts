import { z } from 'zod';
const money = z.number().int().min(0).max(1_000_000_000_000);
const requestId = z
  .string()
  .min(16)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
const id = z.string().min(1).max(100);
export const financeInput = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('open'),
      requestId,
      name: z.string().trim().min(2).max(80),
      openingCash: money,
    })
    .strict(),
  z
    .object({
      action: z.literal('cash-entry'),
      requestId,
      shiftId: id,
      kind: z.enum(['cash_in', 'cash_out']),
      amount: money.refine((n) => n > 0),
      note: z.string().trim().min(3).max(300),
    })
    .strict(),
  z
    .object({
      action: z.literal('pay'),
      requestId,
      bookingId: id,
      method: z.enum(['cash', 'transfer', 'card']),
      expectedAmount: money,
      // A bank transfer already received through SePay that this payment consumes (transfer only).
      bankTxId: id.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('close'),
      shiftId: id,
      expectedVersion: z.number().int().min(0),
      countedCash: money,
      countedTransfer: money,
      countedCard: money,
      note: z.string().trim().max(500),
    })
    .strict(),
]);
export type Shift = {
  id: string;
  tenant: string;
  name: string;
  status: 'open' | 'closed';
  opened_by: string;
  opened_at: number;
  opening_cash: number;
  version: number;
  closed_by: string | null;
  closed_at: number | null;
  counted_cash: number | null;
  counted_transfer: number | null;
  counted_card: number | null;
  expected_cash: number | null;
  expected_transfer: number | null;
  expected_card: number | null;
  note: string | null;
};
export type Entry = {
  id: string;
  tenant: string;
  shift_id: string;
  kind: 'payment' | 'cash_in' | 'cash_out';
  method: 'cash' | 'transfer' | 'card';
  amount: number;
  booking_id: string | null;
  request_id: string;
  note: string;
  actor: string;
  created: number;
};
export type Totals = {
  openingCash: number;
  cashReceived: number;
  transferReceived: number;
  cardReceived: number;
  cashIn: number;
  cashOut: number;
};
export type ShiftSummary = Shift & {
  cash_received: number;
  transfer_received: number;
  card_received: number;
  cash_in: number;
  cash_out: number;
  entry_count: number;
};
export function shiftTotals(shift: ShiftSummary): Totals {
  return {
    openingCash: shift.opening_cash,
    cashReceived: shift.cash_received,
    transferReceived: shift.transfer_received,
    cardReceived: shift.card_received,
    cashIn: shift.cash_in,
    cashOut: shift.cash_out,
  };
}
export function reconciliation(
  t: Totals,
  counted: { cash: number; transfer: number; card: number },
) {
  const expectedCash = t.openingCash + t.cashReceived + t.cashIn - t.cashOut;
  const receipts = t.cashReceived + t.transferReceived + t.cardReceived;
  if ([...Object.values(t), ...Object.values(counted), expectedCash].some((n) => n < 0))
    throw new Error('Số tiền đối soát không hợp lệ');
  if (
    ![...Object.values(t), ...Object.values(counted), expectedCash, receipts].every(
      Number.isSafeInteger,
    )
  )
    throw new Error('Số tiền vượt giới hạn tính toán an toàn');
  return {
    expectedCash,
    expectedTransfer: t.transferReceived,
    expectedCard: t.cardReceived,
    cashDifference: counted.cash - expectedCash,
    transferDifference: counted.transfer - t.transferReceived,
    cardDifference: counted.card - t.cardReceived,
    receipts,
  };
}
export function operationKey() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  );
}
export async function scopedShiftId(tenant: string, key: string) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(tenant + '\0' + key),
  );
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
export function matchesEntry(
  old: Entry,
  input: Extract<z.infer<typeof financeInput>, { action: 'pay' | 'cash-entry' }>,
  coveredByPackage = 0,
) {
  return input.action === 'pay'
    ? old.kind === 'payment' &&
        old.booking_id === input.bookingId &&
        old.method === input.method &&
        old.amount === input.expectedAmount - coveredByPackage
    : old.shift_id === input.shiftId &&
        old.kind === input.kind &&
        old.amount === input.amount &&
        old.note === input.note;
}
