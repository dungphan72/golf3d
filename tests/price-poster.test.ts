import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPoster, buildPackageCards } from '../lib/price-poster.ts';
import { officialPriceRules } from '../lib/official-pricing.ts';
import { OFFICIAL_PACKAGES } from '../lib/official-packages.ts';
import { groupPackages, type PackageItem } from '../lib/price-table.ts';

const row = (rows: ReturnType<typeof buildPoster>[number]['blocks'][number]['rows'], label: string) =>
  rows.find((r) => r.label === label)!;

test('bảng giá chính thức dựng đúng poster: thứ 2–6 hai khung, thứ 7–CN–lễ một khung', () => {
  const cards = buildPoster(officialPriceRules());
  assert.deepEqual(cards.map((c) => c.title), ['THỨ HAI – THỨ SÁU', 'THỨ 7 – CN – LỄ']);
  const [weekday, weekend] = cards;
  assert.deepEqual(weekday.blocks.map((b) => b.title), ['GIỜ VÀNG • 06:00 – 11:00', '11:00 – 23:00']);
  const gold = weekday.blocks[0].rows;
  assert.deepEqual([row(gold, 'Tiêu chuẩn').gdr, row(gold, 'Tiêu chuẩn').h9, row(gold, 'Tiêu chuẩn').h18], [100000, 250000, 350000]);
  assert.deepEqual([row(gold, 'VIP').gdr, row(gold, 'VIP').h9, row(gold, 'VIP').h18], [150000, 350000, 450000]);
  const normal = weekday.blocks[1].rows;
  assert.deepEqual([row(normal, 'Tiêu chuẩn').gdr, row(normal, 'Tiêu chuẩn').h9, row(normal, 'Tiêu chuẩn').h18], [150000, 300000, 400000]);
  assert.deepEqual([row(normal, 'VIP').gdr, row(normal, 'VIP').h9, row(normal, 'VIP').h18], [200000, 400000, 500000]);
  assert.equal(weekend.blocks.length, 1);
  assert.equal(weekend.blocks[0].title, null);
  const we = weekend.blocks[0].rows;
  assert.deepEqual([row(we, 'Tiêu chuẩn').gdr, row(we, 'Tiêu chuẩn').h9, row(we, 'Tiêu chuẩn').h18], [200000, 350000, 450000]);
  assert.deepEqual([row(we, 'VIP').gdr, row(we, 'VIP').h9, row(we, 'VIP').h18], [250000, 450000, 550000]);
});

test('đổi giá trong cài đặt thì trang đổi theo; ngày lễ khác giá thì tách thẻ riêng', () => {
  const rules = officialPriceRules().map((r) =>
    r.day === 'holiday' && r.room === 'standard' && r.service === '9' ? { ...r, amount: 999000 } : r,
  );
  const cards = buildPoster(rules);
  assert.deepEqual(cards.map((c) => c.title), ['THỨ HAI – THỨ SÁU', 'THỨ 7 – CN', 'NGÀY LỄ']);
  assert.equal(row(cards[2].blocks[0].rows, 'Tiêu chuẩn').h9, 999000);
  assert.equal(row(cards[1].blocks[0].rows, 'Tiêu chuẩn').h9, 350000);
});

test('khung đã tắt không hiện; thêm khung giờ mới thì hiện thêm một khối', () => {
  const base = officialPriceRules();
  const off = base.map((r) => (r.day === 'weekday' && r.from === '06:00' ? { ...r, enabled: false } : r));
  assert.deepEqual(buildPoster(off)[0].blocks.length, 1);
  const extra = [
    ...base,
    { ...base.find((r) => r.service === 'gdr' && r.room === 'standard' && r.day === 'weekday' && r.from === '11:00')!, id: 'late', from: '23:00', to: '24:00', label: 'Đêm', amount: 80000 },
  ];
  // The 11:00–23:00 rule keeps its block; the new 23:00–24:00 window becomes a third block.
  assert.equal(buildPoster(extra)[0].blocks.length, 3);
});

test('thẻ tháng chính thức: tiêu đề chung một lần, tên gọn, giá theo danh mục', () => {
  const items: PackageItem[] = OFFICIAL_PACKAGES.map((p) => ({
    id: p.key,
    name: p.name,
    price: p.price,
    grants: p.grants,
    validDays: p.validDays,
    perks: p.perks,
    section: p.section,
  }));
  const cards = buildPackageCards(groupPackages(items));
  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, 'Thẻ tháng');
  assert.equal(cards[0].subtitle, 'Không giới hạn giờ chơi');
  assert.equal(cards[0].footnote, 'Thời hạn tính từ ngày kích hoạt thẻ.');
  assert.deepEqual(cards[0].items.map((i) => [i.name, i.price]), [
    ['1 tháng', 5000000],
    ['3 tháng', 14000000],
    ['6 tháng', 25000000],
  ]);
  assert.ok(cards[0].items.every((i) => i.lines.length === 0));
});
