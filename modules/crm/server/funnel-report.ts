import { db as defaultDb } from '../../../lib/server/common';
import { DAY, type Ctx } from './store';
import {
  computeFunnelMetrics,
  computeStaffSla,
  type FunnelAnalysis,
  type StaffPerformanceRow,
  type LtvAndRetentionMetrics,
} from '../core/funnel';

export interface FullFunnelReport {
  days: number;
  funnel: FunnelAnalysis;
  staff: StaffPerformanceRow[];
  ltvAndRetention: LtvAndRetentionMetrics;
}

/**
 * Calculates the closed-loop funnel, staff SLA 5-minute performance, and LTV & Retention metrics.
 */
export async function getFullFunnelReport(c: Ctx, days: number = 30): Promise<FullFunnelReport> {
  const span = Math.min(Math.max(Math.round(days) || 30, 1), 365);
  const since = c.now - span * DAY;
  const d = defaultDb();

  // 1. Calculate 5-Stage Closed-Loop Funnel
  // Stage 1: Leads
  const totalLeadsRow = await d
    .prepare('SELECT COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND created>=?')
    .bind(c.tenant, since)
    .first<{ n: number }>();
  const totalLeads = totalLeadsRow?.n ?? 0;

  // Stage 2: Booked (Leads with booking or appointment)
  const bookedRow = await d
    .prepare(
      `SELECT COUNT(DISTINCT l.id) AS n
       FROM crm2_leads l
       WHERE l.tenant=? AND l.created>=?
         AND (
           EXISTS (SELECT 1 FROM crm2_appointments a WHERE a.tenant=l.tenant AND a.lead_id=l.id)
           OR EXISTS (SELECT 1 FROM bookings b WHERE b.tenant=l.tenant AND b.phone=l.phone_norm AND b.created>=l.created)
         )`,
    )
    .bind(c.tenant, since)
    .first<{ n: number }>();
  const booked = bookedRow?.n ?? 0;

  // Stage 3: Checked In (Customer arrived or started playing)
  const checkedInRow = await d
    .prepare(
      `SELECT COUNT(DISTINCT l.id) AS n
       FROM crm2_leads l
       WHERE l.tenant=? AND l.created>=?
         AND (
           EXISTS (SELECT 1 FROM crm2_appointments a WHERE a.tenant=l.tenant AND a.lead_id=l.id AND a.status='ARRIVED')
           OR EXISTS (SELECT 1 FROM bookings b WHERE b.tenant=l.tenant AND b.phone=l.phone_norm AND b.status IN ('playing','finished','paid') AND b.created>=l.created)
         )`,
    )
    .bind(c.tenant, since)
    .first<{ n: number }>();
  const checkedIn = checkedInRow?.n ?? 0;

  // Stage 4: Paid (Completed payment for session or order)
  const paidRow = await d
    .prepare(
      `SELECT COUNT(DISTINCT l.id) AS n
       FROM crm2_leads l
       WHERE l.tenant=? AND l.created>=?
         AND (
           EXISTS (SELECT 1 FROM crm2_orders o JOIN crm2_order_payments p ON p.order_id=o.id AND p.tenant=o.tenant WHERE o.tenant=l.tenant AND o.lead_id=l.id AND p.status='PAID')
           OR EXISTS (SELECT 1 FROM bookings b WHERE b.tenant=l.tenant AND b.phone=l.phone_norm AND b.status='paid' AND b.created>=l.created)
         )`,
    )
    .bind(c.tenant, since)
    .first<{ n: number }>();
  const paid = paidRow?.n ?? 0;

  // Stage 5: Retained / Repeat (Had 2+ visits or purchases)
  const retainedRow = await d
    .prepare(
      `SELECT COUNT(DISTINCT l.id) AS n
       FROM crm2_leads l
       JOIN customers cu ON cu.tenant=l.tenant AND cu.phone=l.phone_norm
       WHERE l.tenant=? AND l.created>=?
         AND (
           (SELECT COUNT(*) FROM crm_visits v WHERE v.tenant=l.tenant AND v.customer_id=cu.id) >= 2
           OR (SELECT COUNT(*) FROM crm2_orders o WHERE o.tenant=l.tenant AND o.lead_id=l.id AND o.status='CONFIRMED') >= 2
         )`,
    )
    .bind(c.tenant, since)
    .first<{ n: number }>();
  const retained = retainedRow?.n ?? 0;

  const funnel = computeFunnelMetrics({
    leads: totalLeads,
    booked,
    checkedIn,
    paid,
    retained,
  }, span);

  // 2. Staff SLA Performance (< 5 minutes)
  const staffRaw = (
    await d
      .prepare(
        `SELECT 
           l.owner AS userId,
           COALESCE(u.name, 'Chưa phân công') AS name,
           COUNT(*) AS assigned,
           SUM(l.first_response_at IS NOT NULL) AS responded,
           SUM(l.first_response_min <= 5) AS under5m,
           AVG(l.first_response_min) AS avgMin,
           SUM(l.stage='WON') AS won,
           COALESCE((
             SELECT SUM(p.paid_amount) 
             FROM crm2_order_payments p 
             JOIN crm2_orders o ON o.id=p.order_id AND o.tenant=p.tenant 
             JOIN crm2_leads l2 ON l2.id=o.lead_id 
             WHERE l2.tenant=l.tenant AND l2.owner=l.owner AND o.created>=?
           ), 0) + COALESCE((
             SELECT SUM(b.amount) 
             FROM bookings b 
             JOIN crm2_leads l3 ON l3.phone_norm=b.phone AND l3.tenant=b.tenant
             WHERE b.tenant=l.tenant AND l3.owner=l.owner AND b.status='paid' AND b.finished>=?
           ), 0) AS revenue
         FROM crm2_leads l
         LEFT JOIN users u ON u.id=l.owner
         WHERE l.tenant=? AND l.created>=?
         GROUP BY l.owner
         ORDER BY won DESC, revenue DESC`,
      )
      .bind(since, since, c.tenant, since)
      .all<{
        userId: string;
        name: string;
        assigned: number;
        responded: number;
        under5m: number;
        avgMin: number | null;
        won: number;
        revenue: number;
      }>()
  ).results;

  const staff = computeStaffSla(staffRaw);

  // 3. Customer Lifetime Value (LTV) & Retention Rate
  const totalCustRow = await d
    .prepare('SELECT COUNT(*) AS total FROM customers WHERE tenant=?')
    .bind(c.tenant)
    .first<{ total: number }>();
  const totalCustomers = totalCustRow?.total ?? 0;

  const payingCustRow = await d
    .prepare(
      `SELECT COUNT(DISTINCT customer_id) AS total, COALESCE(SUM(amount), 0) AS spend
       FROM crm_visits WHERE tenant=?`,
    )
    .bind(c.tenant)
    .first<{ total: number; spend: number }>();
  const payingCustomers = payingCustRow?.total ?? 0;
  const totalSpend = payingCustRow?.spend ?? 0;
  const averageLtv = payingCustomers > 0 ? Math.round(totalSpend / payingCustomers) : 0;

  // Active in 30 days
  const active30dRow = await d
    .prepare(
      `SELECT COUNT(DISTINCT customer_id) AS activeCount
       FROM crm_visits WHERE tenant=? AND finished>=?`,
    )
    .bind(c.tenant, c.now - 30 * DAY)
    .first<{ activeCount: number }>();
  const active30d = active30dRow?.activeCount ?? 0;

  const retention30dRate =
    totalCustomers > 0 ? Math.round((active30d / totalCustomers) * 1000) / 10 : 0;
  const dormantRate = Math.max(0, Math.round((100 - retention30dRate) * 10) / 10);

  // LTV by Tier
  const tierRows = (
    await d
      .prepare(
        `SELECT 
           COALESCE(SUM(amount), 0) AS spend,
           customer_id
         FROM crm_visits WHERE tenant=?
         GROUP BY customer_id`,
      )
      .bind(c.tenant)
      .all<{ spend: number; customer_id: string }>()
  ).results;

  const byTier = {
    vip: { count: 0, total: 0, avgLtv: 0 },
    platinum: { count: 0, total: 0, avgLtv: 0 },
    gold: { count: 0, total: 0, avgLtv: 0 },
    silver: { count: 0, total: 0, avgLtv: 0 },
    none: { count: 0, total: 0, avgLtv: 0 },
  };

  for (const r of tierRows) {
    if (r.spend >= 100_000_000) {
      byTier.vip.count++;
      byTier.vip.total += r.spend;
    } else if (r.spend >= 50_000_000) {
      byTier.platinum.count++;
      byTier.platinum.total += r.spend;
    } else if (r.spend >= 20_000_000) {
      byTier.gold.count++;
      byTier.gold.total += r.spend;
    } else if (r.spend > 0) {
      byTier.silver.count++;
      byTier.silver.total += r.spend;
    } else {
      byTier.none.count++;
    }
  }

  for (const k of ['vip', 'platinum', 'gold', 'silver', 'none'] as const) {
    byTier[k].avgLtv =
      byTier[k].count > 0 ? Math.round(byTier[k].total / byTier[k].count) : 0;
  }

  const ltvAndRetention: LtvAndRetentionMetrics = {
    totalCustomers,
    payingCustomers,
    totalHistoricalSpend: totalSpend,
    averageLtv,
    retention30dRate,
    dormantRate,
    byTier: {
      vip: { count: byTier.vip.count, avgLtv: byTier.vip.avgLtv },
      platinum: { count: byTier.platinum.count, avgLtv: byTier.platinum.avgLtv },
      gold: { count: byTier.gold.count, avgLtv: byTier.gold.avgLtv },
      silver: { count: byTier.silver.count, avgLtv: byTier.silver.avgLtv },
      none: { count: byTier.none.count, avgLtv: byTier.none.avgLtv },
    },
  };

  return {
    days: span,
    funnel,
    staff,
    ltvAndRetention,
  };
}
