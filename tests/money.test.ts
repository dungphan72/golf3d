import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../lib/club.ts';

test('money never prints "-0" and keeps real negatives', () => {
  assert.equal(money(-0).startsWith('-'), false);
  assert.equal(money(0), money(-0));
  assert.equal(money(Number.NaN), money(0));
  assert.ok(money(-1500).startsWith('-1.500'));
  assert.ok(money(1500000).startsWith('1.500.000'));
});
