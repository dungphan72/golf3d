import { db, loadConfig } from './common';
import { memberTier, nextTier, tierThresholds, type Tier, type TierThresholds } from '../member-card';

/**
 * What a member has spent at the club, in đồng: packages bought, wallet top-ups (bonus credit is not
 * money spent), and what they paid for sessions in cash, transfer or card minus refunds. Sessions paid
 * from a package or the wallet are not counted again: that money was counted when it was bought.
 */
const SPEND_SQL = `SELECT
  COALESCE((SELECT SUM(price_paid) FROM customer_packages WHERE tenant=? AND customer_id=?),0)
  + COALESCE((SELECT SUM(delta) FROM wallet_ledger WHERE tenant=? AND customer_id=? AND reason='topup'),0)
  + COALESCE((SELECT SUM(CASE e.kind WHEN 'payment' THEN e.amount WHEN 'refund' THEN -e.amount ELSE 0 END)
      FROM finance_entries e
      JOIN bookings b ON b.id=e.booking_id AND b.tenant=e.tenant
      JOIN customers c ON c.tenant=b.tenant AND c.phone=b.phone
      WHERE e.tenant=? AND c.id=? AND e.booking_id IS NOT NULL),0) AS spent`;

export type TierInfo = {
  tier: Tier;
  spent: number;
  thresholds: TierThresholds;
  next: { tier: Tier; need: number } | null;
};

export async function tierInfo(tenant: string, customerId: string, now = Date.now()): Promise<TierInfo> {
  const [config, spend, live] = await Promise.all([
    loadConfig(tenant),
    db()
      .prepare(SPEND_SQL)
      .bind(tenant, customerId, tenant, customerId, tenant, customerId)
      .first<{ spent: number }>(),
    db()
      .prepare('SELECT 1 AS n FROM customer_packages WHERE tenant=? AND customer_id=? AND expires>=? LIMIT 1')
      .bind(tenant, customerId, now)
      .first<{ n: number }>(),
  ]);
  const thresholds = tierThresholds(config.tierThresholds);
  const spent = Math.max(0, spend?.spent ?? 0);
  return {
    tier: memberTier(spent, !!live, thresholds),
    spent,
    thresholds,
    next: nextTier(spent, thresholds),
  };
}
