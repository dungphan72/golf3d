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
      "DELETE FROM parking_tickets WHERE customer_name LIKE 'Khách Test%' OR customer_name LIKE 'Khách Golf%' OR license_plate LIKE '%TEST%' OR license_plate LIKE '51F-GATE%' OR license_plate LIKE '51T-ISO%' OR license_plate LIKE '51A-PAY%' OR license_plate LIKE '51A-999%' OR license_plate LIKE '51B-888%' OR license_plate LIKE '51C-777%' OR spot_code IN ('P65', 'P10', 'P11', 'P20', 'P30')",
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
    spotId: 'spot-gopick-P65',
    spotCode: 'P65',
    section: 'Dãy P6',
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

test('3. Database Initialization & GoPick Approved 65-Spot Layout', async () => {
  await ensureParkingInitialized(TENANT);

  const config = await getParkingConfig(TENANT);
  assert.ok(config);
  assert.equal(config.tenant, TENANT);
  assert.equal(Boolean(config.isEnabled), true);
  assert.equal(config.totalSpots, 65);

  const now = Date.now();
  const grid = await getSpotGrid(TENANT, now, now + 2 * 3600 * 1000);
  const spots = grid.spots;

  // Exactly 65 spots according to approved layout blueprint
  assert.equal(spots.length, 65, 'GoPick lot must have exactly 65 physical spots');

  // Verify P65 exists and has complete coordinates
  const p65 = spots.find((s) => s.code === 'P65');
  assert.ok(p65, 'Spot P65 must exist in GoPick lot');
  assert.equal(p65.section, 'Dãy P6');
  assert.equal(p65.rowIndex, 6);
  assert.equal(p65.colIndex, 12);
  assert.equal(p65.hasCoordinates, true);

  // Verify first and last spots of sections
  const p01 = spots.find((s) => s.code === 'P01');
  assert.ok(p01);
  assert.equal(p01.section, 'Dãy chéo P1');
  assert.equal(p01.hasCoordinates, true);

  // Legacy demo spots A01-A10 should NOT be returned in active grid
  const a01 = spots.find((s) => s.code === 'A01');
  assert.equal(a01, undefined, 'Legacy demo spot A01 should be retired/inactive');
});

test('4. Atomic Hold, Concurrency Race Condition, and Expiration on Spot P65', async () => {
  await ensureParkingInitialized(TENANT);

  const testTimeIn = Date.now() + 86400000; // tomorrow
  const testTimeOut = testTimeIn + 2 * 3600 * 1000;

  // Device 1 holds spot P65
  const ticket1 = await holdSpot(TENANT, {
    spotCode: 'P65',
    licensePlate: '51A-999.01',
    customerName: 'Khách Test 1',
    customerPhone: '0901234567',
    expectedIn: testTimeIn,
    expectedOut: testTimeOut,
  });

  assert.ok(ticket1);
  assert.equal(ticket1.spotCode, 'P65');
  assert.equal(ticket1.status, 'holding');
  assert.ok(ticket1.accessToken);
  assert.ok(ticket1.holdExpiresAt > Date.now());

  // Device 2 tries to hold the EXACT SAME spot P65 at an overlapping time -> MUST BE REJECTED
  await assert.rejects(
    async () => {
      await holdSpot(TENANT, {
        spotCode: 'P65',
        licensePlate: '51B-888.88',
        customerName: 'Khách Test 2',
        expectedIn: testTimeIn + 30 * 60 * 1000, // 30 mins later
        expectedOut: testTimeOut + 30 * 60 * 1000,
      });
    },
    /vừa có người giữ chỗ hoặc đã được đặt/i,
  );

  // Expire ticket1 manually to simulate timeout
  await db()
    .prepare('UPDATE parking_tickets SET hold_expires_at=? WHERE id=?')
    .bind(Date.now() - 5000, ticket1.id)
    .run();

  // Now Device 2 tries again for P65 -> SUCCEEDS because previous hold has expired!
  const ticket2 = await holdSpot(TENANT, {
    spotCode: 'P65',
    licensePlate: '51B-888.88',
    customerName: 'Khách Test 2',
    expectedIn: testTimeIn + 30 * 60 * 1000,
    expectedOut: testTimeOut + 30 * 60 * 1000,
  });
  assert.ok(ticket2);
  assert.equal(ticket2.spotCode, 'P65');
  assert.equal(ticket2.status, 'holding');
});

test('5. Payment Confirmation, Idempotency, and Golf Sponsorship', async () => {
  await ensureParkingInitialized(TENANT);

  const testTimeIn = Date.now() + 172800000; // 2 days later
  const testTimeOut = testTimeIn + 2 * 3600 * 1000;

  // Case A: Customer pays via QR for spot P10
  const ticketA = await holdSpot(TENANT, {
    spotCode: 'P10',
    licensePlate: '51A-PAY.01',
    customerName: 'Khách Test Pay',
    expectedIn: testTimeIn,
    expectedOut: testTimeOut,
  });

  assert.ok(ticketA);
  assert.equal(ticketA.status, 'holding');

  // Confirm payment
  const confirmed = await confirmTicket(TENANT, {
    ticketCode: ticketA.ticketCode,
    paymentMethod: 'vietqr',
    amountPaid: ticketA.totalAmount,
    transactionRef: 'TEST-TX-001',
  });

  assert.ok(confirmed);
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.paidAmount, ticketA.totalAmount);

  // Idempotency: Webhook sends duplicate notification -> same confirmed ticket returned, no duplicate charge
  const duplicate = await confirmTicket(TENANT, {
    ticketCode: ticketA.ticketCode,
    paymentMethod: 'vietqr',
    amountPaid: ticketA.totalAmount,
    transactionRef: 'TEST-TX-001',
  });
  assert.equal(duplicate.id, confirmed.id);
  assert.equal(duplicate.status, 'confirmed');

  // Case B: Golf player with valid reservation -> 100% sponsored, 0 đ customer payment
  const mockBookingId = `bkg-golf-test-${Date.now()}`;
  await db()
    .prepare(
      `INSERT INTO bookings (
        id, tenant, room, customer, phone, service, people, start, end, status, segments, price, created, food_total
      ) VALUES (?, ?, 'Phòng 101', 'Khách Golf VIP', '0909888999', 'golf', 1, ?, ?, 'confirmed', '[]', 500000, ?, 0)`
    )
    .bind(
      mockBookingId,
      TENANT,
      testTimeIn,
      testTimeOut,
      Date.now(),
    )
    .run();

  const ticketGolf = await holdSpot(TENANT, {
    spotCode: 'P11',
    licensePlate: '51A-GOLF.01',
    customerName: 'Khách Golf VIP',
    customerPhone: '0909888999',
    expectedIn: testTimeIn,
    expectedOut: testTimeOut,
    golfBookingId: mockBookingId,
  });

  assert.equal(ticketGolf.feePayer, 'gopick_sponsored');
  assert.equal(ticketGolf.sponsoredAmount, 30000);

  const confirmedGolf = await confirmTicket(TENANT, {
    ticketCode: ticketGolf.ticketCode,
    paymentMethod: 'system',
    amountPaid: 0,
    transactionRef: `GOLF-SPONSOR-${mockBookingId}`,
  });

  assert.equal(confirmedGolf.status, 'confirmed');
  assert.equal(confirmedGolf.feePayer, 'gopick_sponsored');
  assert.equal(confirmedGolf.paidAmount, 0);
  assert.equal(confirmedGolf.sponsoredAmount, 30000);
});

test('6. Gate Guard Operations: Check-in, Status Update, and Deducting Surcharge', async () => {
  await ensureParkingInitialized(TENANT);

  // Create walk-in ticket at gate for spot P20
  const ticket = await createGatePaperTicket(TENANT, {
    spotCode: 'P20',
    licensePlate: '51F-GATE.01',
    operatorId: 'guard-user-01',
    note: 'Khách vãng lai vào cổng',
  });

  assert.ok(ticket);
  assert.equal(ticket.status, 'active');
  assert.ok(ticket.actualIn);

  // Check spot state is now 'occupied'
  const grid = await getSpotGrid(TENANT, Date.now(), Date.now() + 3600000);
  const spotP20 = grid.spots.find((s) => s.code === 'P20');
  assert.ok(spotP20);
  assert.equal(spotP20.stateForWindow, 'occupied');
  assert.equal(spotP20.currentVehiclePlate, '51F-GATE.01');

  // Idempotent check-in scan again -> returns cleanly without error
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

test('7. Shift Reconciliation & Audit Separation', async () => {
  await ensureParkingInitialized(TENANT);

  const recon = await getShiftReconciliation(TENANT);
  assert.ok(recon);
  assert.ok(typeof recon.onlineAmount === 'number');
  assert.ok(typeof recon.gateCash === 'number');
  assert.ok(typeof recon.netCollected === 'number');
  assert.ok(typeof recon.sponsoredAmount === 'number');

  // Close shift
  const closed = await closeShift(TENANT, {
    staffId: 'manager-01',
    staffName: 'Quản lý ca',
    cashSubmitted: recon.gateCash,
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

  // Ticket created in GoPick cannot be checked in under OTHER_TENANT
  const ticket = await holdSpot(TENANT, {
    spotCode: 'P30',
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
