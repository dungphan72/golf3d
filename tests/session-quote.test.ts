import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, quote, sessionQuote, packageLine, type Config, type PriorPart } from '../lib/club.ts';
import { packagePrice, seedPriceRules } from '../lib/pricing.ts';

const at = (s: string) => Date.parse(s + '+07:00');
const c: Config = {
  ...defaults,
  open: '08:00',
  close: '23:00',
  capacity: 4,
  vipCapacity: 4,
  vat: 10,
  fee: 5,
  priceRules: seedPriceRules(defaults, true),
  holidays: [],
  holeMinutes9: [60, 90, 120, 150],
  holeMinutes18: [120, 150, 180, 240],
  pricingRevision: 'revision-1',
};
const start = at('2026-11-02T14:00:00');
const switchAt = start + 40 * 60_000;

test('chưa đổi hình thức: giữ nguyên cách tính cũ', () => {
  const segs = [{ start, end: start + 60 * 60_000 }];
  const a = sessionQuote('gdr', segs, { config: c, base: 0 });
  assert.deepEqual(a, quote(segs, c, false));
});

test('tập rồi chuyển sang chơi game: tiền tập + tiền game cộng dồn, ghi rõ từng phần', () => {
  const segs = [{ start, end: start + 90 * 60_000 }];
  const practice = quote([{ start, end: switchAt }], c, false);
  const game = packagePrice(switchAt, c, '9', false, 1);
  const prior: PriorPart[] = [
    {
      service: 'gdr',
      subtotal: practice.subtotal,
      lines: practice.lines.map((l) => ({ ...l, label: `Tập theo giờ · ${l.label}` })),
    },
  ];
  const bill = sessionQuote('9', segs, {
    config: c,
    vip: false,
    base: game.base,
    promo: game.promo,
    prior,
    phaseFrom: switchAt,
  });
  assert.equal(bill.subtotal, practice.subtotal + game.base);
  assert.deepEqual(
    bill.parts?.map((p) => [p.service, p.subtotal]),
    [
      ['gdr', practice.subtotal],
      ['9', game.base],
    ],
  );
  assert.ok(bill.lines.some((l) => l.label.startsWith('Tập theo giờ')));
  assert.ok(bill.lines.some((l) => l.package && l.label.startsWith('Chơi game 9 hố')));
  assert.equal(bill.total, bill.subtotal + bill.fee + bill.vat);
});

test('chơi game rồi quay lại tập: chỉ tính thời gian tập sau lúc đổi', () => {
  const game = packagePrice(start, c, '9', false, 1);
  const segs = [{ start, end: start + 120 * 60_000 }];
  const back = start + 60 * 60_000;
  const prior: PriorPart[] = [
    { service: '9', subtotal: game.base, lines: [packageLine('9', game.base, game.promo)] },
  ];
  const bill = sessionQuote('gdr', segs, { config: c, base: 0, prior, phaseFrom: back });
  const after = quote([{ start: back, end: segs[0].end }], c, false);
  assert.equal(bill.subtotal, game.base + after.subtotal);
  assert.equal(bill.parts?.length, 2);
});
