import { db } from '../../../lib/server/common';
import { OFFICIAL_PACKAGES } from '../../../lib/official-packages';
import {
  canApproveAppointment,
  canTransition,
  initialAppointmentStatus,
  arrivalRate,
  type ApptStatus,
} from '../core/appointments';
import {
  buildSchedule,
  canCancelOrder,
  orderCode,
  payStatusAfter,
  summarizeOrder,
  validatePayment,
  vnDate,
  type PayRow,
} from '../core/orders';
import { canEditLead, canSeeLead, isManager, type Actor } from '../core/access';
import {
  addActivity,
  addTask,
  fail,
  getSettings,
  reply,
  DAY,
  type Ctx,
  type Result,
} from './store';
import { getLeadRow, changeStage } from './leads';
import { ensureProfile } from './customers';

const actorOf = (c: Ctx): Actor => ({ id: c.userId, role: c.role });

// ---------------------------------------------------------------- appointments

export async function listAppointments(c: Ctx, from: number, to: number): Promise<Result> {
  const mgr = isManager(c.role);
  const rows = (
    await db()
      .prepare(
        `SELECT a.id,a.lead_id AS leadId,l.full_name AS leadName,l.phone_norm AS phoneNorm,cust.id AS customerId,a.owner,a.service,a.at,a.status,a.note,a.created_by AS createdBy
         FROM crm2_appointments a JOIN crm2_leads l ON l.id=a.lead_id
         LEFT JOIN customers cust ON cust.tenant=a.tenant AND cust.phone=l.phone_norm
         WHERE a.tenant=? AND a.at>=? AND a.at<? AND (?=1 OR a.owner=?) ORDER BY a.at LIMIT 300`,
      )
      .bind(c.tenant, from, to, mgr ? 1 : 0, c.userId)
      .all()
  ).results;
  const stats = await db()
    .prepare(
      "SELECT SUM(status='ARRIVED') AS arrived,SUM(status='NO_SHOW') AS noShow FROM crm2_appointments WHERE tenant=? AND (?=1 OR owner=?)",
    )
    .bind(c.tenant, mgr ? 1 : 0, c.userId)
    .first<{ arrived: number | null; noShow: number | null }>();
  return reply({
    appointments: rows,
    arrivalRate: arrivalRate(stats?.arrived ?? 0, stats?.noShow ?? 0),
    now: c.now,
  });
}

export async function createAppointment(
  c: Ctx,
  o: { leadId: string; at: number; service?: string; note?: string },
): Promise<Result> {
  const lead = await getLeadRow(c.tenant, o.leadId);
  if (!lead || !canSeeLead(actorOf(c), lead)) return fail('Không tìm thấy lead', 404);
  if (!canEditLead(actorOf(c), lead)) return fail('Lead đang do nhân viên khác phụ trách', 403);
  if (o.at < c.now - 5 * 60_000) return fail('Giờ hẹn phải ở tương lai');
  const settings = await getSettings(c.tenant);
  const status = initialAppointmentStatus(settings.appointments.requireApproval, isManager(c.role));
  const id = crypto.randomUUID();
  await db()
    .prepare(
      'INSERT INTO crm2_appointments(id,tenant,lead_id,owner,service,at,status,note,created_by,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    )
    .bind(
      id,
      c.tenant,
      o.leadId,
      lead.owner ?? c.userId,
      (o.service ?? lead.targetService).slice(0, 255),
      o.at,
      status,
      (o.note ?? '').slice(0, 1000),
      c.userId,
      c.now,
      c.now,
    )
    .run();
  await db()
    .prepare(
      "UPDATE crm2_leads SET stage=CASE WHEN stage IN ('NEW','CONTACTED','QUALIFIED') THEN 'VISIT_SCHEDULED' ELSE stage END,status_id=CASE WHEN stage IN ('NEW','CONTACTED','QUALIFIED') THEN 'hen-trai-nghiem' ELSE status_id END,next_action='MEETING',next_due=?,updated=? WHERE tenant=? AND id=?",
    )
    .bind(o.at, c.now, c.tenant, o.leadId)
    .run();
  await addActivity(
    c.tenant,
    o.leadId,
    'VISIT',
    `Đặt lịch trải nghiệm ${vnDate(o.at)}${status === 'PENDING' ? ' (chờ duyệt)' : ''}`,
    c.userId,
    c.now,
    { appointmentId: id },
  );
  return reply({ ok: true, id, status });
}

export async function setAppointmentStatus(c: Ctx, id: string, to: string): Promise<Result> {
  const a = await db()
    .prepare(
      `SELECT a.status,a.owner,a.lead_id AS leadId,s.team AS ownerTeam,l.full_name AS leadName,l.phone_norm AS phoneNorm,l.email,l.target_service AS targetService
       FROM crm2_appointments a
       LEFT JOIN crm2_staff s ON s.tenant=a.tenant AND s.user_id=a.owner
       LEFT JOIN crm2_leads l ON l.tenant=a.tenant AND l.id=a.lead_id
       WHERE a.tenant=? AND a.id=?`,
    )
    .bind(c.tenant, id)
    .first<{
      status: ApptStatus;
      owner: string | null;
      leadId: string;
      ownerTeam: string | null;
      leadName: string | null;
      phoneNorm: string | null;
      email: string | null;
      targetService: string | null;
    }>();
  if (!a) return fail('Không tìm thấy lịch hẹn', 404);
  if (!['CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED'].includes(to))
    return fail('Trạng thái không hợp lệ');
  if (!canTransition(a.status, to as ApptStatus))
    return fail('Không thể chuyển từ trạng thái hiện tại', 409);
  const mine = a.owner === c.userId;
  if (a.status === 'PENDING' && to === 'CONFIRMED') {
    const me = await db()
      .prepare('SELECT is_leader AS leader,team FROM crm2_staff WHERE tenant=? AND user_id=?')
      .bind(c.tenant, c.userId)
      .first<{ leader: number; team: string }>();
    if (
      !canApproveAppointment(
        { id: c.userId, manager: isManager(c.role), leader: me?.leader === 1, team: me?.team },
        { ownerTeam: a.ownerTeam, owner: a.owner },
      )
    )
      return fail('Bạn không có quyền duyệt lịch hẹn này', 403);
  } else if (!isManager(c.role) && !mine) return fail('Lịch hẹn của nhân viên khác', 403);
  await db()
    .prepare(
      'UPDATE crm2_appointments SET status=?,approved_by=CASE WHEN ?=? THEN ? ELSE approved_by END,decided_at=?,updated=? WHERE tenant=? AND id=?',
    )
    .bind(to, a.status, 'PENDING', c.userId, c.now, c.now, c.tenant, id)
    .run();
  if (to === 'ARRIVED') {
    await db()
      .prepare(
        "UPDATE crm2_leads SET stage=CASE WHEN stage IN ('NEW','CONTACTED','QUALIFIED','VISIT_SCHEDULED') THEN 'VISITED' ELSE stage END,status_id=CASE WHEN stage IN ('NEW','CONTACTED','QUALIFIED','VISIT_SCHEDULED') THEN 'da-trai-nghiem' ELSE status_id END,next_action='FOLLOW_UP',next_due=?,updated=? WHERE tenant=? AND id=?",
      )
      .bind(c.now + DAY, c.now, c.tenant, a.leadId)
      .run();
    if (a.phoneNorm) {
      await ensureProfile(c.tenant, a.phoneNorm, c.userId, c.now);
      const existingCust = await db()
        .prepare('SELECT id FROM customers WHERE tenant=? AND phone=?')
        .bind(c.tenant, a.phoneNorm)
        .first<{ id: string }>();
      if (!existingCust) {
        await db()
          .prepare(
            'INSERT INTO customers(id,tenant,name,phone,email,note,created) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            c.tenant,
            a.leadName || `Khách ${a.phoneNorm}`,
            a.phoneNorm,
            a.email || '',
            `Khách đến trải nghiệm từ CRM (${a.targetService || 'Lịch hẹn'})`,
            c.now,
          )
          .run();
      }
    }
  }
  await addActivity(c.tenant, a.leadId, 'VISIT', `Lịch hẹn: ${to}`, c.userId, c.now, {
    appointmentId: id,
  });
  return reply({ ok: true });
}

// ---------------------------------------------------------------- products and holds

const SYSTEM_SERVICES = [
  { code: 'svc-swing-1h', name: 'Luyện swing (1 giờ)', listPrice: 150_000, limited: 0, active: 1 },
  { code: 'svc-game-9h', name: 'Game 9 hố (1 người)', listPrice: 300_000, limited: 0, active: 1 },
  { code: 'svc-game-18h', name: 'Game 18 hố (1 người)', listPrice: 400_000, limited: 0, active: 1 },
  { code: 'svc-vip-1h', name: 'Phòng VIP riêng biệt (1 giờ)', listPrice: 200_000, limited: 0, active: 1 },
  { code: 'svc-coach-1h', name: 'HLV cá nhân hướng dẫn 1-1 (1 giờ)', listPrice: 800_000, limited: 0, active: 1 },
];

export async function findProduct(tenant: string, code: string) {
  const custom = await db()
    .prepare('SELECT code,name,limited,active,list_price AS listPrice FROM crm2_products WHERE tenant=? AND code=?')
    .bind(tenant, code)
    .first<{ code: string; name: string; limited: number; active: number; listPrice: number }>();
  if (custom) return custom;

  const pkg = await db()
    .prepare('SELECT id AS code,name,0 AS limited,active,price AS listPrice FROM package_types WHERE tenant=? AND id=?')
    .bind(tenant, code)
    .first<{ code: string; name: string; limited: number; active: number; listPrice: number }>();
  if (pkg) return pkg;

  const off = OFFICIAL_PACKAGES.find((p) => p.key === code);
  if (off) return { code: off.key, name: off.name, limited: 0, active: 1, listPrice: off.price };

  const sys = SYSTEM_SERVICES.find((s) => s.code === code);
  if (sys) return sys;

  return null;
}

export async function listProducts(c: Ctx): Promise<Result> {
  const customRows = (
    await db()
      .prepare(
        `SELECT p.code,p.name,p.list_price AS listPrice,p.limited,p.active,
          EXISTS(SELECT 1 FROM crm2_holds h WHERE h.tenant=p.tenant AND h.product_code=p.code AND h.status='ACTIVE') AS held
         FROM crm2_products p WHERE p.tenant=? ORDER BY p.name`,
      )
      .bind(c.tenant)
      .all<{ code: string; name: string; listPrice: number; limited: number; active: number; held: number }>()
  ).results;

  const pkgRows = (
    await db()
      .prepare(
        `SELECT pt.id AS code,pt.name,pt.price AS listPrice,0 AS limited,pt.active,
          EXISTS(SELECT 1 FROM crm2_holds h WHERE h.tenant=pt.tenant AND h.product_code=pt.id AND h.status='ACTIVE') AS held
         FROM package_types pt WHERE pt.tenant=? AND pt.active=1 ORDER BY pt.price`,
      )
      .bind(c.tenant)
      .all<{ code: string; name: string; listPrice: number; limited: number; active: number; held: number }>()
  ).results;

  const seenCodes = new Set(customRows.map((r) => r.code));
  const combined = [...customRows];

  for (const pkg of pkgRows) {
    if (!seenCodes.has(pkg.code)) {
      seenCodes.add(pkg.code);
      combined.push(pkg);
    }
  }

  // If no package types created yet in DB, include official system packages
  if (pkgRows.length === 0) {
    for (const off of OFFICIAL_PACKAGES) {
      if (!seenCodes.has(off.key)) {
        seenCodes.add(off.key);
        combined.push({
          code: off.key,
          name: off.name,
          listPrice: off.price,
          limited: 0,
          active: 1,
          held: 0,
        });
      }
    }
  }

  // Include core practice & game services
  for (const svc of SYSTEM_SERVICES) {
    if (!seenCodes.has(svc.code)) {
      seenCodes.add(svc.code);
      combined.push({ ...svc, held: 0 });
    }
  }

  return reply({ products: combined });
}

export async function saveProduct(
  c: Ctx,
  p: { code: string; name: string; listPrice: number; limited: boolean; active: boolean },
): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý sửa danh mục dịch vụ', 403);
  await db()
    .prepare(
      `INSERT INTO crm2_products(tenant,code,name,list_price,limited,active,created) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(tenant,code) DO UPDATE SET name=excluded.name,list_price=excluded.list_price,limited=excluded.limited,active=excluded.active`,
    )
    .bind(
      c.tenant,
      p.code,
      p.name,
      Math.max(0, Math.round(p.listPrice)),
      p.limited ? 1 : 0,
      p.active ? 1 : 0,
      c.now,
    )
    .run();
  return reply({ ok: true });
}

export async function listHolds(c: Ctx): Promise<Result> {
  const mgr = isManager(c.role);
  const rows = (
    await db()
      .prepare(
        `SELECT h.id,h.product_code AS productCode,h.product_name AS productName,h.lead_id AS leadId,h.lead_name AS leadName,h.kind,h.amount,h.status,h.expires_at AS expiresAt,h.note
         FROM crm2_holds h JOIN crm2_leads l ON l.id=h.lead_id
         WHERE h.tenant=? AND (?=1 OR l.owner=?) ORDER BY h.status<>'ACTIVE', h.created DESC LIMIT 200`,
      )
      .bind(c.tenant, mgr ? 1 : 0, c.userId)
      .all()
  ).results;
  return reply({ holds: rows, now: c.now });
}

export async function createHold(
  c: Ctx,
  o: { leadId: string; productCode: string; hours?: number; note?: string },
): Promise<Result> {
  const lead = await getLeadRow(c.tenant, o.leadId);
  if (!lead || !canSeeLead(actorOf(c), lead)) return fail('Không tìm thấy lead', 404);
  if (!canEditLead(actorOf(c), lead)) return fail('Lead đang do nhân viên khác phụ trách', 403);
  const prod = await findProduct(c.tenant, o.productCode);
  if (!prod || !prod.active) return fail('Không tìm thấy dịch vụ trong danh mục');
  const settings = await getSettings(c.tenant);
  const id = crypto.randomUUID();
  const hours = Math.min(Math.max(o.hours ?? settings.holdHours, 1), 336);
  try {
    await db()
      .prepare(
        `INSERT INTO crm2_holds(id,tenant,product_code,product_name,limited,lead_id,lead_name,kind,amount,status,expires_at,note,created_by,created,updated)
         VALUES (?,?,?,?,?,?,?,'HOLD',0,'ACTIVE',?,?,?,?,?)`,
      )
      .bind(
        id,
        c.tenant,
        prod.code,
        prod.name,
        prod.limited,
        lead.id,
        lead.fullName,
        c.now + hours * 3_600_000,
        (o.note ?? '').slice(0, 500),
        c.userId,
        c.now,
        c.now,
      )
      .run();
  } catch (e) {
    if (/UNIQUE/i.test(String(e))) return fail('Dịch vụ này đang được giữ chỗ cho khách khác', 409);
    throw e;
  }
  await addActivity(
    c.tenant,
    lead.id,
    'HOLD',
    `Giữ chỗ ${prod.name} trong ${hours} giờ`,
    c.userId,
    c.now,
    { holdId: id },
  );
  return reply({ ok: true, id, expiresAt: c.now + hours * 3_600_000 });
}

export async function releaseHold(c: Ctx, id: string): Promise<Result> {
  const h = await db()
    .prepare(
      'SELECT lead_id AS leadId,status,created_by AS createdBy FROM crm2_holds WHERE tenant=? AND id=?',
    )
    .bind(c.tenant, id)
    .first<{ leadId: string; status: string; createdBy: string }>();
  if (!h) return fail('Không tìm thấy giữ chỗ', 404);
  if (h.status !== 'ACTIVE') return fail('Giữ chỗ không còn hiệu lực', 409);
  if (!isManager(c.role) && h.createdBy !== c.userId)
    return fail('Giữ chỗ của nhân viên khác', 403);
  await db()
    .prepare(
      "UPDATE crm2_holds SET status='RELEASED',updated=? WHERE tenant=? AND id=? AND status='ACTIVE'",
    )
    .bind(c.now, c.tenant, id)
    .run();
  await addActivity(c.tenant, h.leadId, 'HOLD', 'Nhả giữ chỗ', c.userId, c.now);
  return reply({ ok: true });
}

/** Records a deposit on a hold (managers only). When the product has a list price an order is created. */
export async function depositHold(c: Ctx, id: string, amount: number): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý ghi nhận đặt cọc', 403);
  if (!Number.isInteger(amount) || amount <= 0) return fail('Số tiền cọc phải lớn hơn 0');
  const h = await db()
    .prepare(
      'SELECT h.lead_id AS leadId,h.status,h.product_code AS code,h.product_name AS name,h.limited,p.list_price AS listPrice FROM crm2_holds h LEFT JOIN crm2_products p ON p.tenant=h.tenant AND p.code=h.product_code WHERE h.tenant=? AND h.id=?',
    )
    .bind(c.tenant, id)
    .first<{
      leadId: string;
      status: string;
      code: string;
      name: string;
      limited: number;
      listPrice: number | null;
    }>();
  if (!h) return fail('Không tìm thấy giữ chỗ', 404);
  if (h.status !== 'ACTIVE') return fail('Giữ chỗ không còn hiệu lực', 409);
  await db()
    .prepare(
      "UPDATE crm2_holds SET kind='DEPOSIT',amount=?,updated=? WHERE tenant=? AND id=? AND status='ACTIVE'",
    )
    .bind(amount, c.now, c.tenant, id)
    .run();
  await db()
    .prepare(
      "UPDATE crm2_leads SET stage='DEPOSITED',status_id='dat-coc',updated=? WHERE tenant=? AND id=? AND stage NOT IN ('WON','LOST')",
    )
    .bind(c.now, c.tenant, h.leadId)
    .run();
  await addActivity(
    c.tenant,
    h.leadId,
    'HOLD',
    `Ghi nhận cọc ${amount.toLocaleString('vi-VN')}đ cho ${h.name}`,
    c.userId,
    c.now,
    { holdId: id, amount },
  );
  let orderId: string | null = null;
  if (h.listPrice && h.listPrice > 0) {
    const r = await createOrder(c, {
      leadId: h.leadId,
      productCode: h.code,
      price: h.listPrice,
      discount: 0,
      holdId: id,
      deposit: amount,
    });
    if (r.status === 200) orderId = String(r.body.id);
    else return r; // the deposit stays recorded; the manager sees why the order was not made
  }
  return reply({ ok: true, orderId });
}

// ---------------------------------------------------------------- orders

type OrderRow = {
  id: string;
  code: string;
  leadId: string;
  holdId: string | null;
  productCode: string;
  productName: string;
  limited: number;
  listPrice: number;
  discount: number;
  price: number;
  status: string;
  created: number;
  refundDue: number;
};
const ORDER_COLS = `id,code,lead_id AS leadId,hold_id AS holdId,product_code AS productCode,product_name AS productName,limited,
 list_price AS listPrice,discount,price,status,created,refund_due AS refundDue`;
const PAY_COLS = `id,kind,label,amount,paid_amount AS paidAmount,due_date AS dueDate,paid_at AS paidAt,method,status,note`;

export async function createOrder(
  c: Ctx,
  o: {
    leadId: string;
    productCode: string;
    price?: number;
    discount: number;
    holdId?: string | null;
    deposit?: number;
    note?: string;
  },
): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý tạo đơn bán', 403);
  const lead = await getLeadRow(c.tenant, o.leadId);
  if (!lead) return fail('Không tìm thấy lead', 404);
  const prod = await findProduct(c.tenant, o.productCode);
  if (!prod) return fail('Không tìm thấy dịch vụ trong danh mục');
  const listPrice = o.price ?? prod.listPrice;
  const discount = Math.min(Math.max(Math.round(o.discount), 0), listPrice);
  const price = listPrice - discount;
  if (price <= 0) return fail('Giá bán phải lớn hơn 0');
  if (o.deposit && o.deposit > price) return fail('Tiền cọc vượt giá bán');
  const year = new Date(c.now + 7 * 3_600_000).getUTCFullYear();
  const id = crypto.randomUUID();
  for (let attempt = 0; attempt < 5; attempt++) {
    const seq =
      ((
        await db()
          .prepare('SELECT COUNT(*) AS n FROM crm2_orders WHERE tenant=? AND code LIKE ?')
          .bind(c.tenant, `BK${year}-%`)
          .first<{ n: number }>()
      )?.n ?? 0) +
      1 +
      attempt;
    try {
      await db()
        .prepare(
          `INSERT INTO crm2_orders(id,tenant,code,lead_id,hold_id,product_code,product_name,limited,list_price,discount,price,status,note,created_by,created,updated)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,'ACTIVE',?,?,?,?)`,
        )
        .bind(
          id,
          c.tenant,
          orderCode(year, seq),
          o.leadId,
          o.holdId ?? null,
          prod.code,
          prod.name,
          prod.limited,
          listPrice,
          discount,
          price,
          (o.note ?? '').slice(0, 500),
          c.userId,
          c.now,
          c.now,
        )
        .run();
      break;
    } catch (e) {
      if (!/UNIQUE/i.test(String(e))) throw e;
      if (/product_code/i.test(String(e)) || /crm2_order_active/i.test(String(e)))
        return fail('Dịch vụ này đã có đơn bán đang hiệu lực', 409);
      if (attempt === 4) throw e; // code collision kept happening
    }
  }
  if (o.holdId)
    await db()
      .prepare(
        "UPDATE crm2_holds SET status='CONVERTED',updated=? WHERE tenant=? AND id=? AND status='ACTIVE'",
      )
      .bind(c.now, c.tenant, o.holdId)
      .run();
  if (o.deposit) {
    await db()
      .prepare(
        "INSERT INTO crm2_order_payments(id,tenant,order_id,kind,label,amount,paid_amount,due_date,paid_at,method,status,created_by,created) VALUES (?,?,?,'DEPOSIT','Đặt cọc',?,?,?,?,'',?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        c.tenant,
        id,
        o.deposit,
        o.deposit,
        vnDate(c.now),
        c.now,
        'PAID',
        c.userId,
        c.now,
      )
      .run();
  }
  await addActivity(c.tenant, o.leadId, 'SYSTEM', `Tạo đơn bán ${prod.name}`, c.userId, c.now, {
    orderId: id,
  });
  return reply({ ok: true, id });
}

export async function listOrders(c: Ctx, onlyOverdue: boolean): Promise<Result> {
  const mgr = isManager(c.role);
  const orders = (
    await db()
      .prepare(
        'SELECT o.id,o.code,o.lead_id AS leadId,o.hold_id AS holdId,o.product_code AS productCode,o.product_name AS productName,o.limited,o.list_price AS listPrice,o.discount,o.price,o.status,o.created,o.refund_due AS refundDue,l.full_name AS leadName FROM crm2_orders o JOIN crm2_leads l ON l.id=o.lead_id WHERE o.tenant=? AND (?=1 OR l.owner=?) ORDER BY o.created DESC LIMIT 200',
      )
      .bind(c.tenant, mgr ? 1 : 0, c.userId)
      .all<OrderRow & { leadName: string }>()
  ).results;
  const out = [];
  const totals = { price: 0, paid: 0, outstanding: 0, overdue: 0 };
  for (const o of orders) {
    const rows = (
      await db()
        .prepare(`SELECT ${PAY_COLS} FROM crm2_order_payments WHERE tenant=? AND order_id=?`)
        .bind(c.tenant, o.id)
        .all<PayRow>()
    ).results;
    const s = summarizeOrder(o.price, rows, c.now);
    if (o.status !== 'CANCELLED') {
      totals.price += o.price;
      totals.paid += s.paid;
      totals.outstanding += s.outstanding;
      totals.overdue += s.overdue;
    }
    if (!onlyOverdue || (s.overdueCount > 0 && o.status !== 'CANCELLED'))
      out.push({ ...o, summary: s });
  }
  return reply({ orders: out, totals });
}

export async function orderDetail(c: Ctx, id: string): Promise<Result> {
  const o = await db()
    .prepare(
      `SELECT ${ORDER_COLS},note,cancel_reason AS cancelReason FROM crm2_orders WHERE tenant=? AND id=?`,
    )
    .bind(c.tenant, id)
    .first<OrderRow & { note: string; cancelReason: string }>();
  if (!o) return fail('Không tìm thấy đơn', 404);
  const lead = await getLeadRow(c.tenant, o.leadId);
  if (!lead || !canSeeLead(actorOf(c), lead) || (!isManager(c.role) && lead.owner !== c.userId))
    return fail('Không tìm thấy đơn', 404);
  const rows = (
    await db()
      .prepare(
        `SELECT ${PAY_COLS} FROM crm2_order_payments WHERE tenant=? AND order_id=? ORDER BY due_date, created`,
      )
      .bind(c.tenant, id)
      .all<PayRow & { id: string }>()
  ).results;
  return reply({
    order: o,
    leadName: lead.fullName,
    payments: rows,
    summary: summarizeOrder(o.price, rows, c.now),
    cancel: canCancelOrder(c.role, o.created, c.now),
  });
}

async function liveRows(tenant: string, orderId: string) {
  return (
    await db()
      .prepare(
        `SELECT ${PAY_COLS} FROM crm2_order_payments WHERE tenant=? AND order_id=? AND status<>'CANCELLED'`,
      )
      .bind(tenant, orderId)
      .all<PayRow & { id: string }>()
  ).results;
}

export async function orderAction(c: Ctx, id: string, a: Record<string, unknown>): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý thao tác tiền', 403);
  const o = await db()
    .prepare(`SELECT ${ORDER_COLS} FROM crm2_orders WHERE tenant=? AND id=?`)
    .bind(c.tenant, id)
    .first<OrderRow>();
  if (!o) return fail('Không tìm thấy đơn', 404);
  if (o.status === 'CANCELLED') return fail('Đơn đã hủy', 409);
  const d = db();
  switch (a.action) {
    case 'pay': {
      const amount = Number(a.amount);
      const row = await d
        .prepare(
          `SELECT ${PAY_COLS} FROM crm2_order_payments WHERE tenant=? AND order_id=? AND id=?`,
        )
        .bind(c.tenant, id, String(a.paymentId))
        .first<PayRow & { id: string }>();
      if (!row || row.status === 'CANCELLED') return fail('Không tìm thấy đợt thanh toán', 404);
      const paid = (await liveRows(c.tenant, id)).reduce((s, r) => s + r.paidAmount, 0);
      const err = validatePayment({
        amount,
        rowLeft: row.amount - row.paidAmount,
        orderLeft: o.price - paid,
      });
      if (err) return fail(err);
      // Compare-and-set on paid_amount: two simultaneous payments cannot both pass.
      const nextPaid = row.paidAmount + amount;
      const r = await d
        .prepare(
          'UPDATE crm2_order_payments SET paid_amount=?,status=?,paid_at=?,method=? WHERE tenant=? AND id=? AND paid_amount=?',
        )
        .bind(
          nextPaid,
          payStatusAfter(row.amount, nextPaid),
          c.now,
          String(a.method ?? '').slice(0, 40),
          c.tenant,
          row.id,
          row.paidAmount,
        )
        .run();
      if (!r.meta.changes) return fail('Đợt này vừa được cập nhật, tải lại rồi thử lại', 409);
      if (paid + amount >= o.price)
        await d
          .prepare("UPDATE crm2_orders SET status='COMPLETED',updated=? WHERE tenant=? AND id=?")
          .bind(c.now, c.tenant, id)
          .run();
      await addActivity(
        c.tenant,
        o.leadId,
        'SYSTEM',
        `Thu ${amount.toLocaleString('vi-VN')}đ cho đơn ${o.code}`,
        c.userId,
        c.now,
        { orderId: id },
      );
      return reply({ ok: true });
    }
    case 'addRow': {
      const amount = Math.round(Number(a.amount));
      if (!(amount > 0)) return fail('Số tiền phải lớn hơn 0');
      const due = String(a.dueDate ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return fail('Ngày đến hạn không hợp lệ');
      await d
        .prepare(
          "INSERT INTO crm2_order_payments(id,tenant,order_id,kind,label,amount,due_date,status,created_by,created) VALUES (?,?,?,'INSTALLMENT',?,?,?,'PLANNED',?,?)",
        )
        .bind(
          crypto.randomUUID(),
          c.tenant,
          id,
          String(a.label ?? 'Đợt thanh toán').slice(0, 80),
          amount,
          due,
          c.userId,
          c.now,
        )
        .run();
      return reply({ ok: true });
    }
    case 'removeRow': {
      const r = await d
        .prepare(
          "UPDATE crm2_order_payments SET status='CANCELLED' WHERE tenant=? AND order_id=? AND id=? AND paid_amount=0",
        )
        .bind(c.tenant, id, String(a.paymentId))
        .run();
      return r.meta.changes ? reply({ ok: true }) : fail('Không xóa được đợt đã thu tiền', 409);
    }
    case 'schedule': {
      const rows = await liveRows(c.tenant, id);
      const paid = rows.reduce((s, r) => s + r.paidAmount, 0);
      const plan = buildSchedule({
        remaining: o.price - paid,
        installments: Number(a.installments),
        firstDue: String(a.firstDue ?? ''),
        intervalDays: Number(a.intervalDays),
      });
      if ('error' in plan) return fail(plan.error);
      // Unpaid planned rows are replaced; paid rows stay.
      await d
        .prepare(
          "UPDATE crm2_order_payments SET status='CANCELLED' WHERE tenant=? AND order_id=? AND paid_amount=0",
        )
        .bind(c.tenant, id)
        .run();
      for (const p of plan)
        await d
          .prepare(
            "INSERT INTO crm2_order_payments(id,tenant,order_id,kind,label,amount,due_date,status,created_by,created) VALUES (?,?,?,?,?,?,?,'PLANNED',?,?)",
          )
          .bind(
            crypto.randomUUID(),
            c.tenant,
            id,
            p.label === 'Thanh toán cuối' ? 'FINAL' : 'INSTALLMENT',
            p.label,
            p.amount,
            p.dueDate,
            c.userId,
            c.now,
          )
          .run();
      return reply({ ok: true, rows: plan.length });
    }
    case 'cancel': {
      const reason = String(a.reason ?? '').trim();
      if (!reason) return fail('Nhập lý do hủy đơn');
      const right = canCancelOrder(c.role, o.created, c.now);
      if (!right.allowed)
        return fail(
          right.needsOwner ? 'Quá 30 ngày: chỉ chủ cơ sở được hủy đơn' : 'Không có quyền hủy đơn',
          403,
        );
      const rows = await liveRows(c.tenant, id);
      const paid = rows.reduce((s, r) => s + r.paidAmount, 0);
      await d
        .prepare(
          "UPDATE crm2_orders SET status='CANCELLED',cancelled_at=?,cancel_reason=?,refund_due=?,updated=? WHERE tenant=? AND id=?",
        )
        .bind(c.now, reason.slice(0, 300), paid, c.now, c.tenant, id)
        .run();
      if (o.holdId)
        await d
          .prepare(
            "UPDATE crm2_holds SET status='RELEASED',updated=? WHERE tenant=? AND id=? AND status IN ('ACTIVE','CONVERTED')",
          )
          .bind(c.now, c.tenant, o.holdId)
          .run();
      await addActivity(
        c.tenant,
        o.leadId,
        'SYSTEM',
        `Hủy đơn ${o.code}: ${reason}`,
        c.userId,
        c.now,
        { orderId: id, refundDue: paid },
      );
      return reply({ ok: true, refundDue: paid });
    }
    case 'won': {
      // Closing the sale: the lead becomes a customer with the order price as the deal value.
      const lead = await getLeadRow(c.tenant, o.leadId);
      if (!lead) return fail('Không tìm thấy lead', 404);
      if (lead.stage === 'WON') return fail('Lead đã chốt', 409);
      return changeStage(c, o.leadId, { stage: 'WON', dealValue: o.price });
    }
    default:
      return fail('Thao tác không được hỗ trợ');
  }
}

void addTask;
