import { crmRoute } from '../../../../modules/crm/server/http';
import { fail } from '../../../../modules/crm/server/store';
import { leadActions } from '../../../../modules/crm/server/inputs';
import {
  ingestLead,
  listLeads,
  leadDetail,
  poolList,
  workDesk,
  recordResult,
  changeStage,
  editLead,
  addNote,
  claimLeads,
  assignLeads,
  recallLeads,
} from '../../../../modules/crm/server/leads';
export const dynamic = 'force-dynamic';

const route = crmRoute({ read: 'crm.view', write: 'crm.work' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const p = new URL(req.url).searchParams;
    if (p.get('id')) return leadDetail(c, p.get('id')!);
    if (p.get('view') === 'pool') return poolList(c);
    if (p.get('view') === 'work') return workDesk(c);
    return listLeads(c, {
      stage: p.get('stage') ?? undefined,
      status: p.get('status') ?? undefined,
      source: p.get('source') ?? undefined,
      owner: p.get('owner') ?? undefined,
      q: p.get('q') ?? undefined,
      label: p.get('label') ?? undefined,
      limit: Number(p.get('limit')) || undefined,
      offset: Number(p.get('offset')) || undefined,
    });
  }
  const parsed = leadActions.safeParse(body);
  if (!parsed.success) return fail('Thông tin chưa hợp lệ');
  const a = parsed.data;
  switch (a.action) {
    case 'create':
      return ingestLead(c.tenant, a, c.base, c.now);
    case 'result':
      return recordResult(c, a.id, a.result, a.when ?? null, a.note);
    case 'stage':
      return changeStage(c, a.id, a);
    case 'edit':
      return editLead(c, a.id, a);
    case 'note':
      return addNote(c, a.id, a.type, a.content);
    case 'claim':
      return claimLeads(c, a.ids);
    case 'assign':
      return assignLeads(c, a.ids, a.userId);
    case 'recall': {
      if (c.role !== 'owner' && c.role !== 'manager')
        return fail('Chỉ quản lý được thu hồi lead', 403);
      return recallLeads(c, a.ids, c.userId, a.reason);
    }
  }
});
export const GET = route.GET;
export const POST = route.POST;
