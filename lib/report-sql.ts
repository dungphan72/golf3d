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
// Old bills typed in by hand and approved by the owner: counted on the bill's own date, never in a shift.
export const REPORT_LEGACY_DAYS_SQL = `SELECT date(bill_at/1000+25200,'unixepoch') AS day,
 COALESCE(SUM(CASE WHEN method='cash' THEN total END),0) AS cash,
 COALESCE(SUM(CASE WHEN method='transfer' THEN total END),0) AS transfer,
 COALESCE(SUM(CASE WHEN method='card' THEN total END),0) AS card,
 COALESCE(SUM(CASE WHEN method NOT IN ('cash','transfer','card') THEN total END),0) AS other,
 COUNT(*) AS bills
 FROM legacy_bills WHERE tenant=? AND status='approved' AND bill_at>=? AND bill_at<? GROUP BY day`;
export const REPORT_LEGACY_SERVICES_SQL = `SELECT service, COUNT(*) AS rounds, COALESCE(SUM(total),0) AS revenue, COALESCE(SUM(food),0) AS food
 FROM legacy_bills WHERE tenant=? AND status='approved' AND bill_at>=? AND bill_at<? GROUP BY service`;
export const REPORT_SERVICES_SQL = `SELECT service, COUNT(*) AS rounds, COALESCE(SUM(amount-COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=bookings.tenant AND e.booking_id=bookings.id AND e.kind='refund'),0)),0) AS revenue, COALESCE(SUM(food_total),0) AS food
 FROM bookings WHERE tenant=? AND status='paid' AND finished>=? AND finished<? GROUP BY service ORDER BY revenue DESC`;
