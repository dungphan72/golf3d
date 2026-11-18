import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import {
  checkDuplicates,
  getUnlinkedRecords,
  linkRecordToCustomer,
  unlinkRecordFromCustomer,
} from '../../../../modules/crm/server/identity';

export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const p = new URL(req.url).searchParams;
    const customerId = p.get('customerId');
    if (!customerId) return fail('Thiếu customerId');
    return getUnlinkedRecords(c, customerId);
  }

  const action = String(body.action ?? '');

  if (action === 'check-duplicates') {
    return checkDuplicates(c, {
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      excludeId: typeof body.excludeId === 'string' ? body.excludeId : undefined,
    });
  }

  if (action === 'link-record') {
    const customerId = String(body.customerId ?? '');
    const recordType = body.recordType === 'lead' ? 'lead' : 'booking';
    const recordId = String(body.recordId ?? '');
    const reason = typeof body.reason === 'string' ? body.reason : undefined;
    const confirmed = Boolean(body.confirmed);

    if (!customerId || !recordId) return fail('Thiếu thông tin liên kết');
    return linkRecordToCustomer(c, { customerId, recordType, recordId, reason, confirmed });
  }

  if (action === 'unlink-record') {
    const customerId = String(body.customerId ?? '');
    const recordType = body.recordType === 'lead' ? 'lead' : 'booking';
    const recordId = String(body.recordId ?? '');
    const reason = String(body.reason ?? '');

    if (!customerId || !recordId) return fail('Thiếu thông tin');
    return unlinkRecordFromCustomer(c, { customerId, recordType, recordId, reason });
  }

  return fail('Thao tác không hợp lệ', 400);
});

export const GET = route.GET;
export const POST = route.POST;
