// Single-statement SQL for customers, prepaid packages and loyalty. Integrity (tenant scope,
// balances, expiry, immutability, ledger coupling) is enforced by triggers in migration 0005, and
// every multi-step operation is sent as one D1 batch (one transaction).
export const CREATE_CUSTOMER_SQL = `INSERT INTO customers(id,tenant,name,phone,note,created) VALUES (?,?,?,?,?,?)`;
export const UPDATE_CUSTOMER_SQL = `UPDATE customers SET name=?,note=? WHERE tenant=? AND id=?`;
export const CREATE_PACKAGE_TYPE_SQL = `INSERT INTO package_types(id,tenant,name,price,grants,valid_days,perks,active,created,section,room) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
export const UPDATE_PACKAGE_TYPE_SQL = `UPDATE package_types SET name=?,price=?,grants=?,valid_days=?,perks=?,active=?,section=?,room=? WHERE tenant=? AND id=?`;
export const DELETE_PACKAGE_TYPE_SQL = `DELETE FROM package_types WHERE tenant=? AND id=?`;
export const INSERT_PACKAGE_SQL = `INSERT INTO customer_packages(id,tenant,customer_id,type_id,name,source,price_paid,grants,perks,purchased,expires,actor,room) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
export const INSERT_PACKAGE_LEDGER_SQL = `INSERT INTO package_ledger(id,tenant,package_id,kind,delta,reason,booking_id,actor,note,created) VALUES (?,?,?,?,?,?,?,?,?,?)`;
export const INSERT_PACKAGE_SALE_ENTRY_SQL = `INSERT INTO finance_entries(id,tenant,shift_id,kind,method,amount,booking_id,request_id,note,actor,created,package_id) VALUES (?,?,?,'payment',?,?,NULL,?,?,?,?,?)`;
export const INSERT_REDEMPTION_SQL = `INSERT INTO package_redemptions(id,tenant,booking_id,package_id,kind,covered,actor,created,units) VALUES (?,?,?,?,?,?,?,?,?)`;
export const PAY_BY_PACKAGE_SQL = `UPDATE bookings SET status='paid',payment='package' WHERE tenant=? AND id=? AND status='finished' AND amount=?`;
export const INSERT_LOYALTY_SQL = `INSERT INTO loyalty_ledger(id,tenant,customer_id,delta,reason,booking_id,actor,created) VALUES (?,?,?,?,?,?,?,?)`;
export const CUSTOMER_LIST_SQL = `SELECT c.id,c.name,c.phone,c.note,c.created,COALESCE(p.points,0) AS points,a.verified AS account,(SELECT COUNT(*) FROM package_orders o WHERE o.tenant=c.tenant AND o.customer_id=c.id AND o.status='pending') AS orders FROM customers c LEFT JOIN customer_points p ON p.tenant=c.tenant AND p.customer_id=c.id LEFT JOIN member_accounts a ON a.tenant=c.tenant AND a.customer_id=c.id WHERE c.tenant=? AND (?='' OR c.phone LIKE ? OR c.name LIKE ? OR lower(substr(c.id,1,8))=?) ORDER BY c.created DESC LIMIT 100`;
export const CUSTOMER_PACKAGES_SQL = `SELECT cp.id,cp.name,cp.source,cp.price_paid,cp.perks,cp.purchased,cp.expires,cp.type_id,cp.valid_days,cp.activated_at,cp.activate_by,cp.renewed_from,cp.grants,(SELECT json_group_array(json_object('kind',b.kind,'remaining',b.remaining)) FROM package_balances b WHERE b.tenant=cp.tenant AND b.package_id=cp.id) AS balances FROM customer_packages cp WHERE cp.tenant=? AND cp.customer_id=? ORDER BY cp.purchased DESC LIMIT 100`;
// Money wallet (migration 0026): top-ups are collected in the shift ledger, spending pays a whole bill.
export const INSERT_WALLET_LEDGER_SQL = `INSERT INTO wallet_ledger(id,tenant,customer_id,delta,reason,booking_id,actor,note,created) VALUES (?,?,?,?,?,?,?,?,?)`;
export const INSERT_WALLET_TOPUP_ENTRY_SQL = `INSERT INTO finance_entries(id,tenant,shift_id,kind,method,amount,booking_id,request_id,note,actor,created,wallet_id) VALUES (?,?,?,'payment',?,?,NULL,?,?,?,?,?)`;
export const PAY_BY_WALLET_SQL = `UPDATE bookings SET status='paid',payment='wallet' WHERE tenant=? AND id=? AND status='finished' AND amount=?`;
export const WALLET_BALANCE_SQL = `SELECT COALESCE((SELECT balance FROM wallet_balances WHERE tenant=? AND customer_id=?),0) AS balance`;
export const WALLET_HISTORY_SQL = `SELECT id,delta,reason,booking_id,note,actor,created FROM wallet_ledger WHERE tenant=? AND customer_id=? ORDER BY created DESC,rowid DESC LIMIT 30`;
// Card terms (migration 0028): activation of monthly cards, absence notices, renewal of hour cards.
export const INSERT_PACKAGE_TERM_SQL = `INSERT INTO customer_packages(id,tenant,customer_id,type_id,name,source,price_paid,grants,perks,purchased,expires,actor,room,valid_days,activated_at,activate_by,renewed_from) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
export const ACTIVATE_PACKAGE_SQL = `UPDATE customer_packages SET activated_at=?,expires=? WHERE tenant=? AND id=? AND activated_at IS NULL AND activate_by IS NOT NULL`;
export const SHIFT_EXPIRY_SQL = `UPDATE customer_packages SET expires=expires+? WHERE tenant=? AND id=? AND activated_at IS NOT NULL`;
export const INSERT_ABSENCE_SQL = `INSERT INTO package_absences(id,tenant,package_id,start_day,end_day,days,status,source,actor,note,created) VALUES (?,?,?,?,?,?,'active',?,?,?,?)`;
export const CANCEL_ABSENCE_SQL = `UPDATE package_absences SET status='cancelled',cancelled_at=? WHERE tenant=? AND id=? AND status='active'`;
export const PACKAGE_TERM_SQL = `SELECT id,customer_id,type_id,name,grants,room,perks,expires,valid_days,activated_at,activate_by,purchased FROM customer_packages WHERE tenant=? AND id=?`;
export const ABSENCES_SQL = `SELECT a.id,a.package_id,a.start_day,a.end_day,a.days,a.status,a.source,a.created FROM package_absences a JOIN customer_packages cp ON cp.id=a.package_id AND cp.tenant=a.tenant WHERE a.tenant=? AND cp.customer_id=? ORDER BY a.start_day DESC LIMIT 100`;
export const SHIFT_BACK_SQL = `UPDATE customer_packages SET expires=expires-? WHERE tenant=? AND id=? AND EXISTS(SELECT 1 FROM package_absences WHERE tenant=? AND id=? AND status='active')`;
