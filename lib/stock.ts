import { z } from 'zod';
const itemId = z.string().min(1).max(100);
export const stockInput = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('configure'),
      itemId,
      lowLevel: z.number().int().min(0).max(1000000),
    })
    .strict(),
  z
    .object({
      action: z.literal('move'),
      requestId: z
        .string()
        .min(16)
        .max(100)
        .regex(/^[A-Za-z0-9_-]+$/),
      itemId,
      kind: z.enum(['receipt', 'adjust_in', 'adjust_out']),
      qty: z.number().int().min(1).max(1000000),
      note: z.string().trim().min(5).max(300),
    })
    .strict(),
]);
export function availableStock(onHand: number, reserved: number) {
  if (
    !Number.isSafeInteger(onHand) ||
    !Number.isSafeInteger(reserved) ||
    reserved < 0 ||
    onHand < reserved
  )
    throw Error('Invalid stock balance');
  return onHand - reserved;
}
export function movementSignature(v: { itemId: string; kind: string; qty: number; note: string }) {
  return JSON.stringify([v.itemId, v.kind, v.qty, v.note]);
}
export type StockItem = {
  id: string;
  name: string;
  unit: string;
  low_level: number | null;
  on_hand: number;
  reserved: number;
  available: number;
};
export type StockMovement = {
  id: string;
  item_id: string;
  item_name: string;
  unit: string;
  kind: string;
  qty: number;
  delta: number;
  note: string;
  created: number;
};
