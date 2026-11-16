import test from 'node:test';
import assert from 'node:assert/strict';
import { loginIdentifier } from '../lib/auth/identifier.ts';

test('email is lower-cased and trimmed', () => {
  assert.deepEqual(loginIdentifier('  An@Golf.VN '), { kind: 'email', value: 'an@golf.vn' });
});
test('phone numbers are normalised to the stored form', () => {
  for (const p of ['0912 345 678', '0912.345.678', '+84912345678', '84912345678', '(0912) 345-678'])
    assert.deepEqual(loginIdentifier(p), { kind: 'phone', value: '0912345678' }, p);
});
test('anything else is rejected', () => {
  for (const p of ['', '   ', 'abc', '12345', '091234'])
    assert.equal(loginIdentifier(p), null, p);
});
