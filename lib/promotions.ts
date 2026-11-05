/**
 * Promotions managed in the admin (Cài đặt → Khuyến mãi). One list drives the website, the booking
 * quote and the bill, so a promotion is entered once and applies everywhere.
 *
 *  - percent: giảm X% trên giá niêm yết
 *  - amount:  giảm X đồng cho mỗi giờ (Luyện tập) hoặc mỗi người (Game 9/18 hố)
 *  - price:   giá ưu đãi cố định X đồng mỗi giờ hoặc mỗi người
 *
 * An automatic promotion is applied by the price engine when the play time, service and room
 * match; the best single promotion wins (no stacking). A non-automatic one is only shown, for
 * conditions the system cannot check (age, membership) that staff confirm at the counter.
 */
export type PromoService = 'gdr' | '9' | '18';
export type PromoKind = 'percent' | 'amount' | 'price';
export type Promotion = {
  id: string;
  name: string;
  description: string;
  kind: PromoKind;
  value: number;
  services: PromoService[]; // empty = every service
  rooms: ('standard' | 'vip')[]; // empty = both rooms
  weekdays: number[]; // 0 = Sunday ... 6 = Saturday, Vietnam time; empty = every day
  from: string; // time window, '00:00'–'24:00'
  to: string;
  startDate: string; // 'YYYY-MM-DD' or '' for no start limit
  endDate: string; // 'YYYY-MM-DD' or '' for no end limit
  auto: boolean;
  enabled: boolean;
};

const HOUR = 3_600_000;
export const MIN_PRICE = 1000;
export const WEEKDAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
export const SERVICE_NAMES: Record<PromoService, string> = {
  gdr: 'Luyện tập',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
};

const clockMin = (clock: string) => {
  if (clock === '24:00') return 1440;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))
    throw new Error('Khung giờ khuyến mãi không hợp lệ');
  return Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
};
const validDate = (d: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const x = new Date(d + 'T00:00:00Z');
  return Number.isFinite(x.getTime()) && x.toISOString().slice(0, 10) === d;
};

export function validatePromotions(list: Promotion[]) {
  const ids = new Set<string>();
  for (const p of list) {
    if (ids.has(p.id)) throw new Error('Mã khuyến mãi bị trùng');
    ids.add(p.id);
    if (!p.name.trim()) throw new Error('Khuyến mãi cần có tên');
    if (!Number.isInteger(p.value) || p.value <= 0)
      throw new Error(`${p.name}: mức khuyến mãi phải là số nguyên lớn hơn 0`);
    if (p.kind === 'percent' && p.value > 90)
      throw new Error(`${p.name}: giảm phần trăm tối đa 90%`);
    if (p.kind !== 'percent' && (p.value < MIN_PRICE || p.value > 100_000_000))
      throw new Error(`${p.name}: số tiền tối thiểu ${MIN_PRICE} đồng`);
    if (clockMin(p.from) >= clockMin(p.to)) throw new Error(`${p.name}: khung giờ không hợp lệ`);
    if (p.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
      throw new Error(`${p.name}: ngày trong tuần không hợp lệ`);
    for (const d of [p.startDate, p.endDate])
      if (d && !validDate(d)) throw new Error(`${p.name}: ngày không hợp lệ`);
    if (p.startDate && p.endDate && p.startDate > p.endDate)
      throw new Error(`${p.name}: ngày kết thúc phải sau ngày bắt đầu`);
  }
}

/** Vietnam calendar date, weekday and minute of the day for an instant. */
export function vnParts(ms: number) {
  const d = new Date(ms + 7 * HOUR);
  return {
    date: d.toISOString().slice(0, 10),
    weekday: d.getUTCDay(),
    minute: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

/** Whether the promotion is running at this time for this service and room. */
export function promoApplies(p: Promotion, ms: number, service: PromoService, vip: boolean) {
  if (!p.enabled) return false;
  const t = vnParts(ms);
  return (
    (!p.services.length || p.services.includes(service)) &&
    (!p.rooms.length || p.rooms.includes(vip ? 'vip' : 'standard')) &&
    (!p.weekdays.length || p.weekdays.includes(t.weekday)) &&
    (!p.startDate || t.date >= p.startDate) &&
    (!p.endDate || t.date <= p.endDate) &&
    t.minute >= clockMin(p.from) &&
    t.minute < clockMin(p.to)
  );
}

/** Price after the promotion; `unit` is the number of people for a per-person promotion. */
export function promoPrice(p: Promotion, list: number, unit = 1) {
  const price =
    p.kind === 'percent'
      ? Math.round((list * (100 - p.value)) / 100)
      : p.kind === 'amount'
        ? list - p.value * unit
        : p.value * unit;
  return Math.max(MIN_PRICE, price);
}

/** The automatic promotion that gives the lowest price right now, if any lowers it. */
export function bestPromo(
  list: Promotion[] | undefined,
  ms: number,
  service: PromoService,
  vip: boolean,
  listPrice: number,
  unit = 1,
) {
  let best: { promo: Promotion; amount: number } | null = null;
  for (const p of list ?? []) {
    if (!p.auto || !promoApplies(p, ms, service, vip)) continue;
    const amount = promoPrice(p, listPrice, unit);
    if (amount < listPrice && (!best || amount < best.amount)) best = { promo: p, amount };
  }
  return best;
}

const dong = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const dayMonth = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export function benefitText(p: Promotion) {
  const per = p.services.length === 1 && p.services[0] === 'gdr' ? 'giờ' : 'người';
  const unit = !p.services.length ? 'giờ hoặc người' : per;
  if (p.kind === 'percent') return `Giảm ${p.value}%`;
  if (p.kind === 'amount') return `Giảm ${dong(p.value)} mỗi ${unit}`;
  return `Chỉ ${dong(p.value)} mỗi ${unit}`;
}

/** "Thứ 3 · 12:00–23:00 · Game 9 hố · phòng tiêu chuẩn · đến 30/11/2026". */
export function conditionText(p: Promotion) {
  const parts: string[] = [];
  parts.push(
    !p.weekdays.length || p.weekdays.length === 7
      ? 'Mỗi ngày'
      : [...p.weekdays]
          .sort()
          .map((d) => WEEKDAY_NAMES[d])
          .join(', '),
  );
  if (p.from !== '00:00' || p.to !== '24:00') parts.push(`${p.from}–${p.to}`);
  if (p.services.length) parts.push(p.services.map((s) => SERVICE_NAMES[s]).join(', '));
  if (p.rooms.length === 1) parts.push(p.rooms[0] === 'vip' ? 'phòng VIP' : 'phòng tiêu chuẩn');
  if (p.startDate && p.endDate) parts.push(`${dayMonth(p.startDate)} – ${dayMonth(p.endDate)}`);
  else if (p.endDate) parts.push(`đến ${dayMonth(p.endDate)}`);
  else if (p.startDate) parts.push(`từ ${dayMonth(p.startDate)}`);
  return parts.join(' · ');
}

export const newPromotion = (): Promotion => ({
  id: 'km-' + Math.random().toString(36).slice(2, 10),
  name: '',
  description: '',
  kind: 'percent',
  value: 10,
  services: [],
  rooms: [],
  weekdays: [],
  from: '00:00',
  to: '24:00',
  startDate: '',
  endDate: '',
  auto: true,
  enabled: true,
});
