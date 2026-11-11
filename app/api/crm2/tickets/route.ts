import { z } from 'zod';
import { crmRoute } from '../../../../modules/crm/server/http';
import { ticketCreate, ticketList, ticketUpdate } from '../../../../modules/crm/server/tickets';
import { fail } from '../../../../modules/crm/server/store';
import { CATEGORIES, PRIORITIES, STATUSES } from '../../../../modules/crm/core/tickets';
export const dynamic = 'force-dynamic';

const actions = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('create'),
      subject: z.string().trim().max(200),
      description: z.string().trim().max(4000).default(''),
      category: z.enum(CATEGORIES),
      priority: z.enum(PRIORITIES).default('normal'),
      customerId: z.string().max(100).optional(),
      customerName: z.string().max(100).optional(),
      phone: z.string().max(30).optional(),
      assignee: z.string().max(100).nullable().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('update'),
      id: z.string().min(1).max(40),
      status: z.enum(STATUSES).optional(),
      priority: z.enum(PRIORITIES).optional(),
      assignee: z.string().max(100).nullable().optional(),
      note: z.string().max(2000).optional(),
      rating: z.number().int().optional(),
    })
    .strict(),
]);

const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'GET') return ticketList(c, new URL(req.url).searchParams);
  const a = actions.safeParse(body);
  if (!a.success) return fail('Thông tin chưa hợp lệ');
  if (a.data.action === 'create') return ticketCreate(c, a.data);
  const { action, id, ...rest } = a.data;
  void action;
  return ticketUpdate(c, id, rest);
});
export const GET = route.GET;
export const POST = route.POST;
