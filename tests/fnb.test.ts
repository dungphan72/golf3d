import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fnbInput, lineQuote, orderQuote, orderFingerprint } from '../lib/fnb.ts';
const key = 'request-key-123456789';
test('food line separates base, service fee and VAT without double taxing', () => {
  assert.deepEqual(lineQuote(50000, 2, 500, 1000), {
    subtotal: 100000,
    fee: 5000,
    vat: 10500,
    total: 115500,
  });
});
test('line arithmetic rounds integer VND consistently', () =>
  assert.deepEqual(lineQuote(10001, 3, 250, 800), {
    subtotal: 30003,
    fee: 750,
    vat: 2460,
    total: 33213,
  }));
test('order totals add already-rounded line components', () => {
  const q = orderQuote([
    { price: 50000, qty: 2, feeBps: 500, vatBps: 1000 },
    { price: 20000, qty: 1, feeBps: 0, vatBps: 0 },
  ]);
  assert.equal(q.total, 135500);
  assert.equal(q.subtotal + q.fee + q.vat, q.total);
});
test('client cannot post item prices or select another tenant', () => {
  assert.equal(
    fnbInput.safeParse({
      action: 'order',
      requestId: key,
      bookingId: 'b',
      note: '',
      lines: [{ itemId: 'p', qty: 1, expectedVersion: 0, price: 1 }],
    }).success,
    false,
  );
  assert.equal(
    fnbInput.safeParse({
      action: 'order',
      requestId: key,
      bookingId: 'b',
      tenant: 'other',
      note: '',
      lines: [{ itemId: 'p', qty: 1, expectedVersion: 0 }],
    }).success,
    false,
  );
});
test('duplicate products and empty orders are rejected', () => {
  const line = { itemId: 'p', qty: 1, expectedVersion: 0 };
  assert.equal(
    fnbInput.safeParse({
      action: 'order',
      requestId: key,
      bookingId: 'b',
      note: '',
      lines: [line, line],
    }).success,
    false,
  );
  assert.equal(
    fnbInput.safeParse({ action: 'order', requestId: key, bookingId: 'b', note: '', lines: [] })
      .success,
    false,
  );
});
test('retry fingerprint ignores cart ordering but detects changed quantities', () => {
  const a = {
    bookingId: 'b',
    note: 'Ít đá',
    lines: [
      { itemId: 'p2', qty: 2, expectedVersion: 1 },
      { itemId: 'p1', qty: 1, expectedVersion: 0 },
    ],
  };
  assert.equal(orderFingerprint(a), orderFingerprint({ ...a, lines: [...a.lines].reverse() }));
  assert.notEqual(
    orderFingerprint(a),
    orderFingerprint({ ...a, lines: [{ itemId: 'p1', qty: 3, expectedVersion: 0 }] }),
  );
});
