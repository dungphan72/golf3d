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
  assert.ok(
    memberInput.safeParse({
      action: 'type-delete',
      id: 'pkg-type-1',
    }).success,
  );
  assert.ok(
    !memberInput.safeParse({
      action: 'type-delete',
      id: '',
    }).success,
  );
});
test('service maps to the package kind it consumes', () => {
  assert.equal(kindForService('9'), 'holes9');
  assert.equal(kindForService('18'), 'holes18');
  assert.equal(kindForService('gdr'), 'gdr');
  assert.equal(kindForService('x'), null);
  assert.ok(
    memberInput.safeParse({
      action: 'type-delete',
      id: 'pkg-type-1',
    }).success,
  );
  assert.ok(
    !memberInput.safeParse({
      action: 'type-delete',
      id: '',
    }).success,
  );
});
test('official packages match the price list', () => {
  const byKey = Object.fromEntries(OFFICIAL_PACKAGES.map((p) => [p.key, p]));
  assert.equal(OFFICIAL_PACKAGES.length, 3);
  assert.equal(byKey['month-1'].price, 5_000_000);
  assert.equal(byKey['month-3'].price, 14_000_000);
  assert.equal(byKey['month-6'].price, 25_000_000);
  assert.equal(byKey['month-1'].validDays, 30);
  assert.equal(byKey['month-6'].grants[0].qty, UNLIMITED);
  for (const p of OFFICIAL_PACKAGES) assert.ok(p.price > 0 && p.validDays > 0 && p.grants.length);
  assert.ok(
    memberInput.safeParse({
      action: 'type-delete',
      id: 'pkg-type-1',
    }).success,
  );
  assert.ok(
    !memberInput.safeParse({
      action: 'type-delete',
      id: '',
    }).success,
  );
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
  assert.ok(
    memberInput.safeParse({
      action: 'type-delete',
      id: 'pkg-type-1',
    }).success,
  );
  assert.ok(
    !memberInput.safeParse({
      action: 'type-delete',
      id: '',
    }).success,
  );
});
