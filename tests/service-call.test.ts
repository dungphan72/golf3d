import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVICE_CALL_STATUSES,
  SERVICE_CALL_SOURCES,
  GUEST_MODES,
  RESOLUTION_TYPES,
  DEFAULT_SERVICE_CALL_SETTINGS,
  DEFAULT_CATEGORIES,
  STATUS_LABELS,
  RESOLUTION_LABELS,
  formatCallTimer,
} from '../lib/service-call.ts';

test('service call statuses and sources include all required lifecycle values', () => {
  assert.deepEqual(SERVICE_CALL_STATUSES, [
    'CREATED',
    'ACKNOWLEDGED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
    'EXPIRED',
  ]);

  assert.deepEqual(SERVICE_CALL_SOURCES, ['guest_qr', 'member_app', 'staff_proxy']);
  assert.deepEqual(GUEST_MODES, ['MODE_A', 'MODE_B', 'MODE_C']);
  assert.deepEqual(RESOLUTION_TYPES, [
    'RESOLVED',
    'NO_SHOW',
    'CUSTOMER_CANCELLED',
    'TRANSFERRED',
  ]);
});

test('default categories contain standard 6 options with i18n support', () => {
  assert.equal(DEFAULT_CATEGORIES.length, 6);
  const codes = DEFAULT_CATEGORIES.map((c) => c.code);
  assert.ok(codes.includes('STAFF'));
  assert.ok(codes.includes('FNB'));
  assert.ok(codes.includes('EQUIPMENT'));
  assert.ok(codes.includes('COACH'));
  assert.ok(codes.includes('BILLING'));
  assert.ok(codes.includes('OTHER'));

  for (const cat of DEFAULT_CATEGORIES) {
    assert.ok(cat.name_vi.length > 0);
    assert.ok(cat.name_en.length > 0);
    assert.ok(cat.name_ko.length > 0);
    assert.ok(cat.icon.length > 0);
  }
});

test('status and resolution labels support VI, EN, KO', () => {
  for (const st of SERVICE_CALL_STATUSES) {
    assert.ok(STATUS_LABELS[st].vi);
    assert.ok(STATUS_LABELS[st].en);
    assert.ok(STATUS_LABELS[st].ko);
  }

  for (const res of RESOLUTION_TYPES) {
    assert.ok(RESOLUTION_LABELS[res].vi);
    assert.ok(RESOLUTION_LABELS[res].en);
    assert.ok(RESOLUTION_LABELS[res].ko);
  }
});

test('default settings have sensible SLA and limits', () => {
  assert.equal(DEFAULT_SERVICE_CALL_SETTINGS.is_enabled, true);
  assert.equal(DEFAULT_SERVICE_CALL_SETTINGS.guest_mode, 'MODE_C');
  assert.equal(DEFAULT_SERVICE_CALL_SETTINGS.sla_ack_seconds, 120);
  assert.equal(DEFAULT_SERVICE_CALL_SETTINGS.sla_resolve_seconds, 600);
  assert.equal(DEFAULT_SERVICE_CALL_SETTINGS.cooldown_seconds, 60);
  assert.equal(DEFAULT_SERVICE_CALL_SETTINGS.max_open_requests, 3);
});

test('formatCallTimer formats seconds to mm:ss correctly', () => {
  assert.equal(formatCallTimer(0), '00:00');
  assert.equal(formatCallTimer(65 * 1000), '01:05');
  assert.equal(formatCallTimer(600 * 1000), '10:00');
  assert.equal(formatCallTimer(3661 * 1000), '61:01');
});
