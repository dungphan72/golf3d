import { db, type ServiceResult } from './common';
import { tokenId } from '../auth/password';
import {
  sepayPayload,
  extractCode,
  paymentCode,
  parseSepayTime,
  bankInput,
  type BankInput,
} from '../bank';
import {
  SET_INTEGRATION_SQL,
  CLEAR_INTEGRATION_SQL,
  TENANT_BY_KEY_SQL,
  INSERT_BANK_TX_SQL,
  IGNORE_BANK_TX_SQL,
  BANK_TX_FOR_CODE_SQL,
  BANK_TX_RECENT_SQL,
} from '../bank-sql';

export { bankInput };
type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);

const keyHash = (key: string) => tokenId('sepay:' + key);

/**
 * SePay calls this for every transaction on the linked account:
 *   Authorization: Apikey <key the owner configured in both SePay and the admin settings>
 * Only incoming money is stored. Retries (same transaction id) are acknowledged without a duplicate.
 * Nothing is paid automatically: staff confirm the matching bill in the payment dialog.
 */
export async function receiveSepay(authorization: string | null, raw: unknown): Promise<R> {
  const match = /^(?:Apikey|Bearer)\s+(\S{16,200})$/i.exec(authorization ?? '');
  if (!match) return error('Thiếu khóa xác thực', 401);
  try {
    const row = await db()
      .prepare(TENANT_BY_KEY_SQL)
      .bind('sepay', await keyHash(match[1]))
      .first<{ tenant: string }>();
    if (!row) return error('Khóa xác thực không hợp lệ', 401);
    const parsed = sepayPayload.safeParse(raw);
    if (!parsed.success) return error('Dữ liệu không hợp lệ');
    const p = parsed.data;
    if (p.transferType !== 'in') return reply({ success: true, ignored: 'outgoing' });
    if (!Number.isSafeInteger(p.transferAmount) || p.transferAmount <= 0)
      return error('Số tiền không hợp lệ');
    const now = Date.now();
    try {
      await db()
        .prepare(INSERT_BANK_TX_SQL)
        .bind(
          crypto.randomUUID(),
          row.tenant,
          String(p.id),
          p.transferAmount,
          p.content,
          p.accountNumber,
          p.referenceCode ?? '',
          parseSepayTime(p.transactionDate, now),
          extractCode(p.content),
          now,
        )
        .run();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!message.includes('bank_tx_external') && !message.includes('UNIQUE')) throw e;
    }
    return reply({ success: true });
  } catch (e) {
    console.error('sepay webhook', e);
    return error('Chưa xử lý được giao dịch', 500);
  }
}

export async function bankOverview(tenant: string, bookingId: string | null): Promise<R> {
  try {
    const configured = !!(await db()
      .prepare('SELECT 1 AS x FROM integrations WHERE tenant=? AND provider=?')
      .bind(tenant, 'sepay')
      .first());
    if (bookingId) {
      const code = paymentCode(bookingId);
      const rows = (await db().prepare(BANK_TX_FOR_CODE_SQL).bind(tenant, code).all()).results;
      // Amount still to collect: the bill minus golf already covered by a package use.
      const bill = await db()
        .prepare(
          `SELECT b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0) AS due
           FROM bookings b WHERE b.tenant=? AND b.id=?`,
        )
        .bind(tenant, bookingId)
        .first<{ due: number | null }>();
      return reply({
        configured,
        code,
        due: bill?.due ?? null,
        transactions: rows.filter((r) => r.status === 'received'),
      });
    }
    const rows = (await db().prepare(BANK_TX_RECENT_SQL).bind(tenant).all()).results;
    return reply({ configured, transactions: rows });
  } catch (e) {
    console.error('bank overview', e);
    return error('Chưa tải được giao dịch ngân hàng. Kiểm tra migration 0008.', 503);
  }
}

export async function applyBank(tenant: string, input: BankInput): Promise<R> {
  try {
    if (input.action === 'set-key') {
      await db()
        .prepare(SET_INTEGRATION_SQL)
        .bind(tenant, 'sepay', await keyHash(input.key), Date.now())
        .run();
      return reply({ ok: true });
    }
    if (input.action === 'clear-key') {
      await db().prepare(CLEAR_INTEGRATION_SQL).bind(tenant, 'sepay').run();
      return reply({ ok: true });
    }
    if (input.action === 'simulate-tx') {
      const now = Date.now();
      const txId = crypto.randomUUID();
      await db()
        .prepare(INSERT_BANK_TX_SQL)
        .bind(
          txId,
          tenant,
          'SEPAY-SIM-' + now,
          input.amount,
          input.content,
          input.account,
          'SEPAY.MY.' + String(now).slice(-6),
          now,
          extractCode(input.content),
          now,
        )
        .run();
      return reply({ ok: true, id: txId, code: extractCode(input.content) });
    }
    const r = await db().prepare(IGNORE_BANK_TX_SQL).bind(tenant, input.id).run();
    return r.meta.changes ? reply({ ok: true }) : error('Giao dịch đã được xử lý', 409);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('integration_key')) return error('Khóa này đã được cơ sở khác dùng', 409);
    console.error('bank apply', e);
    return error('Chưa xác minh được kết quả', 500);
  }
}
