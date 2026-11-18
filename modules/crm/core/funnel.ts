/**
 * Saigon Indoor Golf (sigolf.vn) — CRM 360° Closed-loop Funnel, LTV & Retention Analytics
 * 
 * Formulas:
 * - Lead -> Booking -> Check-in -> Payment -> Retention
 * - Each stage rate is calculated against previous stage AND against total top-of-funnel leads.
 * - Staff SLA compliance rate = (leads contacted within 5 mins / total assigned leads) * 100%.
 * - Customer LTV = Total Spend / Total Paying Customers.
 * - Retention Rate = Active Playing Customers (within 30 days) / Total Customer Base * 100%.
 */

export interface FunnelRawCounts {
  leads: number;
  booked: number;
  checkedIn: number;
  paid: number;
  retained: number;
}

export interface FunnelStageMetric {
  key: 'lead' | 'booking' | 'checkin' | 'payment' | 'retention';
  label: string;
  count: number;
  conversionRate: number; // % against previous stage
  dropoffRate: number;    // % dropped from previous stage
  overallRate: number;    // % against top-of-funnel (leads)
}

export interface FunnelAnalysis {
  periodDays: number;
  stages: FunnelStageMetric[];
  totalLeads: number;
  finalRetained: number;
  endToEndConversionRate: number;
}

export interface StaffPerformanceRow {
  userId: string;
  name: string;
  assignedLeads: number;
  respondedLeads: number;
  slaCompliantLeads: number; // <= 5 minutes
  slaComplianceRate: number; // %
  avgResponseMinutes: number;
  wonDeals: number;
  totalRevenue: number;
}

export interface LtvAndRetentionMetrics {
  totalCustomers: number;
  payingCustomers: number;
  totalHistoricalSpend: number;
  averageLtv: number;
  retention30dRate: number;
  dormantRate: number;
  byTier: {
    vip: { count: number; avgLtv: number };
    platinum: { count: number; avgLtv: number };
    gold: { count: number; avgLtv: number };
    silver: { count: number; avgLtv: number };
    none: { count: number; avgLtv: number };
  };
}

/**
 * Computes closed-loop conversion rates across all 5 stages of the customer journey.
 * Zero-division safe.
 */
export function computeFunnelMetrics(counts: FunnelRawCounts, periodDays: number = 30): FunnelAnalysis {
  const l = Math.max(0, counts.leads);
  const b = Math.min(l, Math.max(0, counts.booked));
  const c = Math.min(b, Math.max(0, counts.checkedIn));
  const p = Math.min(c, Math.max(0, counts.paid));
  const r = Math.min(p, Math.max(0, counts.retained));

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

  const stages: FunnelStageMetric[] = [
    {
      key: 'lead',
      label: '1. Lead mới tiếp cận',
      count: l,
      conversionRate: 100,
      dropoffRate: 0,
      overallRate: 100,
    },
    {
      key: 'booking',
      label: '2. Đặt lịch / Hẹn sân',
      count: b,
      conversionRate: pct(b, l),
      dropoffRate: Math.max(0, Math.round((100 - pct(b, l)) * 10) / 10),
      overallRate: pct(b, l),
    },
    {
      key: 'checkin',
      label: '3. Đến sân & Check-in',
      count: c,
      conversionRate: pct(c, b),
      dropoffRate: Math.max(0, Math.round((100 - pct(c, b)) * 10) / 10),
      overallRate: pct(c, l),
    },
    {
      key: 'payment',
      label: '4. Thanh toán lượt đầu',
      count: p,
      conversionRate: pct(p, c),
      dropoffRate: Math.max(0, Math.round((100 - pct(p, c)) * 10) / 10),
      overallRate: pct(p, l),
    },
    {
      key: 'retention',
      label: '5. Tái mua & Giữ chân',
      count: r,
      conversionRate: pct(r, p),
      dropoffRate: Math.max(0, Math.round((100 - pct(r, p)) * 10) / 10),
      overallRate: pct(r, l),
    },
  ];

  return {
    periodDays,
    stages,
    totalLeads: l,
    finalRetained: r,
    endToEndConversionRate: pct(r, l),
  };
}

/**
 * Computes Staff SLA and sales performance indicators.
 */
export function computeStaffSla(
  rows: {
    userId: string;
    name: string;
    assigned: number;
    responded: number;
    under5m: number;
    avgMin: number | null;
    won: number;
    revenue: number;
  }[],
): StaffPerformanceRow[] {
  return rows.map((r) => {
    const assigned = Math.max(0, r.assigned);
    const slaRate = assigned > 0 ? Math.round((r.under5m / assigned) * 1000) / 10 : 0;
    return {
      userId: r.userId,
      name: r.name || 'Chưa phân công',
      assignedLeads: assigned,
      respondedLeads: r.responded,
      slaCompliantLeads: r.under5m,
      slaComplianceRate: slaRate,
      avgResponseMinutes: Math.round((r.avgMin ?? 0) * 10) / 10,
      wonDeals: r.won,
      totalRevenue: r.revenue,
    };
  });
}
