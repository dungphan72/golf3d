import test from 'node:test';
import assert from 'node:assert/strict';
import { billingInput, discountFromPercent, changeDue } from '../lib/billing.ts';
import { reconciliation } from '../lib/finance.ts';
import { can } from '../lib/auth/permissions.ts';

const key = 'a'.repeat(20);

test('discount and refund input need a reason and positive whole amounts', () => {
  const ok = billingInput.safeParse({
    action: 'discount',
    bookingId: 'b1',
    amount: 50_000,
    reason: 'Khách quen',
  });
  assert.ok(ok.success);
  for (const bad of [
    { action: 'discount', bookingId: 'b1', amount: 0, reason: 'Khách quen' },
    { action: 'discount', bookingId: 'b1', amount: 1000.5, reason: 'Khách quen' },
    { action: 'discount', bookingId: 'b1', amount: 5000, reason: 'ab' },
    {
      action: 'refund',
      requestId: 'short',
      bookingId: 'b1',
      method: 'cash',
      amount: 5000,
      reason: 'Hoàn',
    },
    {
      action: 'refund',
      requestId: key,
      bookingId: 'b1',
      method: 'bitcoin',
      amount: 5000,
      reason: 'Hoàn tiền',
    },
    {
      action: 'refund',
      requestId: key,
      bookingId: 'b1',
      method: 'cash',
      amount: 5000,
      reason: 'Hoàn tiền',
      extra: 1,
    },
  ])
    assert.ok(!billingInput.safeParse(bad).success, JSON.stringify(bad));
  assert.ok(
    billingInput.safeParse({
      action: 'refund',
      requestId: key,
      bookingId: 'b1',
      method: 'card',
      amount: 5000,
      reason: 'Thu nhầm',
    }).success,
  );
});

test('percentage discount rounds to 1.000đ and never takes the whole bill', () => {
  assert.equal(discountFromPercent(650_000, 10), 65_000);
  assert.equal(discountFromPercent(333_333, 10), 33_000);
  assert.equal(discountFromPercent(1_000, 100), 999);
});

test('change due is what the customer hands over above the bill', () => {
  assert.equal(changeDue(500_000, 435_000), 65_000);
  assert.equal(changeDue(100_000, 100_000), 0);
  assert.equal(changeDue(50_000, 100_000), 0);
});

test('refunds reduce the expected cash, transfer and card of the shift', () => {
  const r = reconciliation(
    {
      openingCash: 500_000,
      cashReceived: 800_000,
      transferReceived: 600_000,
      cardReceived: 400_000,
      cashIn: 0,
      cashOut: 0,
      cashRefund: 100_000,
      transferRefund: 50_000,
      cardRefund: 0,
    },
    { cash: 1_200_000, transfer: 550_000, card: 400_000 },
  );
  assert.equal(r.expectedCash, 1_200_000);
  assert.equal(r.expectedTransfer, 550_000);
  assert.equal(r.cashDifference, 0);
  assert.equal(r.transferDifference, 0);
  assert.equal(r.receipts, 1_650_000);
});

test('only owners and managers may discount or refund', () => {
  for (const p of ['billing.discount', 'billing.refund'] as const) {
    assert.ok(can('owner', p) && can('manager', p));
    for (const role of ['cashier', 'coach', 'cskh', 'sale'] as const)
      assert.ok(!can(role, p), `${role} ${p}`);
  }
});
