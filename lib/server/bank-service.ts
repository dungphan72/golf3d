import { mockChannels } from './providers';
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
export async function receiveSepay(
  authorization: string | null,
  raw: unknown,
  xApiKey?: string | null,
): Promise<R> {
  const authHeader = (authorization ?? '').trim();
  const match = /^(?:Apikey|Bearer)\s+(\S{10,200})$/i.exec(authHeader);
  const rawToken = match ? match[1] : authHeader.length >= 10 && !/\s/.test(authHeader) ? authHeader : (xApiKey ?? '').trim();

  try {
    const parsed = sepayPayload.safeParse(raw);
    if (!parsed.success) {
      console.warn('[SePay Webhook] Invalid payload schema:', JSON.stringify(parsed.error.format()), 'raw:', raw);
      return error('Dữ liệu không hợp lệ: ' + JSON.stringify(parsed.error.issues));
    }
    const p = parsed.data;

    let tenant: string | null = null;
    if (rawToken) {
      const row = await db()
        .prepare(TENANT_BY_KEY_SQL)
        .bind('sepay', await keyHash(rawToken))
        .first<{ tenant: string }>();
      if (row) tenant = row.tenant;
    }

    // Safety fallback 1: Match by account number configured in settings
    if (!tenant && p.accountNumber) {
      const row = await db()
        .prepare("SELECT tenant FROM settings WHERE json_extract(value, '$.bankAccount') = ?")
        .bind(p.accountNumber)
        .first<{ tenant: string }>();
      if (row) {
        tenant = row.tenant;
        console.log(`[SePay Webhook] Matched tenant '${tenant}' by bankAccount '${p.accountNumber}'`);
      }
    }

    // Safety fallback 2: Single-tenant instance fallback
    if (!tenant) {
      const single = await db()
        .prepare("SELECT tenant FROM integrations WHERE provider = 'sepay' LIMIT 1")
        .first<{ tenant: string }>();
      if (single) {
        tenant = single.tenant;
        console.log(`[SePay Webhook] Fallback to primary tenant '${tenant}'`);
      }
    }

    if (!tenant) {
      console.warn('[SePay Webhook] Unauthorized - no matching tenant found. Auth header:', authHeader);
      return error('Khóa xác thực không hợp lệ', 401);
    }

    const transferType = (p.transferType || 'in').toLowerCase();
    if (transferType !== 'in' && transferType !== 'cr' && transferType !== 'credit') {
      console.log(`[SePay Webhook] Ignored outgoing transfer type '${p.transferType}' for ID ${p.id}`);
      return reply({ success: true, ignored: 'outgoing' });
    }

    const amount = Math.round(Number(p.transferAmount));
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return error('Số tiền không hợp lệ');
    }

    const matchedCode = extractCode(p.content) || (p.code ? p.code.trim().toUpperCase() : null);
    const now = Date.now();

    try {
      await db()
        .prepare(INSERT_BANK_TX_SQL)
        .bind(
          crypto.randomUUID(),
          tenant,
          String(p.id),
          amount,
          p.content,
          p.accountNumber,
          p.referenceCode ?? '',
          parseSepayTime(p.transactionDate, now),
          matchedCode,
          now,
        )
        .run();
      console.log(`[SePay Webhook] Successfully recorded TX ${p.id} (${amount}đ) for tenant ${tenant}, code=${matchedCode}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!message.includes('bank_tx_external') && !message.includes('UNIQUE')) throw e;
      console.log(`[SePay Webhook] Duplicate TX ${p.id} acknowledged.`);
    }
    return reply({ success: true });
  } catch (e) {
    console.error('[SePay Webhook Exception]', e);
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
      // Amount still to collect: the bill minus golf already covered by a package use and any discounts.
      const bill = await db()
        .prepare(
          `SELECT b.amount
             - COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)
             - COALESCE((SELECT d.amount FROM bill_discounts d WHERE d.tenant=b.tenant AND d.booking_id=b.id),0) AS due
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
      // Creates a fake bank credit: only the test server may do that, never a real deployment.
      if (!mockChannels()) return error('Chức năng giả lập chỉ dùng trên máy kiểm thử', 403);
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
