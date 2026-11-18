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
  changeTicketSpot,
  getShiftReconciliation,
  closeShift,
} from '../modules/parking/server/parking-service.ts';
import { db } from '../lib/server/common.ts';
import { receiveSepay } from '../lib/server/bank-service.ts';
import {
  extractVietnamesePlate,
  formatVietnamesePlate,
  cleanPlateString,
} from '../modules/parking/core/plate-recognition.ts';
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

test('9. Vietnamese License Plate ANPR Extraction & Normalization', () => {
  // Test various Vietnamese license plate formats and OCR noise
  assert.equal(extractVietnamesePlate('51A-123.45'), '51A-123.45');
  assert.equal(extractVietnamesePlate('BIEN SO: 51A12345'), '51A-123.45');
  assert.equal(extractVietnamesePlate('XE RA 30H-678.90 DANG CHO'), '30H-678.90');
  assert.equal(extractVietnamesePlate('51K 246 80'), '51K-246.80');
  assert.equal(extractVietnamesePlate('29A-9999'), '29A-9999');
  assert.equal(extractVietnamesePlate('59C1-123.45'), '59C1-123.45');

  // Test format and clean
  assert.equal(cleanPlateString('51A-123.45'), '51A12345');
  assert.equal(formatVietnamesePlate('51A12345'), '51A-123.45');
  assert.equal(formatVietnamesePlate('30H67890'), '30H-678.90');
});

test('10. SePay Webhook Auto-confirmation, Spot Lock & Camera Gate Checkout', async () => {
  // 1. Customer reserves spot P10 on mobile
  const holdTicket = await holdSpot(TENANT, {
    spotCode: 'P10',
    licensePlate: '51A-123.45',
    customerName: 'Khách SePay Test',
    expectedIn: Date.now() + 1800000,
    expectedOut: Date.now() + 7200000,
  });
  assert.ok(holdTicket);
  assert.equal(holdTicket.status, 'holding');

  // 2. Simulate SePay Webhook incoming transaction matching note PK-xxxx or PKxxxx
  const ticketNumeric = holdTicket.ticketCode.replace(/\D/g, '');
  const sepayRawPayload = {
    id: Date.now(),
    gateway: 'MBBank',
    transactionDate: new Date().toISOString(),
    accountNumber: '0877834888',
    subAccount: null,
    transferType: 'in',
    transferAmount: 30000,
    accumulated: 1000000,
    code: null,
    content: `PK${ticketNumeric} THANH TOAN DAT CHO GUI XE`,
    referenceCode: `FT${Date.now()}`,
    description: `PK${ticketNumeric} THANH TOAN DAT CHO GUI XE`,
  };

  const sepayRes = await receiveSepay(null, sepayRawPayload);
  assert.ok(sepayRes.status < 400);

  // 3. Verify ticket was automatically confirmed & spot locked
  const verifiedTicket = await db()
    .prepare('SELECT * FROM parking_tickets WHERE ticket_code=?')
    .bind(holdTicket.ticketCode)
    .first<any>();
  assert.equal(verifiedTicket.status, 'confirmed');
  assert.equal(verifiedTicket.paid_amount, 30000);
  assert.equal(verifiedTicket.payment_method, 'sepay');

  // Verify spot P10 is no longer available (locked)
  const grid = await getSpotGrid(
    TENANT,
    Date.now() + 1800000,
    Date.now() + 7200000,
  );
  const p10Spot = grid.spots.find((s) => s.code === 'P10');
  assert.ok(p10Spot);
  assert.equal(p10Spot.stateForWindow, 'booked');

  // 4. Vehicle enters: Guard checks in vehicle
  const checkedIn = await gateCheckIn(TENANT, {
    ticketCode: holdTicket.ticketCode,
    staffName: 'Bảo vệ cổng',
  });
  assert.equal(checkedIn.status, 'active');

  // 5. Vehicle leaves: Guard uses camera plate OCR (raw: 51A12345 or 51A-123.45)
  const checkOutResult = await gateCheckOut(TENANT, {
    licensePlate: '51A12345', // Normalized OCR without dash/dot
    staffName: 'Bảo vệ camera',
  });
  assert.equal(checkOutResult.ticket.status, 'completed');
  assert.equal(checkOutResult.ticket.licensePlate, '51A-123.45');

  // 6. Verify spot is now available again
  const finalGrid = await getSpotGrid(
    TENANT,
    Date.now() + 1800000,
    Date.now() + 7200000,
  );
  const freedSpot = finalGrid.spots.find((s) => s.code === 'P10');
  assert.equal(freedSpot?.stateForWindow, 'available');
});

test('11. End-to-end P65 booking, single ID mapping, and legacy spot retirement', async () => {
  // Ensure exactly 65 physical spots in GoPick (P01 - P65)
  const grid = await getSpotGrid(TENANT, Date.now(), Date.now() + 3600000);
  assert.equal(grid.spots.length, 65, 'Total spots must be exactly 65 for GoPick');
  const p65 = grid.spots.find((s) => s.code === 'P65');
  assert.ok(p65, 'P65 must exist in grid');
  assert.equal(p65.id, 'spot-gopick-P65', 'Physical ID must be spot-gopick-P65');

  // Verify legacy A% spots are retired/inactive
  const legacySpots = grid.spots.filter((s) => s.code.startsWith('A'));
  assert.equal(legacySpots.length, 0, 'Legacy A% spots must not be available for booking');

  // Hold P65 with Golf Sponsorship
  const now = Date.now();
  const mockGolfId = `bkg-p65-${now}`;
  await db()
    .prepare(
      `INSERT INTO bookings (
        id, tenant, room, customer, phone, service, people, start, end, status, segments, price, created, food_total
      ) VALUES (?, ?, 'Phòng VIP', 'Khách VIP P65', '0912345678', 'golf', 1, ?, ?, 'confirmed', '[]', 500000, ?, 0)`
    )
    .bind(mockGolfId, TENANT, now + 3600000, now + 10800000, now)
    .run();

  const holdP65 = await holdSpot(TENANT, {
    spotCode: 'P65',
    expectedIn: now + 3600000,
    expectedOut: now + 10800000,
    licensePlate: '51A-999.65',
    customerName: 'Khách VIP P65',
    customerPhone: '0912345678',
    golfBookingId: mockGolfId,
  });
  assert.equal(holdP65.spotCode, 'P65');
  assert.equal(holdP65.feePayer, 'gopick_sponsored');

  // Confirm booking with GoPick 100% sponsorship
  const confirmedP65 = await confirmTicket(TENANT, {
    ticketCode: holdP65.ticketCode,
    paymentMethod: 'system',
    amountPaid: 0,
    transactionRef: `SPONSOR-${mockGolfId}`,
  });
  assert.equal(confirmedP65.status, 'confirmed');
  assert.equal(confirmedP65.feePayer, 'gopick_sponsored');

  // Guard checks in vehicle
  const inP65 = await gateCheckIn(TENANT, {
    ticketCode: holdP65.ticketCode,
    staffName: 'Bảo vệ cổng',
  });
  assert.equal(inP65.status, 'active');

  // Guard checks out vehicle
  const outP65 = await gateCheckOut(TENANT, {
    ticketCode: holdP65.ticketCode,
    staffName: 'Bảo vệ cổng',
  });
  assert.equal(outP65.ticket.status, 'completed');
});

test('12. Atomic server collision prevention on spot change (changeTicketSpot)', async () => {
  const now = Date.now();
  const inTime = now + 1800000;
  const outTime = now + 7200000;

  // Create ticket 1 on P21
  const t1 = await holdSpot(TENANT, {
    spotCode: 'P21',
    expectedIn: inTime,
    expectedOut: outTime,
    licensePlate: '51B-888.21',
    customerName: 'Khách Test P21',
  });
  await confirmTicket(TENANT, { ticketCode: t1.ticketCode, paymentMethod: 'cash', paidAmount: 30000 });

  // Create ticket 2 on P22
  const t2 = await holdSpot(TENANT, {
    spotCode: 'P22',
    expectedIn: inTime,
    expectedOut: outTime,
    licensePlate: '51B-888.22',
    customerName: 'Khách Test P22',
  });
  await confirmTicket(TENANT, { ticketCode: t2.ticketCode, paymentMethod: 'cash', paidAmount: 30000 });

  // Ticket 1 attempts to change to P22 (already occupied/booked) -> must be rejected
  await assert.rejects(
    async () => {
      await changeTicketSpot(TENANT, {
        ticketCode: t1.ticketCode,
        newSpotCode: 'P22',
        staffName: 'Lễ tân ca sáng',
      });
    },
    { message: /Ô P22 đã có xe giữ hoặc đặt trước/i },
  );

  // Ticket 1 changes to empty P23 -> must succeed
  const changedT1 = await changeTicketSpot(TENANT, {
    ticketCode: t1.ticketCode,
    newSpotCode: 'P23',
    staffName: 'Lễ tân ca sáng',
  });
  assert.equal(changedT1.spotCode, 'P23');

  // Verify P21 is now available again
  const gridAfter = await getSpotGrid(TENANT, inTime, outTime);
  const p21 = gridAfter.spots.find((s) => s.code === 'P21');
  assert.equal(p21?.stateForWindow, 'available');
});

test('13. Shift reconciliation: Net cash calculation & idempotency', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const recon = await getShiftReconciliation(TENANT, today);

  // Net collected must strictly equal gateCash - refundAmount
  assert.equal(
    recon.netCollected,
    recon.gateCash - recon.refundAmount,
    'netCollected must equal gateCash - refundAmount',
  );

  // Close shift first time
  const shift1 = await closeShift(TENANT, {
    staffName: 'Quản lý trưởng',
    cashSubmitted: recon.netCollected,
  });
  assert.ok(shift1.shiftId);

  // Immediate second attempt within 60s with same cash -> idempotency returns existing shift
  const shift2 = await closeShift(TENANT, {
    staffName: 'Quản lý trưởng',
    cashSubmitted: recon.netCollected,
  });
  assert.equal(shift2.shiftId, shift1.shiftId, 'Shift closure must be idempotent on rapid re-submission');
});

test('14. Overtime calculation with grace period', async () => {
  const baseTime = Date.now();
  // Within 15-minute grace period -> 0 overtime
  const otWithin = calculateParkingPricing({
    expectedIn: baseTime,
    expectedOut: baseTime + 2 * 3600 * 1000,
    actualOut: baseTime + 2 * 3600 * 1000 + 14 * 60 * 1000,
    defaultHourlyRate: 30000,
    overtimeRatePerHour: 15000,
  });
  assert.equal(otWithin.overtimeAmount, 0);

  // 35 minutes past expectedOut -> exceeds 15m grace -> charged 1 hour overtime
  const otExceed = calculateParkingPricing({
    expectedIn: baseTime,
    expectedOut: baseTime + 2 * 3600 * 1000,
    actualOut: baseTime + 2 * 3600 * 1000 + 35 * 60 * 1000,
    defaultHourlyRate: 30000,
    overtimeRatePerHour: 15000,
  });
  assert.equal(otExceed.overtimeHours, 1);
  assert.equal(otExceed.overtimeAmount, 15000);
});
