import { db, type ServiceResult } from './common';
import { REPORT_DAYS_SQL, REPORT_SERVICES_SQL } from '../report-sql';

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
    const [days, services] = await Promise.all([
      db().prepare(REPORT_DAYS_SQL).bind(tenant, start, end).all(),
      db().prepare(REPORT_SERVICES_SQL).bind(tenant, start, end).all(),
    ]);
    return { status: 200, body: { from, to, days: days.results, services: services.results } };
  } catch (e) {
    console.error('revenue report', e);
    return { status: 500, body: { error: 'Chưa tải được báo cáo' } };
  }
}
