import type { AuthUser } from './auth-service';
import { audit, db, fail, ok, type ServiceResult } from './common';
import { can } from '../auth/permissions';
import {
  LEGACY_METHODS,
  LEGACY_SERVICES,
  LEGACY_SERVICE_LABEL,
  billMoment,
  linesFood,
  linesProblem,
  linesTotal,
  momentProblem,
  type LegacyLine,
  type LegacyMethod,
  type LegacyService,
} from '../legacy-bill';
import { normalizePhone, validPhone } from '../member';

export type LegacyBillRow = {
  id: string;
  code: string;
  bill_at: number;
  customer: string;
  phone: string;
  room: string;
  service: string;
  lines: LegacyLine[];
  total: number;
  method: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by_name: string;
  created: number;
  reviewed_by_name: string;
  reviewed_at: number | null;
  review_note: string;
  bill_image_url: string;
};

type Raw = Omit<LegacyBillRow, 'lines'> & { lines: string };

const COLUMNS =
  'id,code,bill_at,customer,phone,room,service,lines,total,method,note,status,created_by_name,created,reviewed_by_name,reviewed_at,review_note,bill_image_url';

const parseLines = (s: string): LegacyLine[] => {
  try {
    return JSON.parse(s) as LegacyLine[];
  } catch {
    return [];
  }
};

export async function listLegacyBills(
  actor: AuthUser,
  status: string | null,
  before: number | null,
): Promise<ServiceResult> {
  const wanted = status === 'pending' || status === 'approved' || status === 'rejected' ? status : null;
  const rows = (
    await db()
      .prepare(
        `SELECT ${COLUMNS} FROM legacy_bills WHERE tenant=? AND (? IS NULL OR status=?) AND (? IS NULL OR bill_at<?) ORDER BY bill_at DESC,id DESC LIMIT 101`,
      )
      .bind(actor.tenant, wanted, wanted, before, before)
      .all<Raw>()
  ).results;
  const pending = (
    await db()
      .prepare("SELECT COUNT(*) AS n FROM legacy_bills WHERE tenant=? AND status='pending'")
      .bind(actor.tenant)
      .first<{ n: number }>()
  )?.n ?? 0;
  return ok({
    bills: rows.slice(0, 100).map((r) => ({ ...r, lines: parseLines(r.lines) })),
    hasMore: rows.length > 100,
    pending,
    canEnter: can(actor.role, 'legacy.enter'),
    canApprove: can(actor.role, 'legacy.approve'),
  });
}

export type LegacyInput = {
  date: string;
  time: string;
  code?: string;
  customer: string;
  phone?: string;
  room?: string;
  service: string;
  lines: LegacyLine[];
  method: string;
  note?: string;
  billImageUrl?: string;
};

type Clean = {
  at: number;
  customer: string;
  phone: string;
  room: string;
  service: string;
  method: string;
  note: string;
  lines: LegacyLine[];
  code: string;
  billImageUrl: string;
};

/** Checks a typed bill and returns the cleaned fields, or the message to show. */
function clean(input: LegacyInput): { error: string } | Clean {
  const at = billMoment(input.date, input.time);
  if (at == null) return { error: 'Ngày giờ của bill không hợp lệ' };
  const when = momentProblem(at, Date.now());
  if (when) return { error: when };
  const customer = input.customer.trim().slice(0, 100);
  if (customer.length < 2) return { error: 'Vui lòng nhập tên khách' };
  const rawPhone = (input.phone ?? '').trim();
  const phone = rawPhone ? normalizePhone(rawPhone) : '';
  if (phone && !validPhone(phone)) return { error: 'Số điện thoại không hợp lệ' };
  if (!(LEGACY_SERVICES as readonly string[]).includes(input.service)) return { error: 'Dịch vụ không hợp lệ' };
  if (!(LEGACY_METHODS as readonly string[]).includes(input.method))
    return { error: 'Hình thức thanh toán không hợp lệ' };
  const lines: LegacyLine[] = input.lines.map((l) => ({
    name: l.name.trim().slice(0, 120),
    qty: l.qty,
    price: l.price,
    ...(l.fnb ? { fnb: true } : {}),
  }));
  const problem = linesProblem(lines);
  if (problem) return { error: problem };
  return {
    at,
    customer,
    phone,
    room: (input.room ?? '').trim().slice(0, 40),
    service: input.service,
    method: input.method,
    note: (input.note ?? '').trim().slice(0, 500),
    lines,
    code: (input.code ?? '').trim().slice(0, 40),
    billImageUrl: (input.billImageUrl ?? '').trim().slice(0, 500),
  };
}

/** The owner's bills are approved straight away; everybody else's wait for the owner. */
export async function createLegacyBill(actor: AuthUser, input: LegacyInput): Promise<ServiceResult> {
  if (!can(actor.role, 'legacy.enter')) return fail('Bạn không có quyền nhập bill cũ', 403);
  const c = clean(input);
  if ('error' in c) return fail(c.error);
  const { at, customer, phone, lines, code } = c;
  const now = Date.now();
  if (code) {
    const dup = await db()
      .prepare('SELECT 1 AS x FROM legacy_bills WHERE tenant=? AND code=?')
      .bind(actor.tenant, code)
      .first();
    if (dup) return fail('Số bill này đã được nhập trước đó', 409);
  }
  const owner = can(actor.role, 'legacy.approve');
  const id = crypto.randomUUID();
  const total = linesTotal(lines);
  try {
    await db()
      .prepare(
        `INSERT INTO legacy_bills(id,tenant,code,bill_at,customer,phone,room,service,lines,total,food,method,note,status,created_by,created_by_name,created,reviewed_by,reviewed_by_name,reviewed_at,review_note,bill_image_url)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        id,
        actor.tenant,
        code,
        at,
        customer,
        phone,
        c.room,
        c.service,
        JSON.stringify(lines),
        total,
        linesFood(lines),
        c.method,
        c.note,
        owner ? 'approved' : 'pending',
        actor.userId,
        actor.name,
        now,
        owner ? actor.userId : '',
        owner ? actor.name : '',
        owner ? now : null,
        '',
        c.billImageUrl,
      )
      .run();
  } catch {
    return fail('Số bill này đã được nhập trước đó', 409);
  }
  await audit(
    actor.tenant,
    owner ? 'Nhập bill cũ' : 'Nhập bill cũ (chờ duyệt)',
    `${code ? code + ' · ' : ''}${customer} · ${LEGACY_SERVICE_LABEL[c.service as LegacyService]} · ${total} ₫ · ${input.date}`,
  );
  return ok({ id, status: owner ? 'approved' : 'pending' });
}

/** Only the owner approves. Approved bills count in the revenue report on the bill's own date. */
export async function reviewLegacyBill(
  actor: AuthUser,
  input: { id: string; decision: 'approve' | 'reject' | 'revoke'; note?: string },
): Promise<ServiceResult> {
  if (!can(actor.role, 'legacy.approve')) return fail('Chỉ chủ cơ sở được duyệt bill cũ', 403);
  const row = await db()
    .prepare('SELECT status,customer,total FROM legacy_bills WHERE tenant=? AND id=?')
    .bind(actor.tenant, input.id)
    .first<{ status: string; customer: string; total: number }>();
  if (!row) return fail('Không tìm thấy bill', 404);
  const note = (input.note ?? '').trim().slice(0, 300);
  let next: 'approved' | 'rejected';
  if (input.decision === 'approve') {
    if (row.status !== 'pending') return fail('Bill này đã được xử lý', 409);
    next = 'approved';
  } else if (input.decision === 'reject') {
    if (row.status !== 'pending') return fail('Bill này đã được xử lý', 409);
    if (note.length < 3) return fail('Vui lòng nhập lý do không duyệt');
    next = 'rejected';
  } else {
    if (row.status !== 'approved') return fail('Chỉ thu hồi được bill đã duyệt', 409);
    if (note.length < 3) return fail('Vui lòng nhập lý do thu hồi');
    next = 'rejected';
  }
  const done = await db()
    .prepare(
      'UPDATE legacy_bills SET status=?,reviewed_by=?,reviewed_by_name=?,reviewed_at=?,review_note=? WHERE tenant=? AND id=? AND status=?',
    )
    .bind(next, actor.userId, actor.name, Date.now(), note, actor.tenant, input.id, row.status)
    .run();
  if (!done.meta.changes) return fail('Bill này vừa được xử lý ở nơi khác', 409);
  await audit(
    actor.tenant,
    input.decision === 'approve' ? 'Duyệt bill cũ' : input.decision === 'reject' ? 'Không duyệt bill cũ' : 'Thu hồi bill cũ',
    `${row.customer} · ${row.total} ₫${note ? ' · ' + note : ''}`,
  );
  return ok();
}

/** The person who typed a bill (or the owner) corrects it while it still waits for approval. */
export async function updateLegacyBill(actor: AuthUser, id: string, input: LegacyInput): Promise<ServiceResult> {
  const row = await db()
    .prepare('SELECT status,created_by FROM legacy_bills WHERE tenant=? AND id=?')
    .bind(actor.tenant, id)
    .first<{ status: string; created_by: string }>();
  if (!row) return fail('Không tìm thấy bill', 404);
  if (row.status !== 'pending') return fail('Chỉ sửa được bill đang chờ duyệt. Hãy thu hồi bill đã duyệt rồi nhập lại.', 409);
  if (row.created_by !== actor.userId && !can(actor.role, 'legacy.approve'))
    return fail('Bạn chỉ sửa được bill do chính mình nhập', 403);
  const c = clean(input);
  if ('error' in c) return fail(c.error);
  if (c.code) {
    const dup = await db()
      .prepare('SELECT 1 AS x FROM legacy_bills WHERE tenant=? AND code=? AND id<>?')
      .bind(actor.tenant, c.code, id)
      .first();
    if (dup) return fail('Số bill này đã được nhập trước đó', 409);
  }
  try {
    await db()
      .prepare(
        "UPDATE legacy_bills SET code=?,bill_at=?,customer=?,phone=?,room=?,service=?,lines=?,total=?,food=?,method=?,note=?,bill_image_url=? WHERE tenant=? AND id=? AND status='pending'",
      )
      .bind(c.code, c.at, c.customer, c.phone, c.room, c.service, JSON.stringify(c.lines), linesTotal(c.lines), linesFood(c.lines), c.method, c.note, c.billImageUrl, actor.tenant, id)
      .run();
  } catch {
    return fail('Số bill này đã được nhập trước đó', 409);
  }
  await audit(actor.tenant, 'Sửa bill cũ chờ duyệt', `${c.customer} · ${linesTotal(c.lines)} ₫`);
  return ok();
}

/** The person who typed a bill may take it back while it still waits; the owner may remove any waiting bill. */
export async function withdrawLegacyBill(actor: AuthUser, id: string): Promise<ServiceResult> {
  const row = await db()
    .prepare('SELECT status,created_by,customer FROM legacy_bills WHERE tenant=? AND id=?')
    .bind(actor.tenant, id)
    .first<{ status: string; created_by: string; customer: string }>();
  if (!row) return fail('Không tìm thấy bill', 404);
  if (row.status !== 'pending') return fail('Chỉ xóa được bill đang chờ duyệt', 409);
  if (row.created_by !== actor.userId && !can(actor.role, 'legacy.approve'))
    return fail('Bạn chỉ xóa được bill do chính mình nhập', 403);
  await db().prepare("DELETE FROM legacy_bills WHERE tenant=? AND id=? AND status='pending'").bind(actor.tenant, id).run();
  await audit(actor.tenant, 'Xóa bill cũ chờ duyệt', row.customer);
  return ok();
}

export type { LegacyMethod };
