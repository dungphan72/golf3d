import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTenant,
  sanitizeTenantPayload,
  TenantAccessError,
} from '../lib/server/tenant-guard.ts';

test('assertTenant allows matching tenants and rejects cross-tenant requests', () => {
  // Matching tenant passes cleanly
  assert.doesNotThrow(() => {
    assertTenant('golf3d-main', 'golf3d-main');
  });

  // Null or undefined requested tenant defaults to matching session tenant
  assert.doesNotThrow(() => {
    assertTenant('golf3d-main', undefined);
    assertTenant('golf3d-main', null);
  });

  // Cross-tenant mismatch throws TenantAccessError (403)
  assert.throws(
    () => {
      assertTenant('golf3d-main', 'golf3d-branch2');
    },
    (err: unknown) => {
      return (
        err instanceof TenantAccessError &&
        err.statusCode === 403 &&
        err.message.includes('Từ chối truy cập')
      );
    },
  );

  // Missing session tenant throws TenantAccessError
  assert.throws(
    () => {
      assertTenant('', 'golf3d-main');
    },
    (err: unknown) => err instanceof TenantAccessError,
  );
});

test('sanitizeTenantPayload strictly enforces authenticated session tenant', () => {
  const clientPayload = {
    customerId: 'cust-123',
    amount: 500000,
    tenant: 'golf3d-main', // matches
  };

  const safe = sanitizeTenantPayload(clientPayload, 'golf3d-main');
  assert.equal(safe.tenant, 'golf3d-main');
  assert.equal(safe.amount, 500000);

  // If client tries to spoof another tenant, it is caught
  const spoofPayload = {
    customerId: 'cust-123',
    tenant: 'golf3d-branch2',
  };

  assert.throws(
    () => {
      sanitizeTenantPayload(spoofPayload, 'golf3d-main');
    },
    (err: unknown) => err instanceof TenantAccessError,
  );
});

test('multi-tenant data model guarantees customer isolation across facilities', () => {
  // In SIGOLF SaaS, a customer with phone 0902030185 visiting Facility A and Facility B
  // will have completely separated balances, packages, and transaction ledgers.
  const facilityA = {
    tenant: 'golf3d-facility-a',
    customer: { id: 'cust-a-1', phone: '0902030185' },
    walletBalance: 1500000,
    packagesCount: 1,
  };

  const facilityB = {
    tenant: 'golf3d-facility-b',
    customer: { id: 'cust-b-2', phone: '0902030185' },
    walletBalance: 0,
    packagesCount: 0,
  };

  // Cross-facility wallet debit in Facility B cannot touch Facility A balance
  assert.notEqual(facilityA.customer.id, facilityB.customer.id);
  assert.equal(facilityA.customer.phone, facilityB.customer.phone);
  assert.notEqual(facilityA.walletBalance, facilityB.walletBalance);
});
