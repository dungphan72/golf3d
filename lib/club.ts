import type { CrmSettings } from './crm.ts';
import type { Promotion } from './promotions.ts';
import {
  ruleQuote,
  billTotals,
  type PriceRule,
  type Service,
  type Bill,
  type PriceLine,
} from './pricing.ts';
export type Config = {
  priceRules?: PriceRule[];
  holidays?: string[];
  feeMode?: 'percent' | 'fixed';
  feeServices?: Service[];
  /**
   * Hourly play (practice) shorter than this many minutes is billed as this many minutes.
   * 0 turns it off; unset (sessions started before this setting existed) = off. Set in Settings.
   */
  minBillMinutes?: number;
  pricingRevision?: string;
  name: string;
  address: string;
  open: string;
  close: string;
  vat: number | null;
  fee: number | null;
  capacity: number | null;
  vipCapacity: number | null;
  vipRate: number | null;
  vipHappy: number | null;
  rate: number;
  happy: number;
  hole9: number[];
  hole18: number[];
  vip9: number[];
  vip18: number[];
  holeMinutes9: number[];
  holeMinutes18: number[];
  buffer: number;
  clean: number;
  vipClean: number;
  days: number;
  grace: number;
  cancelHours: number;
  published: boolean;
  onlineEnabled?: boolean;
  onlineSlug?: string;
  bankBin?: string;
  bankAccount?: string;
  bankHolder?: string;
  /** Promotions shown on the price page, one per line: Tiêu đề | Giá hoặc mức giảm | Điều kiện. */
  offers?: string[];
  /** Promotions entered in the admin; applied automatically by the price engine (see promotions.ts). */
  promotions?: Promotion[];
  /** CRM flow switches and message templates (see crm.ts). */
  crm?: Partial<CrmSettings>;
  /** Perks on the membership page, one per line: Tiêu đề | Mô tả. Unset = the standard list. */
  memberBenefits?: string[];
  /** Spending (đồng) that earns Gold / Platinum / Diamond. Unset = 50 / 80 / 100 million. */
  tierThresholds?: { gold: number; platinum: number; diamond: number };
  /** Extended facility, invoice, and operational settings (Single Source of Truth). */
  hotline?: string;
  email?: string;
  website?: string;
  logo?: string;
  invoiceHeader?: string;
  taxCode?: string;
  invoiceFooterNote?: string;
  depositPercent?: number;
  autoCancelGrace?: number;
  generalConfig?: {
    language?: string;
    currency?: string;
    dateFormat?: string;
    soundAlert?: boolean;
    autoRefreshSec?: number;
  };
  marketingConfig?: {
    fbPixel?: string;
    ga4Id?: string;
    mapsPlaceId?: string;
    zaloOaId?: string;
  };
  matchmakingConfig?: {
    enabled?: boolean;
    maxHdcDiff?: number;
    autoNotifyZalo?: boolean;
  };
  tournamentConfig?: {
    defaultFormat?: string;
    hdcSystem?: string;
    liveLeaderboard?: boolean;
  };
  academyConfig?: {
    commissionRate?: number;
    lessonMinutes?: number;
    freeTrialAvailable?: boolean;
  };
  customTables?: Record<string, Record<string, string>[]>;
  customCards?: {
    id: string;
    cat: string;
    title: string;
    subtitle: string;
    badge: string;
    badgeType: string;
    iconBg: string;
    meta: { label: string; value: string }[];
  }[];
  cardTitleOverrides?: Record<string, { title: string; subtitle: string; badge: string }>;
  hiddenCardIds?: string[];
};
export const defaults: Config = {
  name: 'SaiGon Indoor Golf Club',
  address: '250 Lương Định Của, Phường Bình Trưng, TP.HCM',
  open: '',
  close: '',
  vat: null,
  fee: null,
  capacity: null,
  vipCapacity: null,
  vipRate: null,
  vipHappy: null,
  rate: 250000,
  happy: 100000,
  hole9: [300000, 0, 0, 900000],
  hole18: [400000, 0, 0, 1000000],
  vip9: [0, 0, 0, 0],
  vip18: [0, 0, 0, 0],
  holeMinutes9: [0, 0, 0, 0],
  holeMinutes18: [0, 0, 0, 0],
  buffer: 0,
  clean: 5,
  vipClean: 10,
  days: 2,
  grace: 15,
  cancelHours: 2,
  published: false,
};
export const rooms = Array.from({ length: 12 }, (_, i) => ({
  id: i < 10 ? `line-${i + 1}` : `vip-${i - 9}`,
  name: i < 10 ? `Line ${String(i + 1).padStart(2, '0')}` : `VIP ${String(i - 9).padStart(2, '0')}`,
  vip: i >= 10,
  left: i === 9,
}));
export type Segment = { start: number; end: number };
export type Booking = {
  food_total?: number;
  golf_amount?: number | null;
  id: string;
  tenant: string;
  room: string;
  customer: string;
  phone: string;
  service: string;
  people: number;
  start: number;
  end: number;
  status: string;
  segments: string;
  started: number | null;
  finished: number | null;
  amount: number | null;
  payment: string | null;
  price: string;
  created: number;
};
// `n || 0` turns -0 (a refund or expense total of nothing) into 0, which Intl would otherwise print as "-0".
export const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' ₫';
export function localParts(ms: number) {
  const d = new Date(ms + 7 * 3600000);
  return {
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    day: d.getUTCDay(),
    date: d.toISOString().slice(0, 10),
  };
}
export function quote(segments: Segment[], c: Config, vip = false): Bill {
  if (c.priceRules !== undefined) return ruleQuote(segments, c, vip);
  const lines: { date: string; label: string; minutes: number; rate: number; amount: number }[] =
    [];
  for (const s of segments) {
    if (s.end < s.start) throw new Error('Thời gian không hợp lệ');
    let t = s.start;
    while (t < s.end) {
      const p = localParts(t);
      const happy = p.day !== 0 && p.day !== 6 && p.hour >= 8 && p.hour < 11;
      const rate = vip ? (happy ? c.vipHappy : c.vipRate) : happy ? c.happy : c.rate;
      if (rate == null || rate <= 0) throw new Error('Chưa cấu hình giá phòng');
      const boundary = (Math.floor(t / 60000) + 1) * 60000;
      const end = Math.min(boundary, s.end);
      const minutes = (end - t) / 60000;
      const label = happy ? 'Happy Hour' : 'Giờ tiêu chuẩn';
      const prev = lines.at(-1);
      if (prev && prev.label === label && prev.rate === rate && prev.date === p.date) {
        prev.minutes += minutes;
        prev.amount += (rate * minutes) / 60;
      } else lines.push({ date: p.date, label, minutes, rate, amount: (rate * minutes) / 60 });
      t = end;
    }
  }
  const subtotal = Math.round(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, ...billTotals(subtotal, c) };
}
export function wholeQuote(base: number, c: Config, service: Service = 'gdr') {
  return { lines: [], ...billTotals(base, c, service) };
}
export const serviceName = (s: Service) => (s === 'gdr' ? 'Tập theo giờ' : `Chơi game ${s} hố`);
/** A finished stretch of a session that changed between hourly practice and a game round. */
export type PriorPart = { service: Service; subtotal: number; lines: PriceLine[] };
export type BillPart = { service: Service; label: string; subtotal: number; lines: PriceLine[] };
export function packageLine(
  service: Service,
  base: number,
  promo?: { name: string } | null,
  at?: number,
): PriceLine {
  return {
    date: at != null ? localParts(at).date : '',
    label: `${serviceName(service)} (trọn lượt)${promo ? ` · KM ${promo.name}` : ''}`,
    minutes: 0,
    rate: 0,
    amount: base,
    package: true,
  };
}
export function clipSegments(segments: Segment[], from: number): Segment[] {
  return segments
    .map((s) => ({ start: Math.max(s.start, from), end: s.end }))
    .filter((s) => s.end > s.start);
}
/**
 * Bill of a session. Without a switch it is the plain hourly or whole-round quote. After switching
 * between practice and a game, each finished stretch stays on the bill and the current one adds to it.
 */
/**
 * Hourly play shorter than the minimum is billed as the minimum: the missing minutes are added after the
 * last segment, at the price that applies to those minutes. A session that never ran (no time) stays free.
 */
export function padToMinimum(
  segments: Segment[],
  minMinutes: number,
): { segments: Segment[]; added: number } {
  const min = Math.floor(minMinutes) * 60_000;
  if (!(min > 0) || !segments.length) return { segments, added: 0 };
  const played = segments.reduce((s, x) => s + (x.end - x.start), 0);
  if (played <= 0 || played >= min) return { segments, added: 0 };
  const deficit = min - played;
  const last = segments[segments.length - 1];
  return {
    segments: [...segments.slice(0, -1), { ...last, end: last.end + deficit }],
    added: deficit,
  };
}

function baseSessionQuote(
  service: Service,
  segments: Segment[],
  snap: { config: Config; vip?: boolean; base: number; promo?: { name: string } | null; prior?: PriorPart[]; phaseFrom?: number },
): Bill & { parts?: BillPart[] } {
  const prior = snap.prior ?? [];
  if (!prior.length) {
    if (service !== 'gdr') return wholeQuote(snap.base, snap.config, service);
    return quote(segments, snap.config, snap.vip);
  }
  const lines: PriceLine[] = prior.flatMap((p) => p.lines);
  const parts: BillPart[] = prior.map((p) => ({
    service: p.service,
    label: serviceName(p.service),
    subtotal: p.subtotal,
    lines: p.lines,
  }));
  let subtotal = prior.reduce((s, p) => s + p.subtotal, 0);
  if (service === 'gdr') {
    const cur = quote(clipSegments(segments, snap.phaseFrom ?? 0), snap.config, snap.vip);
    const curLines = cur.lines.map((l) => ({ ...l, label: `${serviceName('gdr')} · ${l.label}` }));
    lines.push(...curLines);
    parts.push({ service, label: serviceName(service), subtotal: cur.subtotal, lines: curLines });
    subtotal += cur.subtotal;
  } else {
    const line = packageLine(service, snap.base, snap.promo);
    lines.push(line);
    parts.push({ service, label: serviceName(service), subtotal: snap.base, lines: [line] });
    subtotal += snap.base;
  }
  const all = [...prior.map((p) => p.service), service];
  const feeService =
    snap.config.feeServices === undefined
      ? service
      : (all.find((s) => snap.config.feeServices!.includes(s)) ?? service);
  return { lines, parts, ...billTotals(subtotal, snap.config, feeService) };
}
/**
 * Minimum charge of a plain hourly session. When the staff confirm it at payment, the golf part of a
 * finished hourly session that came to less is raised to this amount. It is recorded on the booking
 * (`price.minCharge`) so the bill and the receipt show it. It never applies once a session has been
 * switched between practice and a game.
 */
export const MIN_HOURLY_CHARGE = 100_000;
export type MinCharge = { from: number; to: number; minMinutes?: number; at: number; actor: string };

export function sessionQuote(
  service: Service,
  segments: Segment[],
  snap: {
    config: Config;
    vip?: boolean;
    base: number;
    promo?: { name: string } | null;
    prior?: PriorPart[];
    phaseFrom?: number;
    minCharge?: MinCharge;
    keepActual?: boolean;
  },
): Bill & { parts?: BillPart[] } {
  const bill = baseSessionQuote(service, segments, snap);
  const m = snap.minCharge;
  if (!m || service !== 'gdr' || (snap.prior?.length ?? 0) > 0 || bill.total >= m.to) return bill;
  // The raise is its own line, so lines + service fee + VAT still add up to the new total.
  return {
    ...bill,
    lines: [
      ...bill.lines,
      {
        date: '',
        label: `Làm tròn tối thiểu ${m.minMinutes ? m.minMinutes + ' phút' : ''} (${money(m.to)})`.trim(),
        minutes: 0,
        rate: 0,
        amount: m.to - bill.total,
        package: true,
      },
    ],
    total: m.to,
  };
}

/** The raise to offer at payment, or null when it does not apply (not hourly, switched, already done, nothing owed). */
export function minChargeOffer(
  b: Pick<Booking, 'status' | 'service' | 'price' | 'golf_amount'> & {
    segments?: string;
  },
): { golf: number; to: number; playedMinutes?: number; minMinutes?: number } | null {
  if (b.status !== 'finished' || b.service !== 'gdr' || b.golf_amount == null) return null;
  let snap: {
    config?: Config;
    vip?: boolean;
    prior?: unknown[];
    minCharge?: unknown;
    keepActual?: boolean;
  };
  try {
    snap = JSON.parse(b.price);
  } catch {
    return null;
  }
  if (snap.prior?.length || snap.minCharge || snap.keepActual) return null;

  // If segments are provided, compute based on the 60-minute (minBillMinutes) rule
  if (b.segments) {
    let segs: Segment[] = [];
    try {
      segs = JSON.parse(b.segments || '[]');
    } catch {
      segs = [];
    }
    // If segments array is empty but we have finished and start times
    if (segs.length === 0 && (b as any).finished) {
      const startTime = (b as any).started || (b as any).start;
      if (startTime && (b as any).finished > startTime) {
        segs.push({ start: startTime, end: (b as any).finished });
      }
    }

    if (segs.length > 0) {
      const minMinutes = snap.config?.minBillMinutes ?? 60;
      if (minMinutes > 0) {
        const playedMs = segs.reduce((sum, s) => sum + Math.max(0, s.end - s.start), 0);
        const playedMinutes = Math.round(playedMs / 60_000);

        // CRITICAL RULE: If the customer played 60 minutes or more, DO NOT ASK!
        if (playedMinutes >= minMinutes) {
          return null;
        }

        if (playedMs > 0 && playedMinutes < minMinutes) {
          const config = snap.config ?? defaults;
          const actualBill = quote(segs, config, snap.vip);
          const minBill = quote(padToMinimum(segs, minMinutes).segments, config, snap.vip);
          if (minBill.total > actualBill.total) {
            return {
              golf: actualBill.total,
              to: minBill.total,
              playedMinutes: Math.max(1, playedMinutes),
              minMinutes,
            };
          }
        }
        return null;
      }
    }
  }

  // Legacy fallback ONLY when no segments are available
  if (b.golf_amount <= 0 || b.golf_amount >= MIN_HOURLY_CHARGE) return null;
  return { golf: b.golf_amount, to: MIN_HOURLY_CHARGE };
}

export function ready(c: Config) {
  return (
    !!c.open &&
    !!c.close &&
    c.capacity != null &&
    c.capacity > 0 &&
    c.vipCapacity != null &&
    c.vipCapacity > 0 &&
    c.vat != null &&
    c.fee != null
  );
}
