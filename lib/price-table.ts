import type { PriceRule } from './pricing.ts';
import { GRANT_KINDS, KIND_LABELS, UNLIMITED, type Grant } from './member.ts';

/**
 * Public price list derived from the same data the admin edits: the club's price rules
 * (Cài đặt → bảng giá) and the package catalogue (Hội viên → Danh mục gói). Nothing here is
 * hard-coded, so a price changed in the admin shows up on the website.
 */
export type PriceRow = {
  key: string;
  days: string;
  from: string;
  to: string;
  label: string;
  gold: boolean;
  gdr: number | null;
  h9: number | null;
  h18: number | null;
};
export type PriceTable = { rows: PriceRow[]; group: { h9: number | null; h18: number | null } };

const DAY_LABEL = {
  weekday: 'Thứ 2 – Thứ 6',
  weekend: 'Thứ 7, Chủ nhật',
  holiday: 'Ngày lễ',
} as const;
const ORDER = { weekday: 0, weekend: 1, holiday: 2 } as const;

/** One table per room. Per-person prices use the 1-player rule; the foursome price is separate. */
export function buildPriceTable(rules: PriceRule[], room: 'standard' | 'vip'): PriceTable {
  const windows = new Map<string, PriceRow & { day: PriceRule['day'] }>();
  const group: PriceTable['group'] = { h9: null, h18: null };
  const groupByDay: Record<string, { h9?: number; h18?: number }> = {};
  for (const r of rules) {
    if (!r.enabled || r.room !== room) continue;
    if (r.service !== 'gdr' && r.people === 4) {
      const g = (groupByDay[r.day] ??= {});
      g[r.service === '9' ? 'h9' : 'h18'] = r.amount;
      continue;
    }
    const single = r.service === 'gdr' ? r.people === null : r.people === 1;
    if (!single) continue;
    const key = `${r.day}|${r.from}|${r.to}`;
    const row =
      windows.get(key) ??
      ({
        key,
        day: r.day,
        days: DAY_LABEL[r.day],
        from: r.from,
        to: r.to,
        label: r.label,
        gold: false,
        gdr: null,
        h9: null,
        h18: null,
      } satisfies PriceRow & { day: PriceRule['day'] });
    if (/vàng/i.test(r.label)) row.gold = true;
    if (r.service === 'gdr') row.gdr = r.amount;
    else if (r.service === '9') row.h9 = r.amount;
    else row.h18 = r.amount;
    windows.set(key, row);
  }
  const sorted = [...windows.values()].sort(
    (a, b) => ORDER[a.day] - ORDER[b.day] || a.from.localeCompare(b.from),
  );
  // Weekend and holiday rows with identical hours and prices read as one line.
  const rows: PriceRow[] = [];
  for (const r of sorted) {
    const { day, ...row } = r;
    const twin = rows.find(
      (x) =>
        day === 'holiday' &&
        x.days === DAY_LABEL.weekend &&
        x.from === row.from &&
        x.to === row.to &&
        x.gdr === row.gdr &&
        x.h9 === row.h9 &&
        x.h18 === row.h18,
    );
    if (twin) twin.days = 'Thứ 7, Chủ nhật & ngày lễ';
    else rows.push(row);
  }
  // A single group price is shown when it is the same on every day type, else the weekday one.
  const days = Object.values(groupByDay);
  const pick = (k: 'h9' | 'h18') => {
    const values = days.map((d) => d[k]).filter((v): v is number => v != null);
    if (!values.length) return null;
    return values.every((v) => v === values[0])
      ? values[0]
      : (groupByDay.weekday?.[k] ?? values[0]);
  };
  group.h9 = pick('h9');
  group.h18 = pick('h18');
  return { rows, group };
}

/** True when the VIP room has its own prices (otherwise the standard list serves both). */
export const vipDiffers = (rules: PriceRule[]) =>
  JSON.stringify(buildPriceTable(rules, 'vip')) !==
  JSON.stringify(buildPriceTable(rules, 'standard'));

export type PackageItem = {
  id: string;
  name: string;
  price: number;
  grants: Grant[];
  validDays: number;
  perks: string;
};
export type PackageGroup = { id: string; title: string; vip: boolean; items: PackageItem[] };

const kinds = (p: PackageItem) => new Set(p.grants.map((g) => g.kind));
/** Groups the catalogue by what a package gives, so a package added in the admin lands in a sensible section. */
export function groupPackages(items: PackageItem[]): PackageGroup[] {
  const defs: { id: string; title: string; vip: boolean; test: (p: PackageItem) => boolean }[] = [
    { id: 'vip', title: 'Thẻ VIP', vip: true, test: (p) => /vip/i.test(p.name) },
    {
      id: 'h9',
      title: 'Combo 9 hố',
      vip: false,
      test: (p) => kinds(p).size === 1 && kinds(p).has('holes9'),
    },
    {
      id: 'h18',
      title: 'Combo 18 hố',
      vip: false,
      test: (p) => kinds(p).size === 1 && kinds(p).has('holes18'),
    },
    { id: 'gdr', title: 'Luyện tập GDR', vip: false, test: (p) => kinds(p).has('gdr') },
  ];
  const left = new Set(items);
  const claimed = new Map<string, PackageItem[]>();
  // VIP cards claim first (they also contain GDR sessions), then the plain combos.
  for (const d of [defs[0], defs[1], defs[2], defs[3]]) {
    const mine = [...left].filter(d.test);
    mine.forEach((p) => left.delete(p));
    claimed.set(d.id, mine);
  }
  const groups: PackageGroup[] = [];
  for (const d of [defs[1], defs[2], defs[3], defs[0]]) {
    const mine = claimed.get(d.id) ?? [];
    if (mine.length)
      groups.push({
        id: d.id,
        title: d.title,
        vip: d.vip,
        items: mine.sort((a, b) => a.price - b.price),
      });
  }
  if (left.size)
    groups.push({
      id: 'other',
      title: 'Gói khác',
      vip: false,
      items: [...left].sort((a, b) => a.price - b.price),
    });
  return groups;
}

export const grantLine = (g: Grant) =>
  `${g.qty >= UNLIMITED ? 'Không giới hạn' : g.qty} ${KIND_LABELS[g.kind]}`;
export const validityText = (days: number) =>
  days % 30 === 0 ? `Hiệu lực ${days / 30} tháng` : `Hiệu lực ${days} ngày`;
/** Bullet list for a package card: what it contains, how long it lasts, then the perks. */
export const packageBullets = (p: PackageItem) => [
  ...p.grants.map(grantLine),
  validityText(p.validDays),
  ...p.perks
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toLocaleUpperCase('vi-VN') + s.slice(1)),
];

export const parseGrants = (json: string): Grant[] => {
  try {
    const v = JSON.parse(json) as Grant[];
    return v.filter((g) => (GRANT_KINDS as readonly string[]).includes(g.kind));
  } catch {
    return [];
  }
};
