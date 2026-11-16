import { z } from 'zod';
const id = z.string().min(1).max(100),
  requestId = z
    .string()
    .min(16)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/);
const itemFields = {
  name: z.string().trim().min(2).max(100),
  category: z.enum(['food', 'drink', 'other']),
  unit: z.string().trim().min(1).max(20),
  price: z.number().int().min(1).max(100000000),
  feeBps: z.number().int().min(0).max(10000),
  vatBps: z.number().int().min(0).max(10000),
  active: z.boolean(),
};
export const fnbInput = z
  .discriminatedUnion('action', [
    z.object({ action: z.literal('item-create'), requestId, ...itemFields }).strict(),
    z
      .object({
        action: z.literal('item-update'),
        id,
        expectedVersion: z.number().int().min(0),
        ...itemFields,
      })
      .strict(),
    z
      .object({
        action: z.literal('item-delete'),
        id,
      })
      .strict(),
    z
      .object({
        action: z.literal('order'),
        requestId,
        bookingId: id,
        note: z.string().trim().max(300),
        lines: z
          .array(
            z
              .object({
                itemId: id,
                qty: z.number().int().min(1).max(99),
                expectedVersion: z.number().int().min(0),
              })
              .strict(),
          )
          .min(1)
          .max(10),
      })
      .strict(),
    z
      .object({
        action: z.literal('transition'),
        id,
        expectedVersion: z.number().int().min(0),
        status: z.enum(['preparing', 'ready', 'served', 'cancelled']),
        reason: z.string().trim().max(300),
      })
      .strict(),
  ])
  .superRefine((v, ctx) => {
    if (v.action === 'order' && new Set(v.lines.map((l) => l.itemId)).size !== v.lines.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lines'],
        message: 'Mỗi món chỉ xuất hiện một lần trong đơn',
      });
    if (v.action === 'transition' && v.status === 'cancelled' && v.reason.length < 5)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Hủy món cần lý do ít nhất 5 ký tự',
      });
  });
export type MenuItem = {
  id: string;
  tenant: string;
  name: string;
  category: 'food' | 'drink' | 'other';
  unit: string;
  price: number;
  fee_bps: number;
  vat_bps: number;
  active: number;
  version: number;
  created: number;
  stock_enabled?: number;
  available?: number;
};
export type FoodLine = {
  stockTracked?: boolean;
  itemId: string;
  name: string;
  unit: string;
  category: string;
  price: number;
  qty: number;
  version: number;
  feeBps: number;
  vatBps: number;
  subtotal: number;
  fee: number;
  vat: number;
  total: number;
};
export type FoodOrder = {
  id: string;
  tenant: string;
  booking_id: string;
  request_id: string;
  request_data: string;
  items: string;
  subtotal: number;
  fee: number;
  vat: number;
  total: number;
  note: string;
  status: 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';
  version: number;
  actor: string;
  created: number;
  updated: number;
  reason: string;
  room?: string;
};
export type FoodData = { menu: MenuItem[]; orders: FoodOrder[] };
export const foodLabels = {
  new: 'Chờ tiếp nhận',
  preparing: 'Đang chuẩn bị',
  ready: 'Sẵn sàng phục vụ',
  served: 'Đã phục vụ',
  cancelled: 'Đã hủy',
};
export function lineQuote(price: number, qty: number, feeBps: number, vatBps: number) {
  if (
    !Number.isSafeInteger(price) ||
    price < 1 ||
    price > 100000000 ||
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > 99 ||
    ![feeBps, vatBps].every((n) => Number.isInteger(n) && n >= 0 && n <= 10000)
  )
    throw Error('Giá, số lượng hoặc thuế/phí không hợp lệ');
  const base = BigInt(price) * BigInt(qty),
    fee = (base * BigInt(feeBps) + 5000n) / 10000n,
    vat = ((base + fee) * BigInt(vatBps) + 5000n) / 10000n;
  return {
    subtotal: Number(base),
    fee: Number(fee),
    vat: Number(vat),
    total: Number(base + fee + vat),
  };
}
export function orderQuote(
  lines: { price: number; qty: number; feeBps: number; vatBps: number }[],
) {
  if (!lines.length || lines.length > 10) throw Error('Đơn cần từ 1 đến 10 món');
  return lines.reduce(
    (sum, line) => {
      const q = lineQuote(line.price, line.qty, line.feeBps, line.vatBps);
      return {
        subtotal: sum.subtotal + q.subtotal,
        fee: sum.fee + q.fee,
        vat: sum.vat + q.vat,
        total: sum.total + q.total,
      };
    },
    { subtotal: 0, fee: 0, vat: 0, total: 0 },
  );
}
export function orderFingerprint(v: {
  bookingId: string;
  note: string;
  lines: { itemId: string; qty: number; expectedVersion: number }[];
}) {
  return JSON.stringify({
    bookingId: v.bookingId,
    note: v.note,
    lines: [...v.lines].sort((a, b) => a.itemId.localeCompare(b.itemId)),
  });
}
