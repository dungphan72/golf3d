/** Customisable overview: which cards a person sees, in what order, over how many days. Pure: no I/O. */

export type Widget = { id: string; label: string; kind: 'kpi' | 'table'; managerOnly?: boolean };

export const WIDGETS: readonly Widget[] = [
  { id: 'kpi_overdue', label: 'Việc quá hạn', kind: 'kpi' },
  { id: 'kpi_today', label: 'Việc hôm nay', kind: 'kpi' },
  { id: 'kpi_new', label: 'Lead mới chưa xử lý', kind: 'kpi' },
  { id: 'kpi_leads', label: 'Số lead', kind: 'kpi' },
  { id: 'kpi_won', label: 'Đã chốt', kind: 'kpi' },
  { id: 'kpi_rate', label: 'Tỷ lệ chốt', kind: 'kpi' },
  { id: 'kpi_appts', label: 'Lịch hẹn hôm nay', kind: 'kpi' },
  { id: 'target', label: 'Mục tiêu doanh thu', kind: 'table' },
  { id: 'funnel', label: 'Phễu tư vấn', kind: 'table' },
  { id: 'sources', label: 'Nguồn khách', kind: 'table' },
  { id: 'ranking', label: 'Xếp hạng nhân viên', kind: 'table', managerOnly: true },
  { id: 'cron', label: 'Lần chạy nền gần nhất', kind: 'table', managerOnly: true },
];
export const RANGE_DAYS = [7, 30, 90] as const;
export const DEFAULT_DAYS = 30;

export type DashLayout = { order: string[]; hidden: string[]; days: number };

export const widgetsFor = (manager: boolean) => WIDGETS.filter((w) => manager || !w.managerOnly);

export const defaultLayout = (manager: boolean): DashLayout => ({
  order: widgetsFor(manager).map((w) => w.id),
  hidden: [],
  days: DEFAULT_DAYS,
});

/**
 * Cleans whatever was stored or posted: unknown ids and manager-only cards for staff are dropped, repeats removed,
 * cards missing from `order` are appended (so a new card shows up for existing users), `days` must be an allowed range.
 */
export function sanitizeLayout(raw: unknown, manager: boolean): DashLayout {
  const allowed = new Set(widgetsFor(manager).map((w) => w.id));
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const ids = (v: unknown) => {
    const out: string[] = [];
    if (Array.isArray(v))
      for (const x of v) if (typeof x === 'string' && allowed.has(x) && !out.includes(x)) out.push(x);
    return out;
  };
  const order = ids(r.order);
  for (const id of allowed) if (!order.includes(id)) order.push(id);
  const days = RANGE_DAYS.includes(Number(r.days) as 7 | 30 | 90) ? Number(r.days) : DEFAULT_DAYS;
  return { order, hidden: ids(r.hidden), days };
}

/** Cards to draw, in order, without the hidden ones. */
export const visibleWidgets = (l: DashLayout) => l.order.filter((id) => !l.hidden.includes(id));
