import test from 'node:test';
import assert from 'node:assert/strict';
import {
  publicRequestInput,
  staffRequestInput,
  codeLooksValid,
  SLUG_PATTERN,
} from '../lib/online.ts';

const valid = {
  name: 'Trần Thị B',
  phone: '0933444555',
  service: '18',
  people: 2,
  start: 1_800_000_000_000,
};

test('public request accepts a normal request and fills defaults', () => {
  const parsed = publicRequestInput.parse(valid);
  assert.equal(parsed.vip, false);
  assert.equal(parsed.minutes, 0);
  assert.equal(parsed.note, '');
});
test('honeypot, unknown fields and bad values are rejected', () => {
  assert.ok(!publicRequestInput.safeParse({ ...valid, website: 'http://spam' }).success);
  assert.ok(!publicRequestInput.safeParse({ ...valid, tenant: 'other' }).success);
  assert.ok(!publicRequestInput.safeParse({ ...valid, service: 'vip' }).success);
  assert.ok(!publicRequestInput.safeParse({ ...valid, people: 9 }).success);
  assert.ok(publicRequestInput.safeParse({ ...valid, people: undefined, guests: 30 }).success);
  assert.ok(!publicRequestInput.safeParse({ ...valid, guests: -1 }).success);
  assert.ok(!publicRequestInput.safeParse({ ...valid, name: 'A' }).success);
  assert.ok(!publicRequestInput.safeParse({ ...valid, start: 1.5 }).success);
});
test('staff actions require a reason to reject and no extra fields', () => {
  assert.ok(staffRequestInput.safeParse({ action: 'confirm', id: 'r1', room: 'line-2' }).success);
  assert.ok(!staffRequestInput.safeParse({ action: 'reject', id: 'r1', reason: 'x' }).success);
  assert.ok(staffRequestInput.safeParse({ action: 'reject', id: 'r1', reason: 'Hết chỗ' }).success);
  assert.ok(
    !staffRequestInput.safeParse({ action: 'confirm', id: 'r1', room: 'a', tenant: 't' }).success,
  );
});
test('slug and status code formats', () => {
  assert.ok(SLUG_PATTERN.test('golf3d-binhtrung'));
  assert.ok(!SLUG_PATTERN.test('ab'));
  assert.ok(!SLUG_PATTERN.test('-bad'));
  assert.ok(!SLUG_PATTERN.test('Has Upper'));
  assert.ok(codeLooksValid('a'.repeat(43)));
  assert.ok(!codeLooksValid('short'));
  assert.ok(!codeLooksValid('a'.repeat(43) + '!'));
});
