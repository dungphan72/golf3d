import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeEventKey,
  formatEventTimeline,
  type BusinessEvent,
} from '../modules/crm/core/events.ts';

test('makeEventKey generates deterministic and sanitized idempotency keys', () => {
  const k1 = makeEventKey('pos.payment.completed', 'golf3d-main', 'booking_123', 'req_456');
  const k2 = makeEventKey('pos.payment.completed', 'golf3d-main', 'booking_123', 'req_456');
  assert.equal(k1, k2);
  assert.equal(k1, 'evt:pos.payment.completed:golf3d-main:booking_123:req_456');

  // sanitizes symbols
  const k3 = makeEventKey('booking.started', 'golf3d@main!', 'room#1', 'qual$');
  assert.equal(k3, 'evt:booking.started:golf3dmain:room1:qual');
});

test('formatEventTimeline renders clear human-friendly presentation for POS events', () => {
  const now = 1794921600000;
  const posEvent: BusinessEvent = {
    id: 'evt-1',
    type: 'pos.payment.completed',
    tenant: 'golf3d-main',
    source: 'pos',
    actor: 'Lễ tân Hoa',
    timestamp: now,
    idempotencyKey: 'k-1',
    data: {
      bookingId: 'bk-987654321',
      method: 'transfer',
      amount: 450000,
      requestId: 'r-1',
    },
  };
  const fmt = formatEventTimeline(posEvent);
  assert.equal(fmt.kind, 'pos');
  assert.ok(fmt.title.includes('450.000đ'));
  assert.ok(fmt.desc.includes('TRANSFER'));
  assert.ok(fmt.desc.includes('Lễ tân Hoa'));
});

test('formatEventTimeline renders clear human-friendly presentation for Booking events', () => {
  const now = 1794921600000;
  const startEvent: BusinessEvent = {
    id: 'evt-2',
    type: 'booking.started',
    tenant: 'golf3d-main',
    source: 'booking',
    actor: 'NV Quầy',
    timestamp: now,
    idempotencyKey: 'k-2',
    data: {
      bookingId: 'bk-1',
      room: 'gdr-1',
      service: 'gdr',
      start: now,
      end: now + 3600000,
    },
  };
  const fmt = formatEventTimeline(startEvent);
  assert.equal(fmt.kind, 'booking');
  assert.ok(fmt.title.includes('GDR-1'));
  assert.ok(fmt.desc.includes('bắt đầu'));
});

test('formatEventTimeline renders clear human-friendly presentation for Membership events', () => {
  const now = 1794921600000;
  const walletEvent: BusinessEvent = {
    id: 'evt-3',
    type: 'membership.wallet_topup',
    tenant: 'golf3d-main',
    source: 'membership',
    actor: 'Thu ngân Nam',
    timestamp: now,
    idempotencyKey: 'k-3',
    data: {
      delta: 2000000,
      balance: 3200000,
      reason: 'topup',
    },
  };
  const fmt = formatEventTimeline(walletEvent);
  assert.equal(fmt.kind, 'membership');
  assert.ok(fmt.title.includes('+2.000.000đ'));
  assert.ok(fmt.desc.includes('3.200.000đ'));
});
