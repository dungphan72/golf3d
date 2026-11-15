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

/** Supported NAPAS banks mapped to SePay bank codes (https://my.sepay.vn). */
export const SEPAY_BANKS: { bin: string; code: string; sepayCode: string; name: string }[] = [
  { bin: '970422', code: 'MB', sepayCode: 'MBBank', name: 'MBBank (Quân Đội)' },
  { bin: '970436', code: 'VCB', sepayCode: 'Vietcombank', name: 'Vietcombank (Ngoại Thương)' },
  { bin: '970407', code: 'TCB', sepayCode: 'Techcombank', name: 'Techcombank (Kỹ Thương)' },
  { bin: '970415', code: 'CTG', sepayCode: 'VietinBank', name: 'VietinBank (Công Thương)' },
  { bin: '970418', code: 'BIDV', sepayCode: 'BIDV', name: 'BIDV (Đầu Tư & Phát Triển)' },
  { bin: '970416', code: 'ACB', sepayCode: 'ACB', name: 'ACB (Á Châu)' },
  { bin: '970432', code: 'VPB', sepayCode: 'VPBank', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { bin: '970423', code: 'TPB', sepayCode: 'TPBank', name: 'TPBank (Tiên Phong)' },
  { bin: '970403', code: 'STB', sepayCode: 'Sacombank', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { bin: '970441', code: 'VIB', sepayCode: 'VIB', name: 'VIB (Quốc Tế)' },
  { bin: '970437', code: 'HDB', sepayCode: 'HDBank', name: 'HDBank (Phát Triển TP.HCM)' },
  { bin: '970448', code: 'OCB', sepayCode: 'OCB', name: 'OCB (Phương Đông)' },
  { bin: '970426', code: 'MSB', sepayCode: 'MSB', name: 'MSB (Hàng Hải)' },
  { bin: '970443', code: 'SHB', sepayCode: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)' },
  { bin: '970431', code: 'EIB', sepayCode: 'Eximbank', name: 'Eximbank (Xuất Nhập Khẩu)' },
];

/** SePay dynamic QR image URL (https://qr.sepay.vn) synced with https://my.sepay.vn. */
export function sepayQrUrl(opts: {
  bin: string;
  account: string;
  holder?: string;
  amount: number;
  note: string;
}) {
  const bankObj = SEPAY_BANKS.find((b) => b.bin === opts.bin || b.sepayCode === opts.bin);
  const bankParam = bankObj ? bankObj.sepayCode : opts.bin;
  const query = new URLSearchParams({
    acc: opts.account,
    bank: bankParam,
    amount: String(Math.max(0, Math.round(opts.amount))),
    des: opts.note,
    template: 'compact',
  });
  return `https://qr.sepay.vn/img?${query.toString()}`;
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
  z
    .object({
      action: z.literal('simulate-tx'),
      amount: z.number().int().min(1000).max(1_000_000_000),
      content: z.string().trim().min(3).max(200),
      account: z.string().trim().max(40).default('0877834888'),
    })
    .strict(),
]);
export type BankInput = z.infer<typeof bankInput>;
