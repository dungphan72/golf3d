import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import { salesActions } from '../../../../modules/crm/server/inputs';
import {
  listProducts,
  saveProduct,
  listHolds,
  createHold,
  releaseHold,
  depositHold,
  createOrder,
  listOrders,
  orderDetail,
  orderAction,
} from '../../../../modules/crm/server/sales';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const p = new URL(req.url).searchParams;
    const view = p.get('view');
    if (view === 'products') return listProducts(c);
    if (view === 'holds') return listHolds(c);
    if (view === 'order') return orderDetail(c, p.get('id') ?? '');
    return listOrders(c, p.get('overdue') === '1');
  }
  const parsed = salesActions.safeParse(body);
  if (!parsed.success) return fail('Thông tin chưa hợp lệ');
  const a = parsed.data;
  switch (a.action) {
    case 'product':
      return saveProduct(c, a);
    case 'hold':
      return createHold(c, a);
    case 'release':
      return releaseHold(c, a.id);
    case 'deposit':
      return depositHold(c, a.id, a.amount);
    case 'order':
      return createOrder(c, { ...a, discount: a.discount });
    case 'order-action':
      return orderAction(c, a.id, { ...a, action: a.op });
  }
});
export const GET = route.GET;
export const POST = route.POST;
