import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, quote } from '../lib/club.ts';
import { packagePrice, upgradeConfig } from '../lib/pricing.ts';
import { configSchema } from '../lib/config.ts';
import {
  bestPromo,
  benefitText,
  conditionText,
  newPromotion,
  promoApplies,
  promoPrice,
  validatePromotions,
  type Promotion,
} from '../lib/promotions.ts';

const at = (iso: string) => Date.parse(iso + '+07:00');
const TUE_NOON = at('2026-11-10T12:00:00'); // Thứ 3
const SAT_NOON = at('2026-11-14T12:00:00'); // Thứ 7
const promo = (over: Partial<Promotion> = {}): Promotion => ({
  ...newPromotion(),
  id: 'km1',
  name: 'Thứ Ba vui vẻ',
  ...over,
});
const config = (promotions: Promotion[]) => ({ ...upgradeConfig({}, defaults), promotions });

test('a promotion applies only on its weekdays, hours, services, rooms and dates', () => {
  const p = promo({
    weekdays: [2],
    from: '11:00',
    to: '23:00',
    services: ['gdr'],
    rooms: ['standard'],
    startDate: '2026-11-01',
    endDate: '2026-11-30',
  });
  assert.ok(promoApplies(p, TUE_NOON, 'gdr', false));
  assert.ok(!promoApplies(p, SAT_NOON, 'gdr', false), 'wrong weekday');
  assert.ok(!promoApplies(p, at('2026-11-10T10:59:00'), 'gdr', false), 'before the window');
  assert.ok(!promoApplies(p, at('2026-11-10T23:00:00'), 'gdr', false), 'window end is exclusive');
  assert.ok(!promoApplies(p, TUE_NOON, '9', false), 'wrong service');
  assert.ok(!promoApplies(p, TUE_NOON, 'gdr', true), 'wrong room');
  assert.ok(!promoApplies(p, at('2026-12-01T12:00:00'), 'gdr', false), 'after the end date');
  assert.ok(!promoApplies({ ...p, enabled: false }, TUE_NOON, 'gdr', false), 'disabled');
});

test('percent, amount and fixed-price promotions lower the price, never below 1.000đ', () => {
  assert.equal(promoPrice(promo({ kind: 'percent', value: 20 }), 250_000), 200_000);
  assert.equal(promoPrice(promo({ kind: 'amount', value: 30_000 }), 250_000), 220_000);
  assert.equal(promoPrice(promo({ kind: 'amount', value: 30_000 }), 500_000, 2), 440_000);
  assert.equal(promoPrice(promo({ kind: 'price', value: 180_000 }), 250_000), 180_000);
  assert.equal(promoPrice(promo({ kind: 'amount', value: 900_000 }), 250_000), 1000);
});

test('the best automatic promotion wins and promotions do not stack', () => {
  const list = [
    promo({ id: 'a', kind: 'percent', value: 10 }),
    promo({ id: 'b', kind: 'percent', value: 30 }),
    promo({ id: 'c', kind: 'percent', value: 50, auto: false }),
    promo({ id: 'd', kind: 'percent', value: 60, enabled: false }),
  ];
  const best = bestPromo(list, TUE_NOON, 'gdr', false, 250_000)!;
  assert.equal(best.promo.id, 'b');
  assert.equal(best.amount, 175_000);
  assert.equal(
    bestPromo([promo({ kind: 'price', value: 300_000 })], TUE_NOON, 'gdr', false, 250_000),
    null,
  );
});

test('an hour of practice is quoted at the promotional rate, and only while it runs', () => {
  const hour = (iso: string) => {
    const start = at(iso);
    return quote(
      [{ start, end: start + 3_600_000 }],
      config([promo({ weekdays: [2], kind: 'percent', value: 20 })]),
      false,
    );
  };
  const plain = quote([{ start: TUE_NOON, end: TUE_NOON + 3_600_000 }], config([]), false);
  const promoted = hour('2026-11-10T12:00:00');
  assert.equal(promoted.subtotal, Math.round(plain.subtotal * 0.8));
  assert.match(promoted.lines[0].label, /KM Thứ Ba vui vẻ/);
  const sat = at('2026-11-14T12:00:00');
  const satPlain = quote([{ start: sat, end: sat + 3_600_000 }], config([]), false);
  assert.equal(hour('2026-11-14T12:00:00').subtotal, satPlain.subtotal, 'Saturday is not covered');
});

test('a session crossing the start of a promotion is split into a list line and a promo line', () => {
  const c = config([promo({ from: '12:00', to: '23:00', kind: 'percent', value: 50 })]);
  const start = at('2026-11-10T11:00:00');
  const bill = quote([{ start, end: start + 2 * 3_600_000 }], c, false);
  const base = quote([{ start, end: start + 2 * 3_600_000 }], config([]), false);
  assert.ok(bill.subtotal < base.subtotal);
  assert.ok(bill.lines.length > base.lines.length || bill.lines.some((l) => l.promoId));
  assert.equal(
    bill.lines.reduce((s, l) => s + l.amount, 0),
    bill.subtotal,
  );
});

test('per-person promotions scale with the group for whole-round prices', () => {
  const c = config([promo({ kind: 'amount', value: 50_000, services: ['9'] })]);
  const list = packagePrice(TUE_NOON, config([]), '9', false, 2);
  const priced = packagePrice(TUE_NOON, c, '9', false, 2);
  assert.equal(priced.listBase, list.base);
  assert.equal(priced.base, list.base - 100_000);
  assert.deepEqual(priced.promo, { id: 'km1', name: 'Thứ Ba vui vẻ' });
  assert.equal(packagePrice(TUE_NOON, c, '18', false, 2).promo, null);
});

test('bad promotions are rejected', () => {
  const bad: Partial<Promotion>[] = [
    { name: '' },
    { kind: 'percent', value: 95 },
    { kind: 'amount', value: 500 },
    { from: '15:00', to: '10:00' },
    { weekdays: [7] },
    { startDate: '2026-02-30' },
    { startDate: '2026-12-01', endDate: '2026-11-01' },
  ];
  for (const b of bad)
    assert.throws(() => validatePromotions([promo(b)]), Error, JSON.stringify(b));
  assert.throws(() => validatePromotions([promo(), promo()]), /trùng/);
  validatePromotions([promo(), promo({ id: 'km2' })]);
});

test('the settings schema validates promotions and keeps them', () => {
  const base = upgradeConfig({}, defaults);
  const ok = configSchema.safeParse({ ...base, promotions: [promo()] });
  assert.ok(ok.success, JSON.stringify(ok.success ? '' : ok.error.issues));
  assert.equal(ok.success && ok.data.promotions.length, 1);
  assert.ok(!configSchema.safeParse({ ...base, promotions: [promo({ value: 99 })] }).success);
});

test('benefit and condition texts read naturally', () => {
  const p = promo({
    weekdays: [2],
    from: '12:00',
    to: '23:00',
    services: ['9'],
    rooms: ['standard'],
    endDate: '2026-11-30',
  });
  assert.equal(benefitText(promo({ kind: 'percent', value: 20 })), 'Giảm 20%');
  assert.equal(
    benefitText(promo({ kind: 'price', value: 180_000, services: ['gdr'] })),
    'Chỉ 180.000đ mỗi giờ',
  );
  assert.equal(
    benefitText(promo({ kind: 'amount', value: 30_000, services: ['18'] })),
    'Giảm 30.000đ mỗi người',
  );
  assert.equal(
    conditionText(p),
    'Thứ 3 · 12:00–23:00 · Game 9 hố · phòng tiêu chuẩn · đến 30/11/2026',
  );
  assert.equal(conditionText(promo()), 'Mỗi ngày');
});
