import type { DayType, PriceRule, Service } from './pricing.ts';

/**
 * Official price list ("Bảng giá" poster, 11/2026), see docs/PRICING.md.
 *  - GDR is per line per hour; 9/18 holes are per person (a group of N pays N × the per-person price).
 *  - Standard and VIP lines have separate prices.
 *  - Golden hour 06:00–11:00 Mon–Fri; 11:00–23:00 normal; Sat, Sun and holidays one price all day.
 *  - The poster lists the normal slot as 11:10–23:00; the 10 minutes between are priced as normal
 *    so no booking ever lands in a gap without a price.
 *  - Prices are before VAT/service fee (configured separately in settings).
 */
const OPEN = '06:00';
const CLOSE = '23:00';
const PEAK_END = '11:00';

type Row = { gdr: number; '9': number; '18': number };
type RoomPrices = { peak: Row; normal: Row; weekend: Row };

const PRICES: Record<'standard' | 'vip', RoomPrices> = {
  standard: {
    peak: { gdr: 100_000, '9': 250_000, '18': 350_000 },
    normal: { gdr: 150_000, '9': 300_000, '18': 400_000 },
    weekend: { gdr: 200_000, '9': 350_000, '18': 450_000 },
  },
  vip: {
    peak: { gdr: 150_000, '9': 350_000, '18': 450_000 },
    normal: { gdr: 200_000, '9': 400_000, '18': 500_000 },
    weekend: { gdr: 250_000, '9': 450_000, '18': 550_000 },
  },
};

export function officialPriceRules(): PriceRule[] {
  const rules: PriceRule[] = [];
  const add = (
    room: 'standard' | 'vip',
    service: Service,
    day: DayType,
    from: string,
    to: string,
    people: number | null,
    amount: number,
    label: string,
  ) =>
    rules.push({
      id: `${room}-${service}-${people ?? 0}-${day}-${from}`,
      label,
      service,
      room,
      day,
      from,
      to,
      people,
      amount,
      enabled: true,
    });
  for (const room of ['standard', 'vip'] as const) {
    const p = PRICES[room];
    add(room, 'gdr', 'weekday', OPEN, PEAK_END, null, p.peak.gdr, 'Giờ vàng T2–T6');
    add(room, 'gdr', 'weekday', PEAK_END, CLOSE, null, p.normal.gdr, 'Giờ thường T2–T6');
    add(room, 'gdr', 'weekend', OPEN, CLOSE, null, p.weekend.gdr, 'Thứ 7, Chủ nhật');
    add(room, 'gdr', 'holiday', OPEN, CLOSE, null, p.weekend.gdr, 'Ngày lễ');
    for (const service of ['9', '18'] as const) {
      for (let people = 1; people <= 4; people++) {
        add(room, service, 'weekday', OPEN, PEAK_END, people, p.peak[service] * people, 'Giờ vàng T2–T6');
        add(room, service, 'weekday', PEAK_END, CLOSE, people, p.normal[service] * people, 'Giờ thường T2–T6');
        add(room, service, 'weekend', OPEN, CLOSE, people, p.weekend[service] * people, 'Thứ 7, Chủ nhật');
        add(room, service, 'holiday', OPEN, CLOSE, people, p.weekend[service] * people, 'Ngày lễ');
      }
    }
  }
  return rules;
}
