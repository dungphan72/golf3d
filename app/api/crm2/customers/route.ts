import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import { profileInput } from '../../../../modules/crm/server/inputs';
import {
  listCustomers,
  customerDetail,
  updateProfile,
} from '../../../../modules/crm/server/customers';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const p = new URL(req.url).searchParams;
    if (p.get('phone')) return customerDetail(c, p.get('phone')!);
    return listCustomers(c, p.get('q') ?? '', p.get('tier') ?? '');
  }
  const parsed = profileInput.safeParse(body);
  if (!parsed.success) return fail('Thông tin chưa hợp lệ');
  const { phone, ...rest } = parsed.data;
  return updateProfile(c, phone, rest);
});
export const GET = route.GET;
export const POST = route.POST;
