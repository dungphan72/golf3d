import { db, type ServiceResult } from './common';
import {
  REPORT_DAYS_SQL,
  REPORT_LEGACY_DAYS_SQL,
  REPORT_LEGACY_SERVICES_SQL,
  REPORT_SERVICES_SQL,
} from '../report-sql';
import { mergeLegacy, type DayRow, type ServiceRow } from '../report-merge';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const startOfDay = (d: string) => Date.parse(d + 'T00:00:00+07:00');
const MAX_DAYS = 366;

/** Receipts per day and method, plus paid rounds per service, for an inclusive VN date range. */
export async function revenueReport(
  tenant: string,
  from: string | null,
  to: string | null,
): Promise<ServiceResult> {
  if (!from || !to || !DAY.test(from) || !DAY.test(to))
    return { status: 400, body: { error: 'Khoảng ngày không hợp lệ' } };
  const start = startOfDay(from);
  const end = startOfDay(to) + 86_400_000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return { status: 400, body: { error: 'Khoảng ngày không hợp lệ' } };
  if ((end - start) / 86_400_000 > MAX_DAYS)
    return { status: 400, body: { error: 'Chỉ xem tối đa 366 ngày mỗi lần' } };
  try {
    const [days, services, legacyDays, legacyServices] = await Promise.all([
      db().prepare(REPORT_DAYS_SQL).bind(tenant, start, end).all(),
      db().prepare(REPORT_SERVICES_SQL).bind(tenant, start, end).all(),
      db().prepare(REPORT_LEGACY_DAYS_SQL).bind(tenant, start, end).all(),
      db().prepare(REPORT_LEGACY_SERVICES_SQL).bind(tenant, start, end).all(),
    ]);
    const merged = mergeLegacy(
      days.results as Omit<DayRow, 'legacy' | 'other'>[],
      services.results as ServiceRow[],
      legacyDays.results as Parameters<typeof mergeLegacy>[2],
      legacyServices.results as ServiceRow[],
    );

    // Aggregate parking transactions for this date window
    const parkingQuery = await db()
      .prepare(
        `SELECT 
           DATE(DATETIME(created_at/1000 + 7*3600, 'unixepoch')) as day,
           SUM(CASE WHEN method='cash' AND tx_type<>'refund' THEN amount ELSE 0 END) as parkingCash,
           SUM(CASE WHEN method<>'cash' AND tx_type<>'refund' AND tx_type<>'sponsored_accrual' THEN amount ELSE 0 END) as parkingTransfer,
           SUM(CASE WHEN tx_type='refund' THEN amount ELSE 0 END) as parkingRefund,
           SUM(CASE WHEN tx_type='sponsored_accrual' THEN amount ELSE 0 END) as parkingSponsored,
           COUNT(*) as parkingCount
         FROM parking_transactions
         WHERE tenant=? AND created_at>=? AND created_at<?
         GROUP BY day`
      )
      .bind(tenant, start, end)
      .all<any>()
      .catch(() => ({ results: [] }));

    const parkingMap = new Map<string, any>();
    let totalParkingRevenue = 0;
    let totalParkingTickets = 0;
    for (const p of parkingQuery.results || []) {
      parkingMap.set(p.day, p);
      const net = (p.parkingCash || 0) + (p.parkingTransfer || 0) - (p.parkingRefund || 0);
      totalParkingRevenue += net;
      totalParkingTickets += (p.parkingCount || 0);
    }

    const daysWithParking = merged.days.map((d: any) => {
      const p = parkingMap.get(d.day);
      const pkNet = p ? (p.parkingCash + p.parkingTransfer - p.parkingRefund) : 0;
      return {
        ...d,
        parking: pkNet,
        parkingCash: p?.parkingCash || 0,
        parkingTransfer: p?.parkingTransfer || 0,
        parkingSponsored: p?.parkingSponsored || 0,
      };
    });

    const servicesWithParking = [...merged.services];
    if (totalParkingRevenue > 0 || totalParkingTickets > 0) {
      servicesWithParking.push({
        service: 'parking',
        rounds: totalParkingTickets,
        revenue: totalParkingRevenue,
        food: 0,
      });
    }

    return { status: 200, body: { from, to, days: daysWithParking, services: servicesWithParking } };
  } catch (e) {
    console.error('revenue report', e);
    return { status: 500, body: { error: 'Chưa tải được báo cáo' } };
  }
}
