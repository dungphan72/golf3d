import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, PERMISSIONS, can, canAssignRole, isRole } from '../lib/auth/permissions.ts';
import {
  hashPassword,
  verifyPassword,
  passwordProblem,
  normalizeEmail,
  validEmail,
  newToken,
  tokenId,
  temporaryPassword,
} from '../lib/auth/password.ts';

test('owner has every permission; manager lacks only data export and HLV-own', () => {
  for (const p of PERMISSIONS) assert.ok(can('owner', p));
  assert.deepEqual(
    PERMISSIONS.filter((p) => !can('manager', p)),
    ['coach.own', 'data.export', 'legacy.approve', 'tournament.approve'], // coach.own is only for HLV accounts; only the owner approves old bills
  );
});
test('cashier handles money and sessions but cannot change settings or staff', () => {
  for (const p of [
    'finance.operate',
    'finance.shift',
    'session.operate',
    'booking.create',
  ] as const)
    assert.ok(can('cashier', p));
  for (const p of [
    'settings.manage',
    'staff.manage',
    'menu.manage',
    'stock.manage',
    'data.export',
  ] as const)
    assert.ok(!can('cashier', p));
});
test('coach, cskh and sale cannot touch finance', () => {
  for (const role of ['coach', 'cskh', 'sale'] as const)
    for (const p of [
      'finance.view',
      'finance.operate',
      'finance.shift',
      'settings.manage',
    ] as const)
      assert.ok(!can(role, p), `${role} ${p}`);
});
test('every role can at least view', () => {
  for (const role of ROLES) assert.ok(can(role, 'view'));
});
test('managers cannot assign owner; staff roles cannot assign anyone', () => {
  assert.ok(canAssignRole('owner', 'owner'));
  assert.ok(canAssignRole('manager', 'cashier'));
  assert.ok(!canAssignRole('manager', 'owner'));
  assert.ok(!canAssignRole('manager', 'manager')); // no lateral takeover of another manager
  assert.ok(!canAssignRole('cashier', 'sale'));
});
test('isRole rejects unknown values', () => {
  assert.ok(isRole('sale'));
  assert.ok(!isRole('admin'));
  assert.ok(!isRole(undefined));
});
test('password hash verifies, is salted, and rejects wrong passwords', async () => {
  const a = await hashPassword('Mật khẩu 123');
  const b = await hashPassword('Mật khẩu 123');
  assert.notEqual(a, b);
  assert.ok(await verifyPassword('Mật khẩu 123', a));
  assert.ok(!(await verifyPassword('mật khẩu 123', a)));
  assert.ok(!(await verifyPassword('x', 'garbage')));
  assert.ok(!(await verifyPassword('x', 'pbkdf2$0$AA$AA')));
});
test('password policy', () => {
  assert.ok(passwordProblem('short'));
  assert.ok(passwordProblem('aaaaaaaaaa'));
  assert.ok(passwordProblem('Me@Example.com', 'me@example.com'));
  assert.equal(passwordProblem('golf-3d-2026', 'me@example.com'), null);
});
test('email normalisation and validation', () => {
  assert.equal(normalizeEmail('  Me@Example.COM '), 'me@example.com');
  assert.ok(validEmail('me@example.com'));
  assert.ok(!validEmail('me@'));
  assert.ok(!validEmail('a b@c.d'));
});
test('session tokens are unique and hashed deterministically', async () => {
  const t1 = newToken(),
    t2 = newToken();
  assert.notEqual(t1, t2);
  assert.ok(t1.length >= 43);
  assert.equal(await tokenId(t1), await tokenId(t1));
  assert.notEqual(await tokenId(t1), t1);
  assert.equal(temporaryPassword().length, 12);
});

test('common and name-based passwords are rejected', () => {
  for (const bad of [
    '12345678',
    'password123',
    'Password123',
    'owner1234',
    'aaaaaaaa',
    'qwertyuiop',
  ])
    assert.ok(passwordProblem(bad, 'owner@example.com'), bad);
  assert.equal(passwordProblem('Sân-golf-3D-xanh-2026', 'owner@example.com'), null);
  assert.equal(passwordProblem('e2e-owner-password', 'owner@e2e.test'), null);
});
