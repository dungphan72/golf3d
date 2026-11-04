import { z } from 'zod';

/** Prefix of the transfer note customers must include so a payment can be matched to a bill. */
export const CODE_PREFIX = 'SGG';

/** Payment code for a booking: stable, short, easy to type in a banking app. */
export function paymentCode(bookingId: string) {
  return (
    CODE_PREFIX +
    bookingId
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase()
  );
}
/** Finds a payment code inside a free-text transfer note (banks strip spaces and punctuation). */
export function extractCode(content: string) {
  const match = content.toUpperCase().match(new RegExp(CODE_PREFIX + '[A-Z0-9]{8}'));
  return match ? match[0] : null;
}

/** VietQR image (img.vietqr.io) for a fixed amount and note; no API key needed. */
export function vietQrUrl(opts: {
  bin: string;
  account: string;
  holder: string;
  amount: number;
  note: string;
}) {
  const query = new URLSearchParams({
    amount: String(opts.amount),
    addInfo: opts.note,
    accountName: opts.holder,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(opts.bin)}-${encodeURIComponent(opts.account)}-compact2.png?${query}`;
}

/** SePay webhook payload (https://docs.sepay.vn). Only money coming in is processed. */
export const sepayPayload = z
  .object({
    id: z.union([z.number(), z.string()]),
    gateway: z.string().max(100).optional(),
    transactionDate: z.string().max(40).optional(),
    accountNumber: z.string().max(40).default(''),
    code: z.string().max(100).nullable().optional(),
    content: z.string().max(500).default(''),
    transferType: z.string().max(10),
    transferAmount: z.number(),
    accumulated: z.number().optional(),
    subAccount: z.string().max(100).nullable().optional(),
    referenceCode: z.string().max(100).nullable().optional(),
    description: z.string().max(1000).optional(),
  })
  .passthrough();
export type SepayPayload = z.infer<typeof sepayPayload>;

/** SePay sends times as "YYYY-MM-DD HH:mm:ss" in Vietnam time. */
export function parseSepayTime(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const ms = Date.parse(value.replace(' ', 'T') + '+07:00');
  return Number.isFinite(ms) ? ms : fallback;
}

export const bankInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set-key'), key: z.string().min(16).max(200) }).strict(),
  z.object({ action: z.literal('clear-key') }).strict(),
  z.object({ action: z.literal('ignore'), id: z.string().max(100) }).strict(),
]);
export type BankInput = z.infer<typeof bankInput>;
