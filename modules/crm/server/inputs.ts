import { z } from 'zod';
import { CALL_RESULTS } from '../core/calls';
import { STAGES } from '../core/stages';

const id = z.string().min(1).max(100);
const text = (max: number) => z.string().trim().max(max);
const money = z.number().int().min(0).max(10_000_000_000);

export const leadActions = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('create'),
      fullName: text(100).min(1),
      phone: text(30).default(''),
      email: text(200).default(''),
      notes: text(2000).default(''),
      source: text(100).default('Nhập tay'),
      targetService: text(255).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('result'),
      id,
      result: z.enum(CALL_RESULTS),
      when: z.number().int().positive().optional(),
      note: text(600).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('stage'),
      id,
      stage: z.enum(STAGES),
      statusId: text(60).optional(),
      lostReason: text(255).optional(),
      dealValue: money.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('edit'),
      id,
      fullName: text(255).optional(),
      email: text(255).optional(),
      notes: text(2000).optional(),
      targetService: text(255).optional(),
      budget: money.optional(),
      labels: z.array(text(40)).max(20).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('note'),
      id,
      type: z.enum(['NOTE', 'CALL', 'ZALO', 'EMAIL', 'VISIT']).default('NOTE'),
      content: text(2000).min(1),
    })
    .strict(),
  z.object({ action: z.literal('claim'), ids: z.array(id).min(1).max(50) }).strict(),
  z.object({ action: z.literal('assign'), ids: z.array(id).min(1).max(100), userId: id }).strict(),
  z
    .object({
      action: z.literal('recall'),
      ids: z.array(id).min(1).max(200),
      reason: text(255).min(2),
    })
    .strict(),
]);

export const taskActions = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('create'),
      leadId: id.nullable().optional(),
      title: text(150).min(2),
      days: z.number().int().min(0).max(365).default(0),
      assignee: id.optional(),
    })
    .strict(),
  z.object({ action: z.literal('done'), id }).strict(),
  // Care tasks (for customers, not leads)
  z
    .object({
      action: z.literal('care-done'),
      id,
      channel: z.enum(['call', 'zalo', 'sms', 'visit', 'email']),
      note: text(600).default(''),
    })
    .strict(),
  z.object({ action: z.literal('care-skip'), id, reason: text(600).min(2) }).strict(),
  z
    .object({ action: z.literal('care-snooze'), id, days: z.number().int().min(1).max(60) })
    .strict(),
  z.object({ action: z.literal('care-claim'), id }).strict(),
]);

export const apptActions = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('create'),
      leadId: id,
      at: z.number().int().positive(),
      service: text(255).optional(),
      note: text(1000).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('status'),
      id,
      status: z.enum(['CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED']),
    })
    .strict(),
]);

export const salesActions = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('product'),
      code: text(60)
        .min(1)
        .regex(/^[A-Za-z0-9_-]+$/),
      name: text(150).min(1),
      listPrice: money,
      limited: z.boolean().default(false),
      active: z.boolean().default(true),
    })
    .strict(),
  z
    .object({
      action: z.literal('hold'),
      leadId: id,
      productCode: text(60).min(1),
      hours: z.number().int().min(1).max(336).optional(),
      note: text(500).optional(),
    })
    .strict(),
  z.object({ action: z.literal('release'), id }).strict(),
  z
    .object({
      action: z.literal('deposit'),
      id,
      amount: z.number().int().positive().max(10_000_000_000),
    })
    .strict(),
  z
    .object({
      action: z.literal('order'),
      leadId: id,
      productCode: text(60).min(1),
      price: money.optional(),
      discount: money.default(0),
      note: text(500).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('order-action'),
      id,
      op: z.enum(['pay', 'addRow', 'removeRow', 'schedule', 'cancel', 'won']),
      paymentId: id.optional(),
      amount: z.number().int().positive().optional(),
      method: text(40).optional(),
      label: text(80).optional(),
      dueDate: text(10).optional(),
      installments: z.number().int().optional(),
      firstDue: text(10).optional(),
      intervalDays: z.number().int().optional(),
      reason: text(300).optional(),
    })
    .strict(),
]);

export const profileInput = z
  .object({
    phone: text(30).min(5),
    birthday: z
      .string()
      .regex(/^(\d{4}-[01]\d-[0-3]\d|[01]\d-[0-3]\d|)$/)
      .optional(),
    gender: text(10).optional(),
    occupation: text(80).optional(),
    interests: z.array(text(40)).max(20).optional(),
    note: text(500).optional(),
  })
  .strict();

export const intakeInput = z
  .object({
    fullName: text(100).min(1),
    phone: text(30).min(8),
    email: text(200).default(''),
    notes: text(1000).default(''),
    targetService: text(255).default(''),
    preferredDate: text(100).default(''),
    preferredTime: text(100).default(''),
    consent: z.literal(true),
    website: z.string().max(0).default(''), // honeypot
  })
  .strict();
