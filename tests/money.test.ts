import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../lib/club.ts';
import { isWalletLow, WALLET_LOW_BALANCE_THRESHOLD } from '../lib/wallet.ts';

test('money never prints "-0" and keeps real negatives', () => {
  assert.equal(money(-0).startsWith('-'), false);
  assert.equal(money(0), money(-0));
  assert.equal(money(Number.NaN), money(0));
  assert.ok(money(-1500).startsWith('-1.500'));
  assert.ok(money(1500000).startsWith('1.500.000'));
});

test('wallet low balance warning threshold <= 200.000đ', () => {
  assert.equal(WALLET_LOW_BALANCE_THRESHOLD, 200_000);
  assert.equal(isWalletLow(200_000), true);
  assert.equal(isWalletLow(150_000), true);
  assert.equal(isWalletLow(0), true);
  assert.equal(isWalletLow(200_001), false);
  assert.equal(isWalletLow(500_000), false);
});
