/** Revenue report helpers. Pure: no I/O. */
export type DayRow = {
  day: string;
  cash: number;
  transfer: number;
  card: number;
  refunds: number;
  packages: number;
  expenses: number;
  payments: number;
  /** Part of the day's receipts that comes from approved old bills (kept out of the shift cash). */
  legacy: number;
  /** Old bills paid by neither cash, transfer nor card; not in cash/transfer/card. */
  other: number;
};
export type ServiceRow = { service: string; rounds: number; revenue: number; food: number };

/** Adds the approved old bills of a range to the ledger days and the per-service rounds. */
export function mergeLegacy(
  days: Omit<DayRow, 'legacy' | 'other'>[],
  services: ServiceRow[],
  legacyDays: { day: string; cash: number; transfer: number; card: number; other: number; bills: number }[],
  legacyServices: ServiceRow[],
) {
  const byDay = new Map<string, DayRow>();
  for (const d of days) byDay.set(d.day, { ...d, legacy: 0, other: 0 });
  for (const l of legacyDays) {
    const d = byDay.get(l.day) ?? {
      day: l.day, cash: 0, transfer: 0, card: 0, refunds: 0, packages: 0, expenses: 0, payments: 0, legacy: 0, other: 0,
    };
    d.cash += l.cash;
    d.transfer += l.transfer;
    d.card += l.card;
    d.other += l.other;
    d.legacy += l.cash + l.transfer + l.card + l.other;
    d.payments += l.bills;
    byDay.set(l.day, d);
  }
  const bySvc = new Map<string, ServiceRow>();
  for (const sv of services) bySvc.set(sv.service, { ...sv });
  for (const l of legacyServices) {
    const sv = bySvc.get(l.service) ?? { service: l.service, rounds: 0, revenue: 0, food: 0 };
    sv.rounds += l.rounds;
    sv.revenue += l.revenue;
    sv.food += l.food;
    bySvc.set(l.service, sv);
  }
  return {
    days: [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1)),
    services: [...bySvc.values()].sort((a, b) => b.revenue - a.revenue),
  };
}

