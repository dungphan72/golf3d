import { z } from 'zod';
import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import {
  applyCustomerAction,
  careCustomerDetail,
  listCareCustomers,
} from '../../../../modules/crm/server/care-customers';
export const dynamic = 'force-dynamic';

const id = z.string().min(1).max(100);
const actions = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('customer-create'),
      name: z.string().trim().min(2).max(100),
      phone: z.string().trim().min(8).max(30),
      email: z.string().trim().max(200).optional(),
      birthday: z.string().trim().max(20).optional(),
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('birthday-set'),
      customerId: id,
      birthday: z.string().regex(/^(\d{4}-[01]\d-[0-3]\d|[01]\d-[0-3]\d|[0-3]\d\/[01]\d\/\d{4}|)$/),
    })
    .strict(),
  z.object({ action: z.literal('consent-set'), customerId: id, consent: z.boolean() }).strict(),
  z
    .object({
      action: z.literal('contact-set'),
      customerId: id,
      email: z
        .string()
        .trim()
        .max(200)
        .regex(/^([^\s@]+@[^\s@]+\.[^\s@]+)?$/),
      zaloId: z.string().trim().max(100),
    })
    .strict(),
  z
    .object({
      action: z.literal('feedback'),
      customerId: id,
      rating: z.number().int().min(1).max(5),
      comment: z.string().trim().max(600).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('note-add'),
      customerId: id,
      channel: z.enum(['call', 'zalo', 'sms', 'visit', 'email', 'note']),
      content: z.string().trim().min(1).max(800),
    })
    .strict(),
  z
    .object({
      action: z.literal('task-create'),
      customerId: id,
      title: z.string().trim().min(2).max(150),
      days: z.number().int().min(0).max(365).default(0),
    })
    .strict(),
]);

/** Customer files for care: members and walk-ins with packages, visits, points and contact history. */
const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const p = new URL(req.url).searchParams;
    const one = p.get('id');
    return one ? careCustomerDetail(c, one) : listCareCustomers(c, p.get('q') ?? '');
  }
  const parsed = actions.safeParse(body);
  if (!parsed.success) return fail('Thông tin chưa hợp lệ');
  return applyCustomerAction(c, parsed.data);
});
export const GET = route.GET;
export const POST = route.POST;
