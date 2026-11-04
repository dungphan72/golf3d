// Bank transfers received through the SePay webhook. Dedupe, immutability and "a transaction can only
// be used for one booking that was really paid by transfer" are enforced by migration 0008 triggers.
export const SET_INTEGRATION_SQL = `INSERT INTO integrations(tenant,provider,key_hash,updated) VALUES (?,?,?,?) ON CONFLICT(tenant,provider) DO UPDATE SET key_hash=excluded.key_hash,updated=excluded.updated`;
export const CLEAR_INTEGRATION_SQL = `DELETE FROM integrations WHERE tenant=? AND provider=?`;
export const TENANT_BY_KEY_SQL = `SELECT tenant FROM integrations WHERE provider=? AND key_hash=?`;
export const INSERT_BANK_TX_SQL = `INSERT INTO bank_transactions(id,tenant,external_id,amount,content,account,reference,tx_time,code,status,received) VALUES (?,?,?,?,?,?,?,?,?,'received',?)`;
export const USE_BANK_TX_SQL = `UPDATE bank_transactions SET status='used',booking_id=? WHERE tenant=? AND id=? AND status='received'`;
export const IGNORE_BANK_TX_SQL = `UPDATE bank_transactions SET status='ignored' WHERE tenant=? AND id=? AND status='received'`;
export const BANK_TX_FOR_CODE_SQL = `SELECT id,amount,content,tx_time,status FROM bank_transactions WHERE tenant=? AND code=? ORDER BY tx_time DESC LIMIT 10`;
export const BANK_TX_RECENT_SQL = `SELECT id,amount,content,account,tx_time,code,status,booking_id FROM bank_transactions WHERE tenant=? ORDER BY tx_time DESC,id LIMIT 100`;
