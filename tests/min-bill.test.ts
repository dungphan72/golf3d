import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, quote, sessionQuote, padToMinimum, minChargeOffer, type Config } from '../lib/club.ts';
import { seedPriceRules } from '../lib/pricing.ts';

const at = (s: string) => Date.parse(s + '+07:00');
const base: Config = {
  ...defaults,
  open: '08:00',
  close: '23:00',
  capacity: 4,
  vipCapacity: 4,
  vat: 10,
  fee: 5,
  priceRules: seedPriceRules(defaults, true),
  holidays: [],
  pricingRevision: 'revision-1',
};
const start = at('2026-11-02T14:00:00');
const MIN = 60_000;

test('padToMinimum: chỉ bù phần thiếu vào cuối đoạn cuối', () => {
  const r = padToMinimum([{ start, end: start + 10 * MIN }], 60);
  assert.deepEqual(r.segments, [{ start, end: start + 60 * MIN }]);
  assert.equal(r.added, 50 * MIN);
  const two = padToMinimum([{ start, end: start + 10 * MIN }, { start: start + 20 * MIN, end: start + 30 * MIN }], 60);
  assert.equal(two.segments[0].end, start + 10 * MIN);
  assert.equal(two.segments[1].end, start + 30 * MIN + 40 * MIN);
});

test('padToMinimum: đủ giờ, tắt (0), hoặc chưa chơi thì không đổi', () => {
  const full = [{ start, end: start + 61 * MIN }];
  assert.equal(padToMinimum(full, 60).segments, full);
  const short = [{ start, end: start + 5 * MIN }];
  assert.equal(padToMinimum(short, 0).segments, short);
  assert.equal(padToMinimum([], 60).added, 0);
  const none = [{ start, end: start }];
  assert.equal(padToMinimum(none, 60).added, 0);
});

test('chơi 10 phút tính thành 1 giờ khi cài tối thiểu 60 phút', () => {
  const c = { ...base, minBillMinutes: 60 };
  const short = sessionQuote('gdr', [{ start, end: start + 10 * MIN }], { config: c, base: 0 });
  const hour = quote([{ start, end: start + 60 * MIN }], c, false);
  assert.equal(short.total, hour.total);
  assert.match(short.lines.at(-1)!.label, /tối thiểu 60 phút/);
});

test('không cài (hoặc 0) thì tính đúng số phút đã chơi', () => {
  const segs = [{ start, end: start + 10 * MIN }];
  const exact = quote(segs, base, false);
  assert.deepEqual(sessionQuote('gdr', segs, { config: base, base: 0 }), exact);
  assert.deepEqual(sessionQuote('gdr', segs, { config: { ...base, minBillMinutes: 0 }, base: 0 }), exact);
});

test('chơi quá 1 giờ thì giữ nguyên, không cộng thêm', () => {
  const c = { ...base, minBillMinutes: 60 };
  const segs = [{ start, end: start + 75 * MIN }];
  assert.deepEqual(sessionQuote('gdr', segs, { config: c, base: 0 }), quote(segs, c, false));
});

test('cài 30 phút: chơi 10 phút tính 30 phút', () => {
  const c = { ...base, minBillMinutes: 30 };
  const t = sessionQuote('gdr', [{ start, end: start + 10 * MIN }], { config: c, base: 0 }).total;
  assert.equal(t, quote([{ start, end: start + 30 * MIN }], c, false).total);
});

test('thanh toán tối thiểu 60 phút: hệ thống hỏi khi chơi dưới 60 phút và cho phép chọn thực tế', () => {
  const c = { ...base, minBillMinutes: 60 };
  const segs = [{ start, end: start + 25 * MIN }];
  const price = (extra: object = {}) => JSON.stringify({ config: c, base: 0, ...extra });
  const actualBill = quote(segs, c, false);
  const minBill = quote([{ start, end: start + 60 * MIN }], c, false);

  // 1. Chơi 25 phút: hệ thống phát hiện và đề nghị 2 mức (thực tế vs tối thiểu 60 phút)
  const offer = minChargeOffer({
    status: 'finished',
    service: 'gdr',
    price: price(),
    golf_amount: actualBill.total,
    segments: JSON.stringify(segs),
  });
  assert.ok(offer != null);
  assert.equal(offer.golf, actualBill.total);
  assert.equal(offer.to, minBill.total);
  assert.equal(offer.playedMinutes, 25);
  assert.equal(offer.minMinutes, 60);

  // 2. Chơi 75 phút (quá 60 phút): không hỏi, trả về null
  const longOffer = minChargeOffer({
    status: 'finished',
    service: 'gdr',
    price: price(),
    golf_amount: quote([{ start, end: start + 75 * MIN }], c, false).total,
    segments: JSON.stringify([{ start, end: start + 75 * MIN }]),
  });
  assert.equal(longOffer, null);

  // 3. Khách chọn thanh toán thực tế: keepActual = true, sessionQuote trả về đúng tiền thực tế
  const actualQuote = sessionQuote('gdr', segs, { config: c, base: 0, keepActual: true });
  assert.equal(actualQuote.total, actualBill.total);
  const afterKeepActual = minChargeOffer({
    status: 'finished',
    service: 'gdr',
    price: price({ keepActual: true }),
    golf_amount: actualBill.total,
    segments: JSON.stringify(segs),
  });
  assert.equal(afterKeepActual, null);

  // 4. Khách chọn thanh toán tối thiểu: minCharge được ghi lại, sessionQuote hiển thị dòng làm tròn
  const raisedQuote = sessionQuote('gdr', segs, {
    config: c,
    base: 0,
    minCharge: { from: actualBill.total, to: minBill.total, minMinutes: 60, at: start, actor: 'staff' },
  });
  assert.equal(raisedQuote.total, minBill.total);
  const afterRoundMin = minChargeOffer({
    status: 'finished',
    service: 'gdr',
    price: price({ minCharge: { from: actualBill.total, to: minBill.total, at: start, actor: 'staff' } }),
    golf_amount: minBill.total,
    segments: JSON.stringify(segs),
  });
  assert.equal(afterRoundMin, null);
});
