import { z } from 'zod';

const requestId = z
  .string()
  .min(16)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
const id = z.string().min(1).max(100);

export const coachingInput = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('coach-save'),
      id: id.optional(),
      name: z.string().trim().min(2).max(100),
      phone: z.string().trim().max(20).default(''),
      userId: id.nullable().default(null),
      active: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal('lesson-create'),
      requestId,
      coachId: id,
      customerName: z.string().trim().min(2).max(100),
      phone: z.string().trim().min(8).max(20),
      start: z.number().int(),
      minutes: z.number().int().min(15).max(480),
      price: z.number().int().min(0).max(1_000_000_000).nullable().default(null),
      note: z.string().trim().max(500).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('lesson-reschedule'),
      id,
      coachId: id,
      start: z.number().int(),
      minutes: z.number().int().min(15).max(480),
      note: z.string().trim().max(500).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('lesson-status'),
      id,
      status: z.enum(['done', 'cancelled', 'no_show']),
      coachNote: z.string().trim().max(500).default(''),
    })
    .strict(),
  z
    .object({ action: z.literal('lesson-note'), id, coachNote: z.string().trim().max(500) })
    .strict(),
]);
export type CoachingInput = z.infer<typeof coachingInput>;

export const LESSON_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Đã đặt',
  done: 'Đã dạy',
  cancelled: 'Đã hủy',
  no_show: 'Học viên vắng',
};
