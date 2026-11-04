import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, quote, wholeQuote } from '../lib/club.ts';
const c = { ...defaults, vat: 0, fee: 0 };
const ms = (s: string) => Date.parse(s + '+07:00');
test('splits 10:30–11:30 across Happy Hour boundary', () => {
  const q = quote([{ start: ms('2026-11-02T10:30:00'), end: ms('2026-11-02T11:30:00') }], c);
  assert.equal(q.total, 175000);
  assert.equal(q.lines.length, 2);
});
test('70 minutes charged without rounding to 75 or 90', () => {
  const q = quote([{ start: ms('2026-11-02T12:00:00'), end: ms('2026-11-02T13:10:00') }], c);
  assert.equal(q.total, 291667);
});
test('weekend morning uses standard rate', () =>
  assert.equal(
    quote([{ start: ms('2026-11-07T08:00:00'), end: ms('2026-11-07T09:00:00') }], c).total,
    250000,
  ));
test('paused intervals excluded', () =>
  assert.equal(
    quote(
      [
        { start: ms('2026-11-02T12:00:00'), end: ms('2026-11-02T12:30:00') },
        { start: ms('2026-11-02T13:00:00'), end: ms('2026-11-02T13:30:00') },
      ],
      c,
    ).total,
    250000,
  ));
test('tax and fee applied once, rounded to VND', () =>
  assert.deepEqual(wholeQuote(100000, { ...c, fee: 5, vat: 10 }), {
    lines: [],
    subtotal: 100000,
    fee: 5000,
    vat: 10500,
    total: 115500,
  }));
test('VIP has independent rates', () =>
  assert.equal(
    quote(
      [{ start: ms('2026-11-02T12:00:00'), end: ms('2026-11-02T13:00:00') }],
      { ...c, vipRate: 400000 },
      true,
    ).total,
    400000,
  ));
test('unset VIP rates fail closed', () =>
  assert.throws(() => quote([{ start: 0, end: 60000 }], c, true), /Chưa cấu hình/));
test('invalid reversed intervals rejected', () =>
  assert.throws(() => quote([{ start: 60000, end: 0 }], c), /không hợp lệ/));
