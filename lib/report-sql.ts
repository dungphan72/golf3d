// Read-only revenue report. Days are Vietnam calendar days (UTC+7).
export const REPORT_DAYS_SQL = `SELECT date(created/1000+25200,'unixepoch') AS day,
 COALESCE(SUM(CASE WHEN kind='payment' AND method='cash' THEN amount WHEN kind='refund' AND method='cash' THEN -amount END),0) AS cash,
 COALESCE(SUM(CASE WHEN kind='payment' AND method='transfer' THEN amount WHEN kind='refund' AND method='transfer' THEN -amount END),0) AS transfer,
 COALESCE(SUM(CASE WHEN kind='payment' AND method='card' THEN amount WHEN kind='refund' AND method='card' THEN -amount END),0) AS card,
 COALESCE(SUM(CASE WHEN kind='refund' THEN amount END),0) AS refunds,
 COALESCE(SUM(CASE WHEN kind='payment' AND package_id IS NOT NULL THEN amount END),0) AS packages,
 COALESCE(SUM(CASE WHEN kind='cash_out' THEN amount END),0) AS expenses,
 COUNT(CASE WHEN kind='payment' THEN 1 END) AS payments
 FROM finance_entries WHERE tenant=? AND created>=? AND created<? GROUP BY day ORDER BY day DESC`;
export const REPORT_SERVICES_SQL = `SELECT service, COUNT(*) AS rounds, COALESCE(SUM(amount),0) AS revenue, COALESCE(SUM(food_total),0) AS food
 FROM bookings WHERE tenant=? AND status='paid' AND finished>=? AND finished<? GROUP BY service ORDER BY revenue DESC`;
