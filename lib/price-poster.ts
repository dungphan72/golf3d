import type { PriceRule } from './pricing.ts';
import type { PackageGroup, PackageItem } from './price-table.ts';
import { UNLIMITED } from './member.ts';

/**
 * Content of the public price page ("Bảng giá" poster), derived only from the data the admin edits:
 * the price rules (Cài đặt › Bảng giá) and the package catalogue. Change a price there and the
 * page changes; nothing here is a price of its own.
 */
export type PosterRow = {
  label: string;
  room: 'standard' | 'vip';
  /** Hourly practice, per line per hour. */
  gdr: number | null;
  /** 9 and 18 holes, per person. */
  h9: number | null;
  h18: number | null;
};
export type PosterBlock = {
  key: string;
  /** "GIỜ VÀNG • 06:00 – 11:00" or "11:00 – 23:00"; null when the card has one plain window. */
  title: string | null;
  gold: boolean;
  rows: PosterRow[];
};
export type PosterCard = { key: string; title: string; blocks: PosterBlock[] };

type Day = PriceRule['day'];
const DAYS: Day[] = ['weekday', 'weekend', 'holiday'];
const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const ROOMS: { room: 'standard' | 'vip'; label: string }[] = [
  { room: 'standard', label: 'Tiêu chuẩn' },
  { room: 'vip', label: 'VIP' },
];

function blocksForDay(rules: PriceRule[], day: Day): PosterBlock[] {
  const ofDay = rules.filter((r) => r.enabled && r.day === day);
  const windows = [...new Set(ofDay.map((r) => `${r.from}|${r.to}`))]
    .map((w) => w.split('|') as [string, string])
    .sort((a, b) => minutes(a[0]) - minutes(b[0]) || minutes(a[1]) - minutes(b[1]));
  const pick = (room: string, service: string, from: string, to: string) => {
    const mine = ofDay.filter(
      (r) => r.room === room && r.service === service && (service === 'gdr' || r.people === 1),
    );
    return (
      mine.find((r) => r.from === from && r.to === to) ??
      // A rule that covers the start of this window (hours differ slightly between services).
      mine.find((r) => minutes(r.from) <= minutes(from) && minutes(r.to) > minutes(from)) ??
      null
    );
  };
  const blocks: PosterBlock[] = [];
  for (const [from, to] of windows) {
    const rows: PosterRow[] = [];
    for (const { room, label } of ROOMS) {
      const gdr = pick(room, 'gdr', from, to);
      const h9 = pick(room, '9', from, to);
      const h18 = pick(room, '18', from, to);
      if (!gdr && !h9 && !h18) continue;
      rows.push({ label, room, gdr: gdr?.amount ?? null, h9: h9?.amount ?? null, h18: h18?.amount ?? null });
    }
    if (!rows.length) continue;
    const gold = ofDay.some((r) => r.from === from && r.to === to && /vàng/i.test(r.label));
    blocks.push({
      key: `${day}-${from}-${to}`,
      title: gold ? `GIỜ VÀNG • ${from} – ${to}` : `${from} – ${to}`,
      gold,
      rows,
    });
  }
  // One plain window needs no sub-title.
  if (blocks.length === 1 && !blocks[0].gold) blocks[0] = { ...blocks[0], title: null };
  return blocks;
}

const signature = (blocks: PosterBlock[]) =>
  JSON.stringify(blocks.map((b) => [b.title, b.gold, b.rows.map((r) => [r.room, r.gdr, r.h9, r.h18])]));

/** Weekday card first, then weekend/holiday; days with identical prices share one card. */
export function buildPoster(rules: PriceRule[]): PosterCard[] {
  const by = Object.fromEntries(DAYS.map((d) => [d, blocksForDay(rules, d)])) as Record<Day, PosterBlock[]>;
  const cards: PosterCard[] = [];
  const sig = (d: Day) => signature(by[d]);
  const has = (d: Day) => by[d].length > 0;
  if (has('weekday') && has('weekend') && has('holiday') && sig('weekday') === sig('weekend') && sig('weekend') === sig('holiday'))
    return [{ key: 'all', title: 'MỖI NGÀY', blocks: by.weekday }];
  if (has('weekday')) cards.push({ key: 'weekday', title: 'THỨ HAI – THỨ SÁU', blocks: by.weekday });
  if (has('weekend') && has('holiday') && sig('weekend') === sig('holiday'))
    cards.push({ key: 'weekend', title: 'THỨ 7 – CN – LỄ', blocks: by.weekend });
  else {
    if (has('weekend')) cards.push({ key: 'weekend', title: 'THỨ 7 – CN', blocks: by.weekend });
    if (has('holiday')) cards.push({ key: 'holiday', title: 'NGÀY LỄ', blocks: by.holiday });
  }
  return cards;
}

export type PosterPackage = { id: string; name: string; price: number; lines: string[] };
export type PosterPackageCard = {
  id: string;
  title: string;
  /** Text every package in the card shares (e.g. "Không giới hạn giờ chơi"), shown once under the title. */
  subtitle: string | null;
  footnote: string | null;
  items: PosterPackage[];
};

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('vi-VN') + s.slice(1);
const perkParts = (p: PackageItem) =>
  p.perks
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);

/** One card per package section, listing what the catalogue sells right now. */
export function buildPackageCards(groups: PackageGroup[]): PosterPackageCard[] {
  return groups.map((g) => {
    const prefix = `${g.title} · `;
    const parts = g.items.map(perkParts);
    const first = parts[0]?.[0];
    const sharedFirst = !!first && parts.every((p) => p[0] === first);
    const second = parts[0]?.[1];
    const sharedSecond = !!second && parts.every((p) => p[1] === second);
    const unlimited = g.items.every((p) => p.grants.some((x) => x.qty >= UNLIMITED));
    const skip = sharedFirst ? (sharedSecond ? 2 : 1) : 0;
    return {
      id: g.id,
      title: g.title,
      subtitle: sharedFirst ? cap(first) : unlimited ? 'Không giới hạn giờ chơi' : null,
      footnote: sharedSecond ? `${cap(second)}.` : null,
      items: g.items.map((p, i) => ({
        id: p.id,
        name: p.name.startsWith(prefix) ? p.name.slice(prefix.length) : p.name,
        price: p.price,
        // Per-package details only; what every package shares is said once for the card.
        lines: parts[i].slice(skip).map(cap),
      })),
    };
  });
}
