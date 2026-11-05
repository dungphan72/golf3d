import type { Config, Segment } from './club.ts';
import { officialPriceRules } from './official-pricing.ts';
import { bestPromo } from './promotions.ts';

export type Service = 'gdr' | '9' | '18';
export type DayType = 'weekday' | 'weekend' | 'holiday';
export type PriceRule = {
  id: string;
  label: string;
  service: Service;
  room: 'standard' | 'vip';
  day: DayType;
  from: string;
  to: string;
  people: number | null;
  amount: number;
  enabled: boolean;
};
export type PriceLine = {
  date: string;
  label: string;
  minutes: number;
  rate: number;
  amount: number;
  from?: number;
  to?: number;
  ruleId?: string;
  /** Promotion that lowered this line's hourly rate, if any. */
  promoId?: string;
};
export type Bill = {
  lines: PriceLine[];
  subtotal: number;
  fee: number;
  vat: number;
  total: number;
};
const MINUTE = 60000;
const HOUR = 3600000;

export function clockMinute(clock: string, end = false) {
  if (end && clock === '24:00') return 1440;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) throw new Error('Khung giờ không hợp lệ');
  return Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
}
export function ruleWindows(rule: PriceRule): [number, number][] {
  const from = clockMinute(rule.from),
    to = clockMinute(rule.to, true);
  if (from === to) throw new Error('Khung giờ bắt đầu và kết thúc phải khác nhau');
  return to > from
    ? [[from, to]]
    : [
        [from, 1440],
        [0, to],
      ];
}
export function validateRules(rules: PriceRule[]) {
  const ids = new Set<string>();
  for (const rule of rules) {
    if (ids.has(rule.id)) throw new Error('Mã quy tắc giá bị trùng');
    ids.add(rule.id);
    ruleWindows(rule);
    if (!Number.isSafeInteger(rule.amount) || rule.amount <= 0 || rule.amount > 100_000_000)
      throw new Error('Đơn giá phải là số đồng nguyên lớn hơn 0, tối đa 100 triệu');
    if (rule.service === 'gdr' && rule.people !== null)
      throw new Error('Giá GDR áp dụng theo phòng, không theo số người');
    if (
      rule.service !== 'gdr' &&
      (!Number.isInteger(rule.people) || rule.people! < 1 || rule.people! > 4)
    )
      throw new Error('Giá trọn lượt cần số người từ 1 đến 4');
  }
  for (let i = 0; i < rules.length; i++)
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i],
        b = rules[j];
      if (
        !a.enabled ||
        !b.enabled ||
        a.room !== b.room ||
        a.service !== b.service ||
        a.day !== b.day ||
        a.people !== b.people
      )
        continue;
      if (ruleWindows(a).some(([s, e]) => ruleWindows(b).some(([x, y]) => s < y && x < e)))
        throw new Error(`Khung giá trùng: ${a.label} / ${b.label}`);
    }
}
export function dayAt(ms: number, holidays: string[] = []) {
  if (!Number.isFinite(ms) || !Number.isSafeInteger(ms)) throw new Error('Thời gian không hợp lệ');
  const d = new Date(ms + 7 * HOUR);
  if (!Number.isFinite(d.getTime())) throw new Error('Thời gian không hợp lệ');
  const date = d.toISOString().slice(0, 10);
  const day: DayType = holidays.includes(date)
    ? 'holiday'
    : d.getUTCDay() === 0 || d.getUTCDay() === 6
      ? 'weekend'
      : 'weekday';
  return { date, day, minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
export function selectRule(ms: number, c: Config, service: Service, vip: boolean, people = 1) {
  const p = dayAt(ms, c.holidays);
  const matches = (c.priceRules ?? []).filter(
    (r) =>
      r.enabled &&
      r.service === service &&
      r.room === (vip ? 'vip' : 'standard') &&
      r.day === p.day &&
      (service === 'gdr' || r.people === people) &&
      ruleWindows(r).some(([s, e]) => p.minute >= s && p.minute < e),
  );
  if (matches.length > 1) throw new Error('Có khung giá trùng, hãy kiểm tra cấu hình');
  if (!matches.length)
    throw new Error(
      `Chưa có giá ${vip ? 'VIP' : 'line tiêu chuẩn'} · ${service === 'gdr' ? 'GDR' : service + ' hố'} · ${p.date} ${String(Math.floor(p.minute / 60)).padStart(2, '0')}:${String(p.minute % 60).padStart(2, '0')}`,
    );
  return matches[0];
}
function roundRatio(numerator: bigint, denominator: bigint) {
  return Number((numerator + denominator / 2n) / denominator);
}
export function billTotals(subtotal: number, c: Config, service: Service = 'gdr') {
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) throw new Error('Tiền dịch vụ không hợp lệ');
  const applies = c.feeServices === undefined || c.feeServices.includes(service);
  const fee = applies
    ? c.feeMode === 'fixed'
      ? (c.fee ?? 0)
      : Math.round((subtotal * (c.fee ?? 0)) / 100)
    : 0;
  const vat = Math.round(((subtotal + fee) * (c.vat ?? 0)) / 100);
  return { subtotal, fee, vat, total: subtotal + fee + vat };
}
export function ruleQuote(segments: Segment[], c: Config, vip = false): Bill {
  if (segments.length > 1000) throw new Error('Quá nhiều đoạn thời gian');
  const lines: PriceLine[] = [];
  const numerators: bigint[] = [];
  const keys: string[] = [];
  let previousEnd = -Infinity,
    totalDuration = 0;
  for (const s of segments) {
    if (
      !Number.isSafeInteger(s.start) ||
      !Number.isSafeInteger(s.end) ||
      s.end < s.start ||
      s.start < previousEnd
    )
      throw new Error('Đoạn thời gian không hợp lệ hoặc bị trùng');
    previousEnd = s.end;
    totalDuration += s.end - s.start;
    if (totalDuration > 31 * 24 * HOUR)
      throw new Error('Phiên vượt 31 ngày; cần kiểm tra trước khi tính tiền');
    let t = s.start;
    while (t < s.end) {
      const p = dayAt(t, c.holidays),
        r = selectRule(t, c, 'gdr', vip);
      if (!Number.isSafeInteger(r.amount) || r.amount <= 0) throw new Error('Đơn giá không hợp lệ');
      const end = Math.min(s.end, (Math.floor(t / MINUTE) + 1) * MINUTE);
      // The best automatic promotion running at this minute lowers the hourly rate.
      const promo = bestPromo(c.promotions, t, 'gdr', vip, r.amount);
      const rate = promo ? promo.amount : r.amount;
      const key = promo ? r.id + '|' + promo.promo.id : r.id;
      const numerator = BigInt(rate) * BigInt(end - t);
      const last = lines.at(-1);
      if (last && keys.at(-1) === key && last.date === p.date && last.to === t) {
        last.minutes += (end - t) / MINUTE;
        last.to = end;
        numerators[numerators.length - 1] += numerator;
      } else {
        lines.push({
          date: p.date,
          label: promo ? `${r.label} · KM ${promo.promo.name}` : r.label,
          minutes: (end - t) / MINUTE,
          rate,
          amount: 0,
          from: t,
          to: end,
          ruleId: r.id,
          ...(promo ? { promoId: promo.promo.id } : {}),
        });
        keys.push(key);
        numerators.push(numerator);
      }
      t = end;
    }
  }
  const subtotal = roundRatio(
    numerators.reduce((a, b) => a + b, 0n),
    BigInt(HOUR),
  );
  // Allocate VND rounding cumulatively so the displayed rows always add to subtotal.
  let cumulative = 0n,
    allocated = 0;
  lines.forEach((line, i) => {
    cumulative += numerators[i];
    const rounded = roundRatio(cumulative, BigInt(HOUR));
    line.amount = rounded - allocated;
    allocated = rounded;
  });
  return { lines, ...billTotals(subtotal, c) };
}
export function packagePrice(
  start: number,
  c: Config,
  service: '9' | '18',
  vip: boolean,
  people: number,
) {
  if (c.priceRules !== undefined) {
    const rule = selectRule(start, c, service, vip, people);
    // Whole-round prices are per group of `people`; per-person promotions scale with the group.
    const promo = bestPromo(c.promotions, start, service, vip, rule.amount, people);
    return {
      base: promo ? promo.amount : rule.amount,
      listBase: rule.amount,
      promo: promo ? { id: promo.promo.id, name: promo.promo.name } : null,
      ruleId: rule.id,
      label: rule.label,
    };
  }
  // Only immutable v0.1 snapshots use legacy flat package prices.
  const prices = service === '9' ? (vip ? c.vip9 : c.hole9) : vip ? c.vip18 : c.hole18;
  const base = prices[people - 1];
  if (!base) throw new Error('Chưa cấu hình giá trọn lượt');
  return { base, listBase: base, promo: null, ruleId: 'legacy', label: 'Giá trọn lượt v0.1' };
}
export function seedPriceRules(c: Config, reference = false): PriceRule[] {
  const result: PriceRule[] = [];
  const add = (
    service: Service,
    room: 'standard' | 'vip',
    day: DayType,
    from: string,
    to: string,
    amount: number | null,
    people: number | null,
    label: string,
  ) => {
    if (amount != null && amount > 0)
      result.push({
        id: `${room}-${service}-${people ?? 0}-${day}-${from}`,
        service,
        room,
        day,
        from,
        to,
        amount,
        people,
        label,
        enabled: true,
      });
  };
  for (const room of ['standard', 'vip'] as const) {
    const vip = room === 'vip',
      normal = vip ? c.vipRate : c.rate,
      happy = vip ? c.vipHappy : c.happy;
    // Legacy configuration explicitly used an all-day normal fallback; preserve it on upgrade.
    if (!reference) add('gdr', room, 'weekday', '00:00', '08:00', normal, null, 'Trước Happy Hour');
    add('gdr', room, 'weekday', '08:00', '11:00', happy, null, 'Happy Hour');
    add(
      'gdr',
      room,
      'weekday',
      '11:00',
      reference ? '23:00' : '24:00',
      normal,
      null,
      'Giờ tiêu chuẩn',
    );
    add(
      'gdr',
      room,
      'weekend',
      reference ? '08:00' : '00:00',
      reference ? '23:00' : '24:00',
      normal,
      null,
      'Cuối tuần',
    );
    add(
      'gdr',
      room,
      'holiday',
      reference ? '08:00' : '00:00',
      reference ? '23:00' : '24:00',
      normal,
      null,
      'Ngày lễ',
    );
    for (const service of ['9', '18'] as const) {
      const values = service === '9' ? (vip ? c.vip9 : c.hole9) : vip ? c.vip18 : c.hole18;
      values.forEach((amount, i) => {
        // The reference site does not say when the foursome price applies; require confirmation.
        if (reference && i === 3) return;
        add(
          service,
          room,
          'weekday',
          reference ? '08:00' : '00:00',
          '11:00',
          amount,
          i + 1,
          'Trọn lượt · buổi sáng',
        );
        const peak = reference && !vip && i === 0 ? (service === '9' ? 500000 : 650000) : amount;
        add(
          service,
          room,
          'weekday',
          '11:00',
          reference ? '23:00' : '24:00',
          peak,
          i + 1,
          'Trọn lượt · tiêu chuẩn',
        );
        add(
          service,
          room,
          'weekend',
          reference ? '08:00' : '00:00',
          reference ? '23:00' : '24:00',
          peak,
          i + 1,
          'Trọn lượt · cuối tuần',
        );
        add(
          service,
          room,
          'holiday',
          reference ? '08:00' : '00:00',
          reference ? '23:00' : '24:00',
          peak,
          i + 1,
          'Trọn lượt · ngày lễ',
        );
      });
    }
  }
  return result;
}
export function upgradeConfig(value: Partial<Config>, fallback: Config): Config {
  const c = { ...fallback, ...value };
  return {
    ...c,
    priceRules:
      c.priceRules ??
      (Object.keys(value).length === 0 ? officialPriceRules() : seedPriceRules(c, false)),
    holidays: c.holidays ?? [],
    offers: c.offers ?? [],
    promotions: c.promotions ?? [],
    feeMode: c.feeMode ?? 'percent',
    feeServices: c.feeServices ?? ['gdr', '9', '18'],
    pricingRevision: c.pricingRevision ?? 'v01-upgrade',
  };
}
