import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone,
  validPhone,
  kindForService,
  memberInput,
  UNLIMITED,
} from '../lib/member.ts';
import { OFFICIAL_PACKAGES } from '../lib/official-packages.ts';

test('phone normalisation matches the SQL rules', () => {
  assert.equal(normalizePhone('+84 912-345-678'), '0912345678');
  assert.equal(normalizePhone('84912345678'), '0912345678');
  assert.equal(normalizePhone('(0912) 345.678'), '0912345678');
  assert.equal(normalizePhone('0912345678'), '0912345678');
  assert.ok(validPhone('0912345678'));
  assert.ok(!validPhone('912345678'));
  assert.ok(!validPhone('abc'));
});
test('service maps to the package kind it consumes', () => {
  assert.equal(kindForService('9'), 'holes9');
  assert.equal(kindForService('18'), 'holes18');
  assert.equal(kindForService('gdr'), 'gdr');
  assert.equal(kindForService('x'), null);
});
test('official packages match the price list', () => {
  const byKey = Object.fromEntries(OFFICIAL_PACKAGES.map((p) => [p.key, p]));
  assert.equal(byKey['h18-10'].price, 5_000_000);
  assert.deepEqual(byKey['h18-10'].grants, [{ kind: 'holes18', qty: 11 }]);
  assert.deepEqual(byKey['h9-20'].grants, [{ kind: 'holes9', qty: 25 }]);
  assert.equal(byKey['gdr-6m'].price, 9_450_000);
  assert.equal(byKey['gdr-12m'].price, 17_500_000);
  assert.equal(byKey['vip-platinum'].price, 20_000_000);
  assert.equal(byKey['vip-diamond'].price, 50_000_000);
  assert.equal(byKey['gdr-1m'].grants[0].qty, UNLIMITED);
  for (const p of OFFICIAL_PACKAGES) assert.ok(p.price > 0 && p.validDays > 0 && p.grants.length);
});
test('member input rejects unknown fields and bad values', () => {
  const key = 'abcdefghijklmnop1234';
  assert.ok(
    memberInput.safeParse({
      action: 'sell',
      requestId: key,
      customerId: 'c',
      typeId: 't',
      method: 'cash',
    }).success,
  );
  assert.ok(
    !memberInput.safeParse({
      action: 'sell',
      requestId: key,
      customerId: 'c',
      typeId: 't',
      method: 'bitcoin',
    }).success,
  );
  assert.ok(
    !memberInput.safeParse({
      action: 'sell',
      requestId: key,
      customerId: 'c',
      typeId: 't',
      method: 'cash',
      price: 1,
    }).success,
  );
  assert.ok(
    !memberInput.safeParse({
      action: 'adjust',
      requestId: key,
      packageId: 'p',
      kind: 'gdr',
      delta: 0,
      note: 'lý do',
    }).success,
  );
});
