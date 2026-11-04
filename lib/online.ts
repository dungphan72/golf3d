import { z } from 'zod';

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,39}$/;
export const MIN_LEAD_MINUTES = 60;

/** Public, unauthenticated request. The `website` field is a honeypot and must stay empty. */
export const publicRequestInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(8).max(20),
    service: z.enum(['gdr', '9', '18']),
    vip: z.boolean().default(false),
    people: z.number().int().min(1).max(4),
    start: z.number().int(),
    minutes: z.number().int().min(0).max(720).default(0),
    note: z.string().trim().max(300).default(''),
    website: z.string().max(0).default(''),
  })
  .strict();
export type PublicRequestInput = z.infer<typeof publicRequestInput>;

export const staffRequestInput = z.discriminatedUnion('action', [
  z
    .object({ action: z.literal('confirm'), id: z.string().max(100), room: z.string().max(30) })
    .strict(),
  z
    .object({
      action: z.literal('reject'),
      id: z.string().max(100),
      reason: z.string().trim().min(3).max(300),
    })
    .strict(),
]);
export type StaffRequestInput = z.infer<typeof staffRequestInput>;

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Đang chờ nhân viên xác nhận',
  confirmed: 'Đã xác nhận lịch',
  rejected: 'Không thể sắp xếp',
  cancelled: 'Đã hủy',
};

export const codeLooksValid = (code: string) => /^[A-Za-z0-9_-]{30,64}$/.test(code);
