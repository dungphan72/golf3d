import { z } from 'zod';

/**
 * Must stay identical to the SQL normalisation in migration 0005 (strip space - ( ) .,
 * +84xxxxxxxxx and 84xxxxxxxxx -> 0xxxxxxxxx).
 */
export function normalizePhone(input: string) {
  const d = input.replace(/[ \-().]/g, '');
  if (d.startsWith('+84')) return '0' + d.slice(3);
  if (d.startsWith('84') && d.length >= 11) return '0' + d.slice(2);
  return d;
}
export const validPhone = (phone: string) => /^0[0-9]{8,10}$/.test(phone);

export const GRANT_KINDS = ['holes9', 'holes18', 'gdr'] as const;
export type GrantKind = (typeof GRANT_KINDS)[number];
export const KIND_LABELS: Record<GrantKind, string> = {
  holes9: 'Lượt 9 hố',
  holes18: 'Lượt 18 hố',
  gdr: 'Giờ chơi',
};
export type Grant = { kind: GrantKind; qty: number };
export const UNLIMITED = 99_999; // period passes: effectively unlimited uses within the validity

export const kindForService = (service: string): GrantKind | null =>
  service === '9' ? 'holes9' : service === '18' ? 'holes18' : service === 'gdr' ? 'gdr' : null;

const requestId = z
  .string()
  .min(16)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
const id = z.string().min(1).max(100);
const grants = z
  .array(z.object({ kind: z.enum(GRANT_KINDS), qty: z.number().int().min(1).max(UNLIMITED) }))
  .min(1)
  .max(3);

export const memberInput = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('customer-create'),
      name: z.string().trim().min(2).max(100),
      phone: z.string().max(30),
      note: z.string().trim().max(300).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('customer-update'),
      id,
      name: z.string().trim().min(2).max(100),
      note: z.string().trim().max(300).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('type-save'),
      id: id.optional(),
      requestId,
      name: z.string().trim().min(2).max(100),
      price: z.number().int().min(1).max(1_000_000_000),
      grants,
      validDays: z.number().int().min(1).max(3660),
      perks: z.string().trim().max(300).default(''),
      section: z.string().trim().max(60).default(''),
      room: z.enum(['any', 'standard', 'vip']).default('any'),
      active: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal('types-seed') }).strict(),
  z.object({ action: z.literal('account-verify'), customerId: id }).strict(),
  z.object({ action: z.literal('account-reset'), customerId: id }).strict(),
  z
    .object({
      action: z.literal('sell'),
      requestId,
      customerId: id,
      typeId: id,
      method: z.enum(['cash', 'transfer', 'card']),
    })
    .strict(),
  z.object({ action: z.literal('redeem'), bookingId: id, packageId: id }).strict(),
  z
    .object({
      action: z.literal('adjust'),
      requestId,
      packageId: id,
      kind: z.enum(GRANT_KINDS),
      delta: z
        .number()
        .int()
        .min(-1000)
        .max(1000)
        .refine((n) => n !== 0),
      note: z.string().trim().min(3).max(300),
    })
    .strict(),
  z
    .object({
      action: z.literal('points-redeem'),
      requestId,
      customerId: id,
      service: z.enum(['9', '18']),
    })
    .strict(),
]);
export type MemberInput = z.infer<typeof memberInput>;

export const POINTS_PER_FREE_ROUND = 10;
export const FREE_ROUND_VALID_DAYS = 90;
