import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDurationHours,
  calculateParkingPricing,
} from '../modules/parking/core/pricing.ts';
import {
  isTimeWindowOverlapping,
  isTicketHoldExpired,
  doesTicketConflict,
} from '../modules/parking/core/availability.ts';
import {
  ensureParkingInitialized,
  getParkingConfig,
  getSpotGrid,
  holdSpot,
  confirmTicket,
  gateCheckIn,
  gateCheckOut,
  createGatePaperTicket,
  getShiftReconciliation,
  closeShift,
} from '../modules/parking/server/parking-service.ts';
import { db } from '../lib/server/common.ts';
import type { ParkingTicket } from '../modules/parking/core/types.ts';

const TENANT = 'gopick';
const OTHER_TENANT = 'facility-test-isolated';

// Clean test data before running
test('0. Setup test environment', async () => {
  await ensureParkingInitialized(TENANT);
  await db()
    .prepare(
      "DELETE FROM parking_tickets WHERE customer_name LIKE 'Khách Test%' OR license_plate LIKE '%TEST%' OR license_plate LIKE '51F-GATE%' OR license_plate LIKE '51T-ISO%' OR license_plate LIKE '51A-PAY%' OR license_plate LIKE '51A-999%' OR license_plate LIKE '51B-888%' OR license_plate LIKE '51C-777%'",
    )
    .run();
});

test('1. Pricing Engine: duration, rates, and golf sponsorship', () => {
  const baseTime = 1763462700000; // 17:45

  // Duration rounding
  assert.equal(calculateDurationHours(baseTime, baseTime + 2.5 * 3600 * 1000), 3); // 2.5h -> 3h
  assert.equal(calculateDurationHours(baseTime, baseTime + 45 * 60 * 1000), 1); // 45m -> min 1h

  // Case A: Normal customer, 2.5 hours (3 hours base -> flat 30,000 đ)
  const calc1 = calculateParkingPricing({
    expectedIn: baseTime,
    expectedOut: baseTime + 2.5 * 3600 * 1000,
    defaultHourlyRate: 30000,
    isGolfSponsored: false,
  });
  assert.equal(calc1.baseAmount, 30000);
  assert.equal(calc1.customerPay, 30000);
  assert.equal(calc1.sponsoredAmount, 0);
  assert.equal(calc1.feePayer, 'customer');

  // Case B: Golf customer within 3 hours -> 100% sponsored, customer pays 0 đ
  const calc2 = calculateParkingPricing({
    expectedIn: baseTime,
    expectedOut: baseTime + 2.5 * 3600 * 1000,
    defaultHourlyRate: 30000,
    golfFreeHours: 3,
    isGolfSponsored: true,
  });
  assert.equal(calc2.baseAmount, 30000);
  assert.equal(calc2.customerPay, 0);
  assert.equal(calc2.sponsoredAmount, 30000);
  assert.equal(calc2.feePayer, 'gopick_sponsored');

  // Case C: Overtime calculation with 15-minute grace period
  // 10 minutes past expectedOut -> inside grace period -> 0 overtime
  const ot1 = calculateParkingPricing({
    expectedIn: baseTime,
    expectedOut: baseTime + 2 * 3600 * 1000,
    actualOut: baseTime + 2 * 3600 * 1000 + 10 * 60 * 1000,
    defaultHourlyRate: 30000,
    overtimeRatePerHour: 20000,
  });
  assert.equal(ot1.overtimeAmount, 0);

  // 45 minutes past expectedOut -> grace exceeded -> 1 hour overtime charged
  const ot2 = calculateParkingPricing({
    expectedIn: baseTime,
    expectedOut: baseTime + 2 * 3600 * 1000,
    actualOut: baseTime + 2 * 3600 * 1000 + 45 * 60 * 1000,
    defaultHourlyRate: 30000,
    overtimeRatePerHour: 20000,
  });
  assert.equal(ot2.overtimeHours, 1);
  assert.equal(ot2.overtimeAmount, 20000);
  assert.equal(ot2.finalTotal, ot2.baseAmount + 20000);
});

test('2. Availability & Interval Overlap Rules', () => {
  const t0900 = 1763434800000;
  const t1030 = t0900 + 1.5 * 3600 * 1000;
  const t1100 = t0900 + 2.0 * 3600 * 1000;
  const t1130 = t0900 + 2.5 * 3600 * 1000;
  const t1200 = t0900 + 3.0 * 3600 * 1000;

  // Overlap: [09:00, 11:00) and [10:30, 11:30) overlap
  assert.equal(isTimeWindowOverlapping(t0900, t1100, t1030, t1130, 0), true);

  // Half-open edge without buffer: [09:00, 11:00) and [11:00, 12:00) do NOT overlap
  assert.equal(isTimeWindowOverlapping(t0900, t1100, t1100, t1200, 0), false);

  // Edge with 10-minute buffer: [09:00, 11:00) + 10 min buffer overlaps with [11:05, 12:00)
  assert.equal(isTimeWindowOverlapping(t0900, t1100, t1100 + 5 * 60 * 1000, t1200, 10), true);

  // Expired hold tickets are NOT active
  const now = Date.now();
  const activeTicket = {
    id: 't-test-1',
    ticketCode: 'PK-001',
    tenant: TENANT,
    spotId: 'spot-gopick-A03',
    spotCode: 'A03',
    section: 'Dãy A',
    licensePlate: '51A-123.45',
    status: 'holding',
    expectedIn: now,
    expectedOut: now + 3600000,
    baseAmount: 30000,
    sponsoredAmount: 0,
    paidAmount: 0,
    overtimeAmount: 0,
    totalAmount: 30000,
    refundAmount: 0,
    feePayer: 'customer',
    holdExpiresAt: now + 120000, // 2 mins in future
    accessToken: 'sec-1',
    createdAt: now,
    updatedAt: now,
  } as unknown as ParkingTicket;
  assert.equal(isTicketHoldExpired(activeTicket, now), false);
  assert.equal(doesTicketConflict(activeTicket, now, now + 3600000, 0, now), true);

  const expiredTicket = { ...activeTicket, holdExpiresAt: now - 10000 };
  assert.equal(isTicketHoldExpired(expiredTicket, now), true);
  assert.equal(doesTicketConflict(expiredTicket, now, now + 3600000, 0, now), false);
});

test('3. Database Initialization & Spot Grid for GoPick', async () => {
  await ensureParkingInitialized(TENANT);

  const config = await getParkingConfig(TENANT);
  assert.ok(config);
  assert.equal(config.tenant, TENANT);
  assert.equal(Boolean(config.isEnabled), true);

  const now = Date.now();
  const grid = await getSpotGrid(TENANT, now, now + 2 * 3600 * 1000);
  const spots = grid.spots;
  assert.ok(spots.length >= 75); // 10 quick demo A01-A10 + 65 physical P01-P65

  const a03 = spots.find((s) => s.code === 'A03');
  assert.ok(a03);
  assert.equal(a03.section, 'Dãy A');
});

test('4. Atomic Hold, Race Condition Prevention, and Double-Hold Rejection', async () => {
  await ensureParkingInitialized(TENANT);

  const testTimeIn = Date.now() + 86400000; // tomorrow
  const testTimeOut = testTimeIn + 2 * 3600 * 1000;

  // Device 1 holds spot A03
  const ticket1 = await holdSpot(TENANT, {
    spotCode: 'A03',
    licensePlate: '51A-999.01',
    customerName: 'Khách Test 1',
    customerPhone: '0901234567',
    expectedIn: testTimeIn,
    expectedOut: testTimeOut,
  });

  assert.ok(ticket1);
  assert.equal(ticket1.spotCode, 'A03');
  assert.equal(ticket1.status, 'holding');
  assert.ok(ticket1.accessToken);

  // Device 2 tries to hold the EXACT SAME spot at an overlapping time -> MUST BE REJECTED
  await assert.rejects(
    async () => {
      await holdSpot(TENANT, {
        spotCode: 'A03',
        licensePlate: '51B-888.88',
        customerName: 'Khách Test 2',
        expectedIn: testTimeIn + 30 * 60 * 1000, // 30 mins later
        expectedOut: testTimeOut + 30 * 60 * 1000,
      });
    },
    /vừa có người giữ chỗ hoặc đã được đặt/i,
  );

  // Adjacent booking without overlap: tomorrow after testTimeOut -> SUCCEEDS
  const ticket3 = await holdSpot(TENANT, {
    spotCode: 'A03',
    licensePlate: '51C-777.77',
    customerName: 'Khách Test 3',
    expectedIn: testTimeOut,
    expectedOut: testTimeOut + 2 * 3600 * 1000,
  });
  assert.ok(ticket3);
  assert.equal(ticket3.spotCode, 'A03');
});

test('5. Golf Sponsorship Confirmation & Payment Flow', async () => {
  await ensureParkingInitialized(TENANT);

  const testTimeIn = Date.now() + 172800000; // 2 days later
  const testTimeOut = testTimeIn + 2 * 3600 * 1000;

  // Hold spot A04 for normal customer
  const ticket = await holdSpot(TENANT, {
    spotCode: 'A04',
    licensePlate: '51A-PAY.01',
    customerName: 'Khách Test Pay',
    expectedIn: testTimeIn,
    expectedOut: testTimeOut,
  });

  assert.ok(ticket);
  assert.equal(ticket.status, 'holding');

  // Confirm ticket payment
  const confirmed = await confirmTicket(TENANT, {
    ticketCode: ticket.ticketCode,
    paymentMethod: 'vietqr',
    amountPaid: ticket.totalAmount,
    transactionRef: 'TEST-TX-001',
  });

  assert.ok(confirmed);
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.paidAmount, ticket.totalAmount);
});

test('6. Gate Guard Operations: Idempotent Check-in and Overtime Check-out', async () => {
  await ensureParkingInitialized(TENANT);

  // Create walk-in ticket at the gate for spot A05
  const ticket = await createGatePaperTicket(TENANT, {
    spotCode: 'A05',
    licensePlate: '51F-GATE.01',
    operatorId: 'guard-user-01',
    note: 'Khách vãng lai vào cổng',
  });

  assert.ok(ticket);
  assert.equal(ticket.status, 'active');
  assert.ok(ticket.actualIn);

  // Idempotent check-in scan again -> returns existing without error
  const rescan = await gateCheckIn(TENANT, {
    ticketCode: ticket.ticketCode,
    operatorId: 'guard-user-01',
  });
  assert.ok(rescan);
  assert.equal(rescan.id, ticket.id);
  assert.equal(rescan.status, 'active');

  // Gate Check-out
  const checkedOut = await gateCheckOut(TENANT, {
    ticketCode: ticket.ticketCode,
    operatorId: 'guard-user-01',
    paymentMethod: 'gate_cash',
    amountCollected: 30000,
  });

  assert.ok(checkedOut.ticket);
  assert.equal(checkedOut.ticket.status, 'completed');
  assert.ok(checkedOut.ticket.actualOut);
});

test('7. Shift Reconciliation & Close Shift', async () => {
  await ensureParkingInitialized(TENANT);

  const recon = await getShiftReconciliation(TENANT);
  assert.ok(recon);
  assert.ok(recon.onlineAmount >= 0);
  assert.ok(recon.gateCash >= 0);
  assert.ok(recon.netCollected >= 0);

  // Test close shift
  const closed = await closeShift(TENANT, {
    staffId: 'manager-01',
    staffName: 'Quản lý ca',
    cashSubmitted: recon.gateCash, // Exact match -> diff 0
  });

  assert.ok(closed);
  assert.equal(closed.gateCash, recon.gateCash);
});

test('8. Multi-tenant Isolation Check', async () => {
  await ensureParkingInitialized(TENANT);
  await ensureParkingInitialized(OTHER_TENANT);

  const gopickConfig = await getParkingConfig(TENANT);
  const otherConfig = await getParkingConfig(OTHER_TENANT);

  assert.equal(gopickConfig?.tenant, TENANT);
  assert.equal(otherConfig?.tenant, OTHER_TENANT);

  // Creating ticket in GoPick cannot be checked in under OTHER_TENANT
  const ticket = await holdSpot(TENANT, {
    spotCode: 'A06',
    licensePlate: '51T-ISO.01',
    customerName: 'Khách Test Iso',
    expectedIn: Date.now() + 3600000,
    expectedOut: Date.now() + 7200000,
  });
  assert.ok(ticket);

  await assert.rejects(
    async () => {
      await gateCheckIn(OTHER_TENANT, {
        ticketCode: ticket.ticketCode,
        operatorId: 'other-guard',
      });
    },
    /không tìm thấy thông tin vé/i,
  );
});
