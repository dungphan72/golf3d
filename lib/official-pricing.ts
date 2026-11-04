import type { DayType, PriceRule, Service } from './pricing.ts';

/**
 * Official price list supplied by the owner (09/2026), see docs/PRICING.md.
 * Assumptions awaiting owner confirmation:
 *  - 9/18-hole prices are per person for 1–3 players; a foursome pays the group price.
 *  - VIP rooms share the standard prices (no separate list was given).
 *  - Prices are before VAT/service fee (configured separately in settings).
 */
const OPEN = '08:00';
const CLOSE = '23:00';
const PEAK_END = '11:00';
const PER_PERSON = {
  '9': { peak: 300_000, normal: 500_000 },
  '18': { peak: 400_000, normal: 650_000 },
};
const GROUP_OF_4 = { '9': 900_000, '18': 1_000_000 };
const GDR = { peak: 100_000, normal: 250_000 };

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
    add(room, 'gdr', 'weekday', OPEN, PEAK_END, null, GDR.peak, 'Giờ vàng T2–T6');
    add(room, 'gdr', 'weekday', PEAK_END, CLOSE, null, GDR.normal, 'Giờ thường T2–T6');
    add(room, 'gdr', 'weekend', OPEN, CLOSE, null, GDR.normal, 'Cuối tuần');
    add(room, 'gdr', 'holiday', OPEN, CLOSE, null, GDR.normal, 'Ngày lễ');
    for (const service of ['9', '18'] as const) {
      const p = PER_PERSON[service];
      for (let people = 1; people <= 3; people++) {
        add(room, service, 'weekday', OPEN, PEAK_END, people, p.peak * people, 'Giờ vàng T2–T6');
        add(
          room,
          service,
          'weekday',
          PEAK_END,
          CLOSE,
          people,
          p.normal * people,
          'Giờ thường T2–T6',
        );
        add(room, service, 'weekend', OPEN, CLOSE, people, p.normal * people, 'Cuối tuần');
        add(room, service, 'holiday', OPEN, CLOSE, people, p.normal * people, 'Ngày lễ');
      }
      for (const day of ['weekday', 'weekend', 'holiday'] as const)
        add(room, service, day, OPEN, CLOSE, 4, GROUP_OF_4[service], 'Nhóm 4 người cả ngày');
    }
  }
  return rules;
}
