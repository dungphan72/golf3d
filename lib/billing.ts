import { z } from 'zod';

const money = z.number().int().min(1).max(1_000_000_000);
const requestId = z
  .string()
  .min(16)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
const id = z.string().min(1).max(100);

/** Discounts on a finished unpaid bill and refunds of a paid one. Both need a written reason. */
export const billingInput = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('discount'),
      bookingId: id,
      amount: money,
      reason: z.string().trim().min(3).max(300),
    })
    .strict(),
  z
    .object({
      action: z.literal('refund'),
      requestId,
      bookingId: id,
      method: z.enum(['cash', 'transfer', 'card']),
      amount: money,
      reason: z.string().trim().min(3).max(300),
    })
    .strict(),
]);
export type BillingInput = z.infer<typeof billingInput>;

export type BillInfo = {
  discount: { amount: number; reason: string; actor: string; created: number } | null;
  payments: { method: 'cash' | 'transfer' | 'card'; amount: number; created: number }[];
  refunds: {
    id: string;
    method: 'cash' | 'transfer' | 'card';
    amount: number;
    note: string;
    actor: string;
    created: number;
  }[];
  paid: number;
  refunded: number;
};

/** Discount from a percentage of the amount still due, rounded to the nearest 1.000đ. */
export const discountFromPercent = (amount: number, percent: number) =>
  Math.min(amount - 1, Math.round((amount * percent) / 100 / 1000) * 1000);

/** Cash handed back to a customer who paid more than the bill. */
export const changeDue = (tendered: number, due: number) => Math.max(0, tendered - due);
