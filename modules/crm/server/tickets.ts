import { audit, db } from '../../../lib/server/common';
import { isManager } from '../core/access';
import {
  canMove,
  canRate,
  isOpen,
  isOverdue,
  pickAssignee,
  slaDue,
  summarize,
  ticketCode,
  validateNew,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../core/tickets';
import { DAY, fail, getRuntime, notifyStaff, reply, setRuntime, staffList, type Ctx, type Result } from './store';

export type Note = { at: number; by: string; byName: string; kind: 'note' | 'status' | 'assign' | 'rating' | 'created'; text: string };
export type Ticket = {
  id: string;
  code: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customerId: string;
  customerName: string;
  phone: string;
  assignee: string | null;
  createdBy: string;
  created: number;
  updated: number;
  dueAt: number;
  resolvedAt: number | null;
  rating: number | null;
  notes: Note[];
};

const key = (id: string) => `ticket:${id}`;
const SEQ = 'ticket-seq';

async function loadAll(tenant: string): Promise<Ticket[]> {
  const rows = (
    await db()
      .prepare("SELECT value FROM crm2_runtime WHERE tenant=? AND key LIKE 'ticket:%' ORDER BY updated DESC LIMIT 500")
      .bind(tenant)
      .all<{ value: string }>()
  ).results;
  return rows.map((r) => JSON.parse(r.value) as Ticket);
}
const loadOne = async (tenant: string, id: string) => (await getRuntime<Ticket>(tenant, key(id)))?.value ?? null;
const save = (tenant: string, t: Ticket) => setRuntime(tenant, key(t.id), t, t.updated);

async function nameOf(tenant: string, userId: string | null) {
  if (!userId) return '';
  return (await staffList(tenant)).find((s) => s.id === userId)?.name ?? '';
}
const actorName = async (c: Ctx) => (await nameOf(c.tenant, c.userId)) || 'Nhân viên';

/** Tickets with the numbers the screen shows. Everyone with CRM access sees the shared support queue. */
export async function ticketList(c: Ctx, q: URLSearchParams): Promise<Result> {
  const id = q.get('id');
  if (id) {
    const t = await loadOne(c.tenant, id);
    return t ? reply({ ticket: { ...t, overdue: isOverdue(t, c.now) }, assigneeName: await nameOf(c.tenant, t.assignee), now: c.now }) : fail('Không tìm thấy ticket', 404);
  }
  const all = await loadAll(c.tenant);
  const filter = q.get('filter') ?? 'open';
  const rows = all.filter((t) => {
    if (filter === 'open') return isOpen(t.status);
    if (filter === 'overdue') return isOverdue(t, c.now);
    if (filter === 'mine') return t.assignee === c.userId && isOpen(t.status);
    if (filter === 'done') return !isOpen(t.status);
    return true;
  });
  const names = new Map((await staffList(c.tenant)).map((s) => [s.id, s.name]));
  const monthAgo = c.now - 30 * DAY;
  const lite = all.map((t) => ({ status: t.status, dueAt: t.dueAt, created: t.created, resolvedAt: t.resolvedAt, rating: t.rating, assignee: t.assignee }));
  return reply({
    tickets: rows.slice(0, 200).map((t) => ({
      id: t.id,
      code: t.code,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      customerName: t.customerName,
      phone: t.phone,
      assignee: t.assignee,
      assigneeName: t.assignee ? (names.get(t.assignee) ?? '') : '',
      created: t.created,
      dueAt: t.dueAt,
      overdue: isOverdue(t, c.now),
    })),
    summary: summarize(lite, c.now, monthAgo),
    staff: isManager(c.role) ? [...names].map(([id, name]) => ({ id, name })) : [],
    now: c.now,
  });
}

export async function ticketCreate(
  c: Ctx,
  i: { subject: string; description: string; category: TicketCategory; priority: TicketPriority; customerId?: string; customerName?: string; phone?: string; assignee?: string | null },
): Promise<Result> {
  const problem = validateNew(i);
  if (problem) return fail(problem);
  let customerName = (i.customerName ?? '').trim().slice(0, 100);
  let phone = (i.phone ?? '').trim().slice(0, 30);
  const customerId = (i.customerId ?? '').slice(0, 100);
  if (customerId) {
    const cu = await db().prepare('SELECT name,phone FROM customers WHERE tenant=? AND id=?').bind(c.tenant, customerId).first<{ name: string; phone: string }>();
    if (!cu) return fail('Không tìm thấy khách hàng', 404);
    customerName = cu.name;
    phone = cu.phone;
  }
  const staff = await staffList(c.tenant);
  // Only managers choose the person; otherwise the least busy support or sales person takes it.
  let assignee: string | null = null;
  if (i.assignee && isManager(c.role) && staff.some((s) => s.id === i.assignee)) assignee = i.assignee;
  if (!assignee) {
    const open = (await loadAll(c.tenant)).filter((t) => isOpen(t.status));
    const counts: Record<string, number> = {};
    for (const t of open) if (t.assignee) counts[t.assignee] = (counts[t.assignee] ?? 0) + 1;
    const pool = staff.filter((s) => ['cskh', 'sale'].includes(s.role));
    assignee = pickAssignee(pool.length ? pool : staff.filter((s) => ['manager', 'owner'].includes(s.role)), counts);
  }
  const seq = ((await getRuntime<number>(c.tenant, SEQ))?.value ?? 0) + 1;
  await setRuntime(c.tenant, SEQ, seq, c.now);
  const id = crypto.randomUUID().slice(0, 12);
  const by = await actorName(c);
  const t: Ticket = {
    id,
    code: ticketCode(seq),
    subject: i.subject.trim().slice(0, 200),
    description: i.description.trim(),
    category: i.category,
    priority: i.priority,
    status: 'new',
    customerId,
    customerName,
    phone,
    assignee,
    createdBy: c.userId,
    created: c.now,
    updated: c.now,
    dueAt: slaDue(i.priority, c.now),
    resolvedAt: null,
    rating: null,
    notes: [{ at: c.now, by: c.userId, byName: by, kind: 'created', text: 'Tạo ticket' }],
  };
  await save(c.tenant, t);
  await audit(c.tenant, 'crm.ticket', `${t.code} "${t.subject}" (${t.priority})`);
  if (assignee)
    await notifyStaff(c.tenant, assignee, `ticket:${id}:assign`, `[Ticket] ${t.code}: ${t.subject}`, `Bạn được giao ticket ${t.code} (${t.priority}).\nKhách: ${customerName || 'chưa rõ'} ${phone}\n${t.description}`, c.now).catch(() => undefined);
  return reply({ ok: true, id, code: t.code, assignee });
}

/** Staff may change a ticket assigned to them or to nobody; managers change any. */
const canTouch = (c: Ctx, t: Ticket) => isManager(c.role) || t.assignee === c.userId || t.assignee == null;

export async function ticketUpdate(
  c: Ctx,
  id: string,
  a: { status?: TicketStatus; priority?: TicketPriority; assignee?: string | null; note?: string; rating?: number },
): Promise<Result> {
  const t = await loadOne(c.tenant, id);
  if (!t) return fail('Không tìm thấy ticket', 404);
  if (!canTouch(c, t)) return fail('Ticket này đang do người khác xử lý', 403);
  const by = await actorName(c);
  const log = (kind: Note['kind'], text: string) => t.notes.push({ at: c.now, by: c.userId, byName: by, kind, text });
  if (a.status && a.status !== t.status) {
    if (!canMove(t.status, a.status, isManager(c.role))) return fail('Không thể chuyển ticket sang trạng thái này', 409);
    log('status', `Chuyển sang: ${a.status}`);
    if (a.status === 'resolved' || (a.status === 'closed' && t.resolvedAt == null)) t.resolvedAt = c.now;
    if (a.status === 'in_progress' && (t.status === 'resolved' || t.status === 'closed')) {
      t.resolvedAt = null; // reopened: the clock runs again from now
      t.dueAt = slaDue(t.priority, c.now);
    }
    t.status = a.status;
    if (!t.assignee && a.status !== 'closed') t.assignee = c.userId; // whoever picks it up owns it
  }
  if (a.priority && a.priority !== t.priority) {
    if (!isManager(c.role)) return fail('Chỉ quản lý đổi mức ưu tiên', 403);
    log('status', `Mức ưu tiên: ${a.priority}`);
    t.priority = a.priority;
    t.dueAt = slaDue(a.priority, t.created);
  }
  if (a.assignee !== undefined && a.assignee !== t.assignee) {
    if (!isManager(c.role)) return fail('Chỉ quản lý chia lại ticket', 403);
    const staff = await staffList(c.tenant);
    if (a.assignee && !staff.some((s) => s.id === a.assignee)) return fail('Không tìm thấy nhân viên', 404);
    t.assignee = a.assignee;
    log('assign', a.assignee ? `Giao cho ${staff.find((s) => s.id === a.assignee)?.name}` : 'Bỏ phân công');
    if (a.assignee)
      await notifyStaff(c.tenant, a.assignee, `ticket:${t.id}:assign:${c.now}`, `[Ticket] ${t.code}: ${t.subject}`, `Bạn được giao ticket ${t.code}.\n${t.description}`, c.now).catch(() => undefined);
  }
  if (a.rating !== undefined) {
    if (!canRate(t.status)) return fail('Chỉ chấm điểm sau khi ticket đã giải quyết');
    if (!Number.isInteger(a.rating) || a.rating < 1 || a.rating > 5) return fail('Điểm hài lòng từ 1 đến 5');
    t.rating = a.rating;
    log('rating', `Khách chấm ${a.rating}/5`);
  }
  if (a.note && a.note.trim()) log('note', a.note.trim().slice(0, 2000));
  t.updated = c.now;
  await save(c.tenant, t);
  return reply({ ok: true });
}
