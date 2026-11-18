import { z } from 'zod';
import { crmRoute } from '../../../../modules/crm/server/http';
import { fail, reply } from '../../../../modules/crm/server/store';
import { reconcileCustomer360 } from '../../../../modules/crm/server/event-bus';

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('reconcile'), customerId: z.string().min(1).max(100) }).strict(),
]);

const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'POST') {
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ', 400);

    const input = parsed.data;
    if (input.action === 'reconcile') {
      try {
        const report = await reconcileCustomer360(c.tenant, input.customerId);
        return reply({ ok: true, report });
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'Không đối soát được dữ liệu', 400);
      }
    }
  }
  return fail('Thao tác không hỗ trợ', 400);
});

export const POST = route;
