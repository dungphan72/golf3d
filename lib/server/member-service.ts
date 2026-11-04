import { db, type ServiceResult } from './common';
import {
  memberInput,
  normalizePhone,
  validPhone,
  kindForService,
  POINTS_PER_FREE_ROUND,
  FREE_ROUND_VALID_DAYS,
  type Grant,
  type MemberInput,
} from '../member';
import { OFFICIAL_PACKAGES } from '../official-packages';
import { scopedShiftId } from '../finance';
import {
  CREATE_CUSTOMER_SQL,
  UPDATE_CUSTOMER_SQL,
  CREATE_PACKAGE_TYPE_SQL,
  UPDATE_PACKAGE_TYPE_SQL,
  INSERT_PACKAGE_SQL,
  INSERT_PACKAGE_LEDGER_SQL,
  INSERT_PACKAGE_SALE_ENTRY_SQL,
  INSERT_REDEMPTION_SQL,
  PAY_BY_PACKAGE_SQL,
  INSERT_LOYALTY_SQL,
  CUSTOMER_LIST_SQL,
  CUSTOMER_PACKAGES_SQL,
} from '../package-sql';

export { memberInput };
type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);
const DAY = 86_400_000;

/** Maps trigger/constraint failures to messages staff can act on. */
function explain(e: unknown): R {
  const message = e instanceof Error ? e.message : String(e);
  const table: [string, string, number][] = [
    ['SHIFT_NOT_OPEN', 'Hãy mở ca trước khi bán gói hoặc thu tiền', 409],
    ['customers.tenant, customers.phone', 'Số điện thoại này đã có khách hàng', 409],
    ['INVALID_CUSTOMER', 'Tên hoặc số điện thoại không hợp lệ', 400],
    ['INVALID_PACKAGE_TYPE', 'Thông tin gói không hợp lệ', 400],
    ['CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng', 404],
    [
      'BOOKING_NOT_REDEEMABLE',
      'Chỉ trả bằng gói cho phiên đã kết thúc, có tiền golf và đúng loại dịch vụ',
      409,
    ],
    [
      'PACKAGE_CUSTOMER_MISMATCH',
      'Gói này không thuộc khách của phiên (số điện thoại không khớp)',
      409,
    ],
    ['PACKAGE_EXPIRED', 'Gói đã hết hạn', 409],
    ['PACKAGE_EMPTY', 'Gói đã hết lượt', 409],
    ['redemption_once', 'Phiên này đã được trả bằng gói', 409],
    [
      'package_redemptions.tenant, package_redemptions.booking_id',
      'Phiên này đã được trả bằng gói',
      409,
    ],
    ['package_paid_once', 'Gói này đã được ghi thu tiền', 409],
    [
      'PAYMENT_REQUIRES_LEDGER',
      'Còn phần tiền phải thu ngoài gói (ví dụ F&B). Hãy thu phần còn lại.',
      409,
    ],
    ['POINTS_INSUFFICIENT', 'Chưa đủ điểm để đổi', 409],
    ['finance_request_once', 'Mã yêu cầu đã dùng cho thao tác khác', 409],
    ['ADJUST_REASON_REQUIRED', 'Cần ghi lý do điều chỉnh', 400],
  ];
  for (const [needle, text, status] of table)
    if (message.includes(needle)) return error(text, status);
  console.error('member operation', e);
  return error('Chưa xác minh được kết quả. Tải lại trước khi thử tiếp.', 500);
}

export async function loadMembers(tenant: string, query: string, customerId: string | null) {
  try {
    const q = query.trim().replace(/[%_]/g, '');
    const like = `%${q}%`;
    const phoneLike = `%${normalizePhone(q)}%`;
    const customers = (await db().prepare(CUSTOMER_LIST_SQL).bind(tenant, q, phoneLike, like).all())
      .results;
    const types = (
      await db()
        .prepare(
          'SELECT id,name,price,grants,valid_days,perks,active FROM package_types WHERE tenant=? ORDER BY price LIMIT 200',
        )
        .bind(tenant)
        .all()
    ).results;
    let detail: unknown = null;
    if (customerId) {
      const packages = (await db().prepare(CUSTOMER_PACKAGES_SQL).bind(tenant, customerId).all())
        .results;
      detail = { customerId, packages };
    }
    return reply({ customers, types, detail });
  } catch (e) {
    console.error('members load', e);
    return error('Chưa tải được hội viên. Kiểm tra migration 0005.', 503);
  }
}

/** Packages a customer can still use for a given booking (matching kind, unexpired, non-empty). */
export async function usablePackages(tenant: string, bookingId: string) {
  try {
    const b = await db()
      .prepare('SELECT service,phone FROM bookings WHERE tenant=? AND id=?')
      .bind(tenant, bookingId)
      .first<{ service: string; phone: string }>();
    const kind = b ? kindForService(b.service) : null;
    if (!b || !kind) return reply({ packages: [] });
    const rows = (
      await db()
        .prepare(
          `SELECT cp.id,cp.name,cp.expires,bal.remaining,c.name AS customer FROM customer_packages cp
           JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
           JOIN package_balances bal ON bal.package_id=cp.id AND bal.tenant=cp.tenant AND bal.kind=?
           WHERE cp.tenant=? AND c.phone=? AND cp.expires>=? AND bal.remaining>0 ORDER BY cp.expires LIMIT 20`,
        )
        .bind(kind, tenant, normalizePhone(b.phone), Date.now())
        .all()
    ).results;
    const redemption = await db()
      .prepare('SELECT covered FROM package_redemptions WHERE tenant=? AND booking_id=?')
      .bind(tenant, bookingId)
      .first<{ covered: number }>();
    return reply({ packages: rows, kind, covered: redemption?.covered ?? 0 });
  } catch (e) {
    console.error('usable packages', e);
    return error('Chưa tải được gói của khách', 503);
  }
}

export async function applyMember(tenant: string, actor: string, input: MemberInput): Promise<R> {
  const now = Date.now();
  const d = db();
  try {
    if (input.action === 'customer-create') {
      const phone = normalizePhone(input.phone);
      if (!validPhone(phone)) return error('Số điện thoại không hợp lệ');
      const id = crypto.randomUUID();
      await d
        .prepare(CREATE_CUSTOMER_SQL)
        .bind(id, tenant, input.name, phone, input.note, now)
        .run();
      return reply({ ok: true, id });
    }
    if (input.action === 'customer-update') {
      const r = await d
        .prepare(UPDATE_CUSTOMER_SQL)
        .bind(input.name, input.note, tenant, input.id)
        .run();
      return r.meta.changes ? reply({ ok: true }) : error('Không tìm thấy khách hàng', 404);
    }
    if (input.action === 'types-seed') {
      const existing = await d
        .prepare('SELECT COUNT(*) AS n FROM package_types WHERE tenant=?')
        .bind(tenant)
        .first<{ n: number }>();
      if (existing && existing.n > 0) return error('Đã có danh mục gói; hãy sửa từng gói', 409);
      await d.batch(
        OFFICIAL_PACKAGES.map((p) =>
          d
            .prepare(CREATE_PACKAGE_TYPE_SQL)
            .bind(
              crypto.randomUUID(),
              tenant,
              p.name,
              p.price,
              JSON.stringify(p.grants),
              p.validDays,
              p.perks,
              1,
              now,
            ),
        ),
      );
      return reply({ ok: true, created: OFFICIAL_PACKAGES.length });
    }
    if (input.action === 'type-save') {
      const grants = JSON.stringify(input.grants);
      if (input.id) {
        const r = await d
          .prepare(UPDATE_PACKAGE_TYPE_SQL)
          .bind(
            input.name,
            input.price,
            grants,
            input.validDays,
            input.perks,
            input.active ? 1 : 0,
            tenant,
            input.id,
          )
          .run();
        return r.meta.changes ? reply({ ok: true }) : error('Không tìm thấy gói', 404);
      }
      const id = await scopedShiftId(tenant, 'ptype-' + input.requestId);
      const old = await d
        .prepare('SELECT id FROM package_types WHERE tenant=? AND id=?')
        .bind(tenant, id)
        .first();
      if (old) return reply({ ok: true, replayed: true });
      await d
        .prepare(CREATE_PACKAGE_TYPE_SQL)
        .bind(
          id,
          tenant,
          input.name,
          input.price,
          grants,
          input.validDays,
          input.perks,
          input.active ? 1 : 0,
          now,
        )
        .run();
      return reply({ ok: true });
    }
    if (input.action === 'sell') {
      const packageId = await scopedShiftId(tenant, 'pkg-' + input.requestId);
      const already = await d
        .prepare('SELECT customer_id,name FROM customer_packages WHERE tenant=? AND id=?')
        .bind(tenant, packageId)
        .first<{ customer_id: string; name: string }>();
      if (already)
        return already.customer_id === input.customerId
          ? reply({ ok: true, replayed: true, packageId })
          : error('Mã yêu cầu đã dùng cho thao tác khác', 409);
      const type = await d
        .prepare('SELECT * FROM package_types WHERE tenant=? AND id=? AND active=1')
        .bind(tenant, input.typeId)
        .first<{
          id: string;
          name: string;
          price: number;
          grants: string;
          valid_days: number;
          perks: string;
        }>();
      if (!type) return error('Gói không tồn tại hoặc đã ngừng bán', 404);
      const shift = await d
        .prepare("SELECT id FROM shifts WHERE tenant=? AND status='open'")
        .bind(tenant)
        .first<{ id: string }>();
      if (!shift) return error('Hãy mở ca trước khi bán gói', 409);
      const grants = JSON.parse(type.grants) as Grant[];
      await d.batch([
        d
          .prepare(INSERT_PACKAGE_SQL)
          .bind(
            packageId,
            tenant,
            input.customerId,
            type.id,
            type.name,
            'sale',
            type.price,
            type.grants,
            type.perks,
            now,
            now + type.valid_days * DAY,
            actor,
          ),
        ...grants.map((g) =>
          d
            .prepare(INSERT_PACKAGE_LEDGER_SQL)
            .bind(
              crypto.randomUUID(),
              tenant,
              packageId,
              g.kind,
              g.qty,
              'grant',
              null,
              actor,
              '',
              now,
            ),
        ),
        d
          .prepare(INSERT_PACKAGE_SALE_ENTRY_SQL)
          .bind(
            crypto.randomUUID(),
            tenant,
            shift.id,
            input.method,
            type.price,
            'pkg-' + input.requestId,
            'Bán gói ' + type.name,
            actor,
            now,
            packageId,
          ),
      ]);
      return reply({ ok: true, packageId });
    }
    if (input.action === 'redeem') {
      const b = await d
        .prepare(
          'SELECT id,status,service,amount,golf_amount,payment FROM bookings WHERE tenant=? AND id=?',
        )
        .bind(tenant, input.bookingId)
        .first<{
          id: string;
          status: string;
          service: string;
          amount: number | null;
          golf_amount: number | null;
        }>();
      if (!b) return error('Không tìm thấy phiếu', 404);
      const prior = await d
        .prepare('SELECT package_id FROM package_redemptions WHERE tenant=? AND booking_id=?')
        .bind(tenant, b.id)
        .first<{ package_id: string }>();
      if (prior)
        return prior.package_id === input.packageId
          ? reply({ ok: true, replayed: true })
          : error('Phiên này đã được trả bằng gói khác', 409);
      const kind = kindForService(b.service);
      if (
        !kind ||
        b.status !== 'finished' ||
        !b.golf_amount ||
        b.golf_amount <= 0 ||
        b.amount == null
      )
        return error('Chỉ trả bằng gói cho phiên đã kết thúc, có tiền golf', 409);
      const remainingDue = b.amount - b.golf_amount;
      const statements = [
        d
          .prepare(INSERT_REDEMPTION_SQL)
          .bind(
            crypto.randomUUID(),
            tenant,
            b.id,
            input.packageId,
            kind,
            b.golf_amount,
            actor,
            now,
          ),
        d
          .prepare(INSERT_PACKAGE_LEDGER_SQL)
          .bind(
            crypto.randomUUID(),
            tenant,
            input.packageId,
            kind,
            -1,
            'use',
            b.id,
            actor,
            '',
            now,
          ),
      ];
      if (remainingDue === 0)
        statements.push(d.prepare(PAY_BY_PACKAGE_SQL).bind(tenant, b.id, b.amount));
      await d.batch(statements);
      return reply({ ok: true, remainingDue, paid: remainingDue === 0 });
    }
    if (input.action === 'adjust') {
      const id = await scopedShiftId(tenant, 'padj-' + input.requestId);
      const dupe = await d
        .prepare('SELECT id FROM package_ledger WHERE tenant=? AND id=?')
        .bind(tenant, id)
        .first();
      if (dupe) return reply({ ok: true, replayed: true });
      await d
        .prepare(INSERT_PACKAGE_LEDGER_SQL)
        .bind(
          id,
          tenant,
          input.packageId,
          input.kind,
          input.delta,
          'adjust',
          null,
          actor,
          input.note,
          now,
        )
        .run();
      return reply({ ok: true });
    }
    // points-redeem: 10 points buy one free round, delivered as a zero-price package.
    const packageId = await scopedShiftId(tenant, 'ploy-' + input.requestId);
    const dupe = await d
      .prepare('SELECT id FROM customer_packages WHERE tenant=? AND id=?')
      .bind(tenant, packageId)
      .first();
    if (dupe) return reply({ ok: true, replayed: true, packageId });
    const kind = input.service === '9' ? 'holes9' : 'holes18';
    const grants = JSON.stringify([{ kind, qty: 1 }]);
    await d.batch([
      d
        .prepare(INSERT_LOYALTY_SQL)
        .bind(
          crypto.randomUUID(),
          tenant,
          input.customerId,
          -POINTS_PER_FREE_ROUND,
          'redeem',
          null,
          actor,
          now,
        ),
      d
        .prepare(INSERT_PACKAGE_SQL)
        .bind(
          packageId,
          tenant,
          input.customerId,
          null,
          `Lượt miễn phí ${input.service} hố (đổi điểm)`,
          'loyalty',
          0,
          grants,
          '',
          now,
          now + FREE_ROUND_VALID_DAYS * DAY,
          actor,
        ),
      d
        .prepare(INSERT_PACKAGE_LEDGER_SQL)
        .bind(crypto.randomUUID(), tenant, packageId, kind, 1, 'grant', null, actor, '', now),
    ]);
    return reply({ ok: true, packageId });
  } catch (e) {
    return explain(e);
  }
}
