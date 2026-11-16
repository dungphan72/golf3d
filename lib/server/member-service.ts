import { tierInfo } from './tier-service';
import { db, type ServiceResult, audit } from './common';
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
import { parseMemberCode } from '../member-card';
import { verifyAccount, resetAccountPassword } from './member-account-service';
import { OFFICIAL_PACKAGES } from '../official-packages';
import { roomAllows, unitsForSession, PACKAGE_ROOM_LABELS, type PackageRoom } from '../package-use';
import { scopedShiftId } from '../finance';
import {
  CREATE_CUSTOMER_SQL,
  UPDATE_CUSTOMER_SQL,
  CREATE_PACKAGE_TYPE_SQL,
  UPDATE_PACKAGE_TYPE_SQL,
  DELETE_PACKAGE_TYPE_SQL,
  INSERT_PACKAGE_SQL,
  INSERT_PACKAGE_TERM_SQL,
  ACTIVATE_PACKAGE_SQL,
  ABSENCES_SQL,
  INSERT_PACKAGE_LEDGER_SQL,
  INSERT_PACKAGE_SALE_ENTRY_SQL,
  INSERT_REDEMPTION_SQL,
  PAY_BY_PACKAGE_SQL,
  INSERT_LOYALTY_SQL,
  CUSTOMER_LIST_SQL,
  CUSTOMER_PACKAGES_SQL,
  INSERT_WALLET_LEDGER_SQL,
  INSERT_WALLET_TOPUP_ENTRY_SQL,
  PAY_BY_WALLET_SQL,
  WALLET_BALANCE_SQL,
  WALLET_HISTORY_SQL,
} from '../package-sql';
import { walletBonus } from '../wallet';
import { activateCard, addAbsence, cancelAbsence, saleTerm } from './card-service';
import { expiryOnActivation } from '../card-term';

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
    ['WALLET_INSUFFICIENT', 'Số dư ví không đủ', 409],
    ['WALLET_SPEND_INVALID', 'Chỉ trả bằng ví cho phiên đã kết thúc, chưa thu tiền hay trừ gói', 409],
    ['WALLET_NOT_PAYABLE', 'Không ghi được khoản nạp ví vào sổ ca', 409],
    ['wallet_spend_once', 'Phiên này đã được trả bằng ví', 409],
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
    // A scanned or typed member code (HV-1A2B3C4D) finds exactly that customer.
    const code = parseMemberCode(q) ?? '';
    const customers = (
      await db().prepare(CUSTOMER_LIST_SQL).bind(tenant, q, phoneLike, like, code).all()
    ).results;
    const types = (
      await db()
        .prepare(
          'SELECT id,name,price,grants,valid_days,perks,section,room,active FROM package_types WHERE tenant=? ORDER BY price LIMIT 200',
        )
        .bind(tenant)
        .all()
    ).results;
    let detail: unknown = null;
    if (customerId) {
      const packages = (await db().prepare(CUSTOMER_PACKAGES_SQL).bind(tenant, customerId).all())
        .results;
      const orders = (
        await db()
          .prepare(
            "SELECT id,type_id,name,price,created FROM package_orders WHERE tenant=? AND customer_id=? AND status='pending' ORDER BY created",
          )
          .bind(tenant, customerId)
          .all()
      ).results;
      const wallet = {
        balance:
          (
            await db()
              .prepare(WALLET_BALANCE_SQL)
              .bind(tenant, customerId)
              .first<{ balance: number }>()
          )?.balance ?? 0,
        history: (await db().prepare(WALLET_HISTORY_SQL).bind(tenant, customerId).all()).results,
      };
      const absences = (await db().prepare(ABSENCES_SQL).bind(tenant, customerId).all()).results;
      detail = { customerId, packages, orders, wallet, absences, rank: await tierInfo(tenant, customerId) };
    }
    return reply({ customers, types, detail });
  } catch (e) {
    console.error('members load', e);
    return error('Chưa tải được hội viên. Kiểm tra migration 0005.', 503);
  }
}

/** Packages a customer can use for a given booking: matching kind, unexpired, allowed in the room, with the units the session needs. */
export async function usablePackages(tenant: string, bookingId: string) {
  try {
    const b = await db()
      .prepare(
        'SELECT service,phone,room,segments,status,amount FROM bookings WHERE tenant=? AND id=?',
      )
      .bind(tenant, bookingId)
      .first<{
        service: string;
        phone: string;
        room: string;
        segments: string;
        status: string;
        amount: number | null;
      }>();
    if (!b) return reply({ packages: [], wallet: null });
    // The wallet pays a whole finished bill; it is offered until something has been collected.
    const owner = await db()
      .prepare('SELECT id,name FROM customers WHERE tenant=? AND phone=?')
      .bind(tenant, normalizePhone(b.phone))
      .first<{ id: string; name: string }>();
    const balance = owner
      ? ((
          await db()
            .prepare(WALLET_BALANCE_SQL)
            .bind(tenant, owner.id)
            .first<{ balance: number }>()
        )?.balance ?? 0)
      : 0;
    const walletSpent = await db()
      .prepare(
        "SELECT -delta AS paid FROM wallet_ledger WHERE tenant=? AND booking_id=? AND reason='spend'",
      )
      .bind(tenant, bookingId)
      .first<{ paid: number }>();
    const wallet =
      owner && (balance > 0 || walletSpent)
        ? {
            customer: owner.name,
            balance,
            amount: b.amount ?? 0,
            enough: balance >= (b.amount ?? 0) && (b.amount ?? 0) > 0,
            payable: b.status === 'finished',
            paid: walletSpent?.paid ?? 0,
          }
        : null;
    const kind = kindForService(b.service);
    if (!kind) return reply({ packages: [], wallet });
    const units = unitsForSession(b.service, JSON.parse(b.segments));
    const rows = (
      await db()
        .prepare(
          `SELECT cp.id,cp.name,cp.expires,cp.room,bal.remaining,c.name AS customer FROM customer_packages cp
           JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
           JOIN package_balances bal ON bal.package_id=cp.id AND bal.tenant=cp.tenant AND bal.kind=?
           WHERE cp.tenant=? AND c.phone=? AND cp.expires>=? AND bal.remaining>0 ORDER BY cp.expires LIMIT 20`,
        )
        .bind(kind, tenant, normalizePhone(b.phone), Date.now())
        .all<{
          id: string;
          name: string;
          expires: number;
          room: string;
          remaining: number;
          customer: string;
        }>()
    ).results.filter((p) => roomAllows(p.room, b.room));
    const redemption = await db()
      .prepare('SELECT covered,units FROM package_redemptions WHERE tenant=? AND booking_id=?')
      .bind(tenant, bookingId)
      .first<{ covered: number; units: number }>();
    return reply({
      packages: rows.map((p) => ({ ...p, enough: p.remaining >= units })),
      kind,
      units,
      covered: redemption?.covered ?? 0,
      usedUnits: redemption?.units ?? 0,
      wallet,
    });
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
    if (input.action === 'order-reject') {
      const r = await d
        .prepare(
          "UPDATE package_orders SET status='rejected',handled_by=?,handled_at=? WHERE tenant=? AND id=? AND status='pending'",
        )
        .bind(actor, now, tenant, input.id)
        .run();
      return r.meta.changes ? reply({ ok: true }) : error('Yêu cầu đã được xử lý', 409);
    }
    if (input.action === 'account-verify') return verifyAccount(tenant, input.customerId);
    if (input.action === 'account-reset') return resetAccountPassword(tenant, input.customerId);
    if (input.action === 'customer-update') {
      const r = await d
        .prepare(UPDATE_CUSTOMER_SQL)
        .bind(input.name, input.note, tenant, input.id)
        .run();
      return r.meta.changes ? reply({ ok: true }) : error('Không tìm thấy khách hàng', 404);
    }
    if (input.action === 'type-delete') {
      const row = await d
        .prepare('SELECT name FROM package_types WHERE tenant=? AND id=?')
        .bind(tenant, input.id)
        .first<{ name: string }>();
      if (!row) return error('Không tìm thấy gói', 404);
      const sold = await d
        .prepare('SELECT 1 AS x FROM customer_packages WHERE tenant=? AND type_id=? LIMIT 1')
        .bind(tenant, input.id)
        .first();
      if (sold) {
        // Customers own it: archive (stop selling), never remove the type they point at.
        await d
          .prepare('UPDATE package_types SET active=0 WHERE tenant=? AND id=?')
          .bind(tenant, input.id)
          .run();
        await audit(tenant, 'Ngừng bán gói', row.name);
        return reply({ ok: true, archived: true });
      }
      // Never sold: a real delete. The protective trigger is lifted for this one statement only and
      // put back in the same transaction.
      await d.batch([
        d.prepare('DROP TRIGGER IF EXISTS package_types_no_delete'),
        d.prepare('DELETE FROM package_types WHERE tenant=? AND id=?').bind(tenant, input.id),
        d.prepare(
          "CREATE TRIGGER IF NOT EXISTS package_types_no_delete BEFORE DELETE ON package_types BEGIN SELECT RAISE(ABORT,'ARCHIVE_PACKAGE_INSTEAD'); END",
        ),
      ]);
      await audit(tenant, 'Xóa gói', row.name);
      return reply({ ok: true, archived: false });
    }
    if (input.action === 'types-official') {
      // The official catalogue becomes the only one on sale. Anything else is archived (not deleted:
      // customers may already own it); official packages are created or restored to official values.
      const rows = (
        await d
          .prepare('SELECT id,name,active FROM package_types WHERE tenant=?')
          .bind(tenant)
          .all<{ id: string; name: string; active: number }>()
      ).results;
      const official = new Map(OFFICIAL_PACKAGES.map((p) => [p.name, p]));
      const stmts = [];
      let archived = 0;
      let created = 0;
      for (const r of rows) {
        const o = official.get(r.name);
        if (!o) {
          if (r.active) {
            stmts.push(d.prepare('UPDATE package_types SET active=0 WHERE tenant=? AND id=?').bind(tenant, r.id));
            archived++;
          }
        } else {
          stmts.push(
            d
              .prepare(UPDATE_PACKAGE_TYPE_SQL)
              .bind(o.name, o.price, JSON.stringify(o.grants), o.validDays, o.perks, 1, o.section, 'any', tenant, r.id),
          );
        }
      }
      const have = new Set(rows.map((r) => r.name));
      for (const o of OFFICIAL_PACKAGES) {
        if (have.has(o.name)) continue;
        created++;
        stmts.push(
          d
            .prepare(CREATE_PACKAGE_TYPE_SQL)
            .bind(crypto.randomUUID(), tenant, o.name, o.price, JSON.stringify(o.grants), o.validDays, o.perks, 1, now, o.section, 'any'),
        );
      }
      if (stmts.length) await d.batch(stmts);
      await audit(tenant, 'Danh mục gói chính thức', `Thêm ${created}, ngừng bán ${archived}`);
      return reply({ ok: true, created, archived });
    }
    if (input.action === 'types-seed') {
      const existingRows = (
        await d
          .prepare('SELECT name FROM package_types WHERE tenant=?')
          .bind(tenant)
          .all<{ name: string }>()
      ).results;
      const existingNames = new Set(existingRows.map((r) => r.name));
      const toInsert = OFFICIAL_PACKAGES.filter((p) => !existingNames.has(p.name));
      if (!toInsert.length) return error('Đã có đầy đủ danh mục gói mẫu; hãy sửa từng gói', 409);
      await d.batch(
        toInsert.map((p) =>
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
              p.section,
              'any',
            ),
        ),
      );
      return reply({ ok: true, created: toInsert.length });
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
            input.section,
            input.room,
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
          input.section,
          input.room,
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
          room: string;
        }>();
      if (!type) return error('Gói không tồn tại hoặc đã ngừng bán', 404);
      const shift = await d
        .prepare("SELECT id FROM shifts WHERE tenant=? AND status='open'")
        .bind(tenant)
        .first<{ id: string }>();
      if (!shift) return error('Hãy mở ca trước khi bán gói', 409);
      const grants = JSON.parse(type.grants) as Grant[];
      const term = saleTerm(now, type.valid_days, grants);
      await d.batch([
        d
          .prepare(INSERT_PACKAGE_TERM_SQL)
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
            term.expires,
            actor,
            type.room,
            type.valid_days,
            term.activatedAt,
            term.activateBy,
            null,
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
        ...(input.orderId
          ? [
              d
                .prepare(
                  "UPDATE package_orders SET status='confirmed',package_id=?,handled_by=?,handled_at=? WHERE tenant=? AND id=? AND customer_id=? AND status='pending'",
                )
                .bind(packageId, actor, now, tenant, input.orderId, input.customerId),
            ]
          : []),
      ]);
      return reply({ ok: true, packageId });
    }
    if (input.action === 'activate') return activateCard(tenant, input.packageId, undefined, now);
    if (input.action === 'absence-create')
      return addAbsence(tenant, actor, 'staff', input, undefined, now);
    if (input.action === 'absence-cancel') return cancelAbsence(tenant, input.id, undefined, now);
    if (input.action === 'redeem') {
      const b = await d
        .prepare(
          'SELECT id,status,service,room,segments,amount,golf_amount,payment FROM bookings WHERE tenant=? AND id=?',
        )
        .bind(tenant, input.bookingId)
        .first<{
          id: string;
          status: string;
          service: string;
          room: string;
          segments: string;
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
      const pkg = await d
        .prepare(
          'SELECT room,valid_days,activated_at,activate_by FROM customer_packages WHERE tenant=? AND id=?',
        )
        .bind(tenant, input.packageId)
        .first<{
          room: string;
          valid_days: number;
          activated_at: number | null;
          activate_by: number | null;
        }>();
      if (!pkg) return error('Không tìm thấy gói của khách', 404);
      if (!roomAllows(pkg.room, b.room))
        return error(
          `Gói ${PACKAGE_ROOM_LABELS[pkg.room as PackageRoom]?.toLowerCase() ?? pkg.room} không dùng được cho phòng VIP. Hãy thu tiền hoặc dùng gói VIP.`,
          409,
        );
      // Hourly packages are charged in hours of play; a hole round always costs one unit.
      const units = unitsForSession(b.service, JSON.parse(b.segments));
      const left = await d
        .prepare(
          'SELECT remaining FROM package_balances WHERE tenant=? AND package_id=? AND kind=?',
        )
        .bind(tenant, input.packageId, kind)
        .first<{ remaining: number }>();
      if ((left?.remaining ?? 0) < units)
        return error(
          `Gói chỉ còn ${left?.remaining ?? 0} ${kind === 'gdr' ? 'giờ' : 'lượt'}, phiên này cần ${units}. Hãy thu tiền hoặc chọn gói khác.`,
          409,
        );
      const remainingDue = b.amount - b.golf_amount;
      // A monthly card starts its term the first time it is used.
      const pending = pkg.activated_at == null && pkg.activate_by != null;
      const statements = [
        ...(pending
          ? [
              d
                .prepare(ACTIVATE_PACKAGE_SQL)
                .bind(now, expiryOnActivation(now, pkg.valid_days), tenant, input.packageId),
            ]
          : []),
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
            units,
          ),
        d
          .prepare(INSERT_PACKAGE_LEDGER_SQL)
          .bind(
            crypto.randomUUID(),
            tenant,
            input.packageId,
            kind,
            -units,
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
      return reply({ ok: true, remainingDue, paid: remainingDue === 0, units });
    }
    if (input.action === 'wallet-topup') {
      const topupId = await scopedShiftId(tenant, 'wtop-' + input.requestId);
      const old = await d
        .prepare('SELECT customer_id FROM wallet_ledger WHERE tenant=? AND id=?')
        .bind(tenant, topupId)
        .first<{ customer_id: string }>();
      if (old)
        return old.customer_id === input.customerId
          ? reply({ ok: true, replayed: true })
          : error('Mã yêu cầu đã dùng cho thao tác khác', 409);
      const shift = await d
        .prepare("SELECT id FROM shifts WHERE tenant=? AND status='open'")
        .bind(tenant)
        .first<{ id: string }>();
      if (!shift) return error('Hãy mở ca trước khi nạp tiền', 409);
      const bonus = walletBonus(input.amount);
      const statements = [
        d
          .prepare(INSERT_WALLET_LEDGER_SQL)
          .bind(topupId, tenant, input.customerId, input.amount, 'topup', null, actor, '', now),
        ...(bonus > 0
          ? [
              d
                .prepare(INSERT_WALLET_LEDGER_SQL)
                .bind(
                  await scopedShiftId(tenant, 'wbon-' + input.requestId),
                  tenant,
                  input.customerId,
                  bonus,
                  'bonus',
                  null,
                  actor,
                  'Tặng khi nạp ' + input.amount.toLocaleString('vi-VN') + 'đ',
                  now,
                ),
            ]
          : []),
        d
          .prepare(INSERT_WALLET_TOPUP_ENTRY_SQL)
          .bind(
            crypto.randomUUID(),
            tenant,
            shift.id,
            input.method,
            input.amount,
            'wtop-' + input.requestId,
            'Nạp ví',
            actor,
            now,
            topupId,
          ),
      ];
      await d.batch(statements);
      const total = await d
        .prepare(WALLET_BALANCE_SQL)
        .bind(tenant, input.customerId)
        .first<{ balance: number }>();
      return reply({ ok: true, bonus, balance: total?.balance ?? 0 });
    }
    if (input.action === 'wallet-pay') {
      const b = await d
        .prepare('SELECT id,status,phone,amount FROM bookings WHERE tenant=? AND id=?')
        .bind(tenant, input.bookingId)
        .first<{ id: string; status: string; phone: string; amount: number | null }>();
      if (!b) return error('Không tìm thấy phiếu', 404);
      const prior = await d
        .prepare(
          "SELECT 1 AS x FROM wallet_ledger WHERE tenant=? AND booking_id=? AND reason='spend'",
        )
        .bind(tenant, b.id)
        .first();
      if (prior) return reply({ ok: true, replayed: true });
      if (b.status !== 'finished' || !b.amount || b.amount <= 0)
        return error('Chỉ trả bằng ví cho phiên đã kết thúc và còn tiền phải thu', 409);
      const owner = await d
        .prepare('SELECT id FROM customers WHERE tenant=? AND phone=?')
        .bind(tenant, normalizePhone(b.phone))
        .first<{ id: string }>();
      if (!owner) return error('Khách chưa có hồ sơ hội viên (số điện thoại không khớp)', 404);
      const have =
        (await d.prepare(WALLET_BALANCE_SQL).bind(tenant, owner.id).first<{ balance: number }>())
          ?.balance ?? 0;
      if (have < b.amount)
        return error(
          `Số dư ví ${have.toLocaleString('vi-VN')}đ không đủ cho phiếu ${b.amount.toLocaleString('vi-VN')}đ`,
          409,
        );
      await d.batch([
        d
          .prepare(INSERT_WALLET_LEDGER_SQL)
          .bind(crypto.randomUUID(), tenant, owner.id, -b.amount, 'spend', b.id, actor, '', now),
        d.prepare(PAY_BY_WALLET_SQL).bind(tenant, b.id, b.amount),
      ]);
      return reply({ ok: true, paid: true, balance: have - b.amount });
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
          'any',
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
