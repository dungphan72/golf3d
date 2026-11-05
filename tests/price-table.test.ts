import test from 'node:test';
import assert from 'node:assert/strict';
import { officialPriceRules } from '../lib/official-pricing.ts';
import { OFFICIAL_PACKAGES } from '../lib/official-packages.ts';
import {
  buildPriceTable,
  groupPackages,
  vipDiffers,
  packageBullets,
  type PackageItem,
} from '../lib/price-table.ts';

test('the official rules become the printed price list', () => {
  const { rows, group } = buildPriceTable(officialPriceRules(), 'standard');
  assert.deepEqual(
    rows.map((r) => [r.days, r.from, r.to, r.gold, r.gdr, r.h9, r.h18]),
    [
      ['Thứ 2 – Thứ 6', '08:00', '11:00', true, 100_000, 300_000, 400_000],
      ['Thứ 2 – Thứ 6', '11:00', '23:00', false, 250_000, 500_000, 650_000],
      ['Thứ 7, Chủ nhật & ngày lễ', '08:00', '23:00', false, 250_000, 500_000, 650_000],
    ],
  );
  assert.deepEqual(group, { h9: 900_000, h18: 1_000_000 });
});

test('a price edited in the admin shows up in the table', () => {
  const rules = officialPriceRules().map((r) =>
    r.room === 'standard' && r.service === '18' && r.people === 1 && r.label === 'Giờ vàng T2–T6'
      ? { ...r, amount: 420_000 }
      : r,
  );
  assert.equal(buildPriceTable(rules, 'standard').rows[0].h18, 420_000);
  // disabled rules are not published
  const off = officialPriceRules().map((r) =>
    r.service === 'gdr' && r.label === 'Giờ vàng T2–T6' ? { ...r, enabled: false } : r,
  );
  assert.equal(buildPriceTable(off, 'standard').rows[0].gdr, null);
});

test('VIP shares the list until it gets its own prices', () => {
  assert.equal(vipDiffers(officialPriceRules()), false);
  const own = officialPriceRules().map((r) =>
    r.room === 'vip' && r.service === 'gdr' ? { ...r, amount: r.amount + 50_000 } : r,
  );
  assert.equal(vipDiffers(own), true);
});

test('weekend and holiday stay separate lines when their prices differ', () => {
  const rules = officialPriceRules().map((r) =>
    r.room === 'standard' && r.day === 'holiday' && r.service === 'gdr'
      ? { ...r, amount: 300_000 }
      : r,
  );
  const days = buildPriceTable(rules, 'standard').rows.map((r) => r.days);
  assert.deepEqual(days, ['Thứ 2 – Thứ 6', 'Thứ 2 – Thứ 6', 'Thứ 7, Chủ nhật', 'Ngày lễ']);
});

const items: PackageItem[] = OFFICIAL_PACKAGES.map((p, i) => ({
  id: String(i),
  name: p.name,
  price: p.price,
  grants: p.grants,
  validDays: p.validDays,
  perks: p.perks,
}));

test('packages are grouped by what they give and VIP cards stay together', () => {
  const groups = groupPackages(items);
  assert.deepEqual(
    groups.map((g) => [g.id, g.items.length]),
    [
      ['h9', 2],
      ['h18', 2],
      ['gdr', 7],
      ['vip', 2],
    ],
  );
  assert.ok(groups.at(-1)!.vip);
  assert.ok(groups[2].items.every((p, i, a) => i === 0 || a[i - 1].price <= p.price));
});

test('a package created in the admin lands in a sensible section', () => {
  const extra: PackageItem = {
    id: 'x',
    name: 'Gói thử',
    price: 1_000_000,
    grants: [
      { kind: 'holes9', qty: 3 },
      { kind: 'holes18', qty: 1 },
    ],
    validDays: 45,
    perks: '',
  };
  assert.equal(groupPackages([extra])[0].id, 'other');
  assert.deepEqual(packageBullets(extra), ['3 Lượt 9 hố', '1 Lượt 18 hố', 'Hiệu lực 45 ngày']);
});

test('package bullets list contents, validity and perks', () => {
  const platinum = items.find((p) => p.name.includes('Platinum'))!;
  const bullets = packageBullets(platinum);
  assert.equal(bullets[0], '10 Lượt 18 hố');
  assert.ok(bullets.includes('Hiệu lực 6 tháng'));
  assert.ok(bullets.includes('Phòng chờ VIP'));
});
