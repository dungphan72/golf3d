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
    /** Seats on one line, 1-4 (used when `guests` is left empty). */
    people: z.number().int().min(1).max(4).default(1),
    /** Total guests typed by the customer (groups, tournaments); 0 = not given. */
    guests: z.number().int().min(0).max(1000).default(0),
    start: z.number().int(),
    minutes: z.number().int().min(0).max(720).default(0),
    note: z.string().trim().max(300).default(''),
    /** The customer agreed to receive promotions (not needed for booking messages). */
    consent: z.boolean().default(false),
    website: z.string().max(0).default(''),
  })
  .strict();
export type PublicRequestInput = z.infer<typeof publicRequestInput>;

export const staffRequestInput = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('confirm'),
      id: z.string().max(100),
      room: z.string().max(30),
      // Groups of more than 4 need one room per line of 4.
      extraRooms: z.array(z.string().max(30)).max(11).default([]),
    })
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

/** A line holds 4 players: a bigger group is split over that many lines as evenly as possible. */
export const groupLines = (guests: number) => Math.max(1, Math.ceil(guests / 4));
export const lineSizes = (guests: number) => {
  const lines = groupLines(guests);
  return Array.from(
    { length: lines },
    (_, i) => Math.floor(guests / lines) + (i < guests % lines ? 1 : 0),
  );
};

export const codeLooksValid = (code: string) => /^[A-Za-z0-9_-]{30,64}$/.test(code);
