/**
 * Saigon Indoor Golf (SIGOLF) — Module Bãi Đậu Xe
 * Server-side Service Layer & Database Pipeline
 */

import { db, audit } from '../../../lib/server/common.ts';
import { pushToTenant } from '../../../lib/server/webpush.ts';
import type {
  ParkingSettings,
  ParkingSpot,
  ParkingTicket,
  ParkingTransaction,
  ShiftReconciliationSummary,
  HoldSpotInput,
  ConfirmTicketInput,
  GateCheckInInput,
  GateCheckOutInput,
  CreatePaperTicketInput,
  ChangeSpotInput,
  ExtendParkingTicketInput,
} from '../core/types.ts';
import { calculateParkingPricing } from '../core/pricing.ts';
import { evaluateSpotState, doesTicketConflict } from '../core/availability.ts';

export const DEFAULT_PARKING_TENANT = 'gopick';

export async function getParkingConfig(tenant: string = DEFAULT_PARKING_TENANT): Promise<ParkingSettings> {
  return ensureParkingInitialized(tenant);
}

/**
 * Ensures parking settings and default spots exist for the facility (GoPick first).
 */
export async function ensureParkingInitialized(tenant: string = DEFAULT_PARKING_TENANT): Promise<ParkingSettings> {
  const existing = await db()
    .prepare('SELECT * FROM parking_settings WHERE tenant=?')
    .bind(tenant)
    .first<any>();

  let settings: ParkingSettings;

  if (!existing) {
    const now = Date.now();
    await db()
      .prepare(
        `INSERT INTO parking_settings (
          tenant, is_enabled, facility_name, address, directions_url,
          default_hourly_rate, buffer_minutes, hold_timeout_seconds,
          golf_free_hours, golf_slots_per_booking, overtime_rate_per_hour,
          allow_paper_tickets, updated_at
        ) VALUES (?, 1, ?, ?, ?, ?, 0, 300, 3, 1, 30000, 1, ?)`,
      )
      .bind(
        tenant,
        'Bãi xe GoPick',
        '250 Lương Định Của, Phường An Phú, TP. Thủ Đức, TP.HCM',
        'https://maps.google.com/?q=250+Luong+Dinh+Cua',
        30000,
        now,
      )
      .run();

    settings = {
      tenant,
      isEnabled: true,
      facilityName: 'Bãi xe GoPick',
      address: '250 Lương Định Của, Phường An Phú, TP. Thủ Đức, TP.HCM',
      directionsUrl: 'https://maps.google.com/?q=250+Luong+Dinh+Cua',
      defaultHourlyRate: 30000,
      bufferMinutes: 0,
      holdTimeoutSeconds: 300,
      golfFreeHours: 3,
      golfSlotsPerBooking: 1,
      overtimeRatePerHour: 30000,
      allowPaperTickets: true,
      updatedAt: now,
      totalSpots: 65,
    };
  } else {
    settings = {
      tenant: existing.tenant,
      isEnabled: Boolean(existing.is_enabled),
      facilityName: existing.facility_name,
      address: existing.address,
      directionsUrl: existing.directions_url,
      defaultHourlyRate: existing.default_hourly_rate,
      bufferMinutes: existing.buffer_minutes,
      holdTimeoutSeconds: existing.hold_timeout_seconds,
      golfFreeHours: existing.golf_free_hours,
      golfSlotsPerBooking: existing.golf_slots_per_booking,
      overtimeRatePerHour: existing.overtime_rate_per_hour,
      allowPaperTickets: Boolean(existing.allow_paper_tickets),
      updatedAt: existing.updated_at,
      totalSpots: 65,
    };
  }

  // Ensure legacy A01-A10 demo spots are deactivated so they are no longer sold,
  // but first migrate any active tickets on legacy A% spots to the corresponding P% spots safely
  if (tenant === 'gopick' || tenant === 'golf3d-main') {
    try {
      const activeLegacyTickets = await db()
        .prepare(
          "SELECT id, spot_code FROM parking_tickets WHERE tenant=? AND spot_code LIKE 'A%' AND status IN ('holding', 'confirmed', 'active')"
        )
        .bind(tenant)
        .all<any>();

      for (const t of activeLegacyTickets.results) {
        const num = parseInt(t.spot_code.replace(/\D/g, '') || '1', 10);
        const targetPCode = `P${String(num).padStart(2, '0')}`;
        const targetPSpot = await db()
          .prepare("SELECT id, section FROM parking_spots WHERE tenant=? AND code=?")
          .bind(tenant, targetPCode)
          .first<any>();
        if (targetPSpot) {
          await db()
            .prepare("UPDATE parking_tickets SET spot_id=?, spot_code=?, section=? WHERE id=?")
            .bind(targetPSpot.id, targetPCode, targetPSpot.section, t.id)
            .run();
        }
      }
    } catch {
      // Safe fallback if parking_tickets doesn't have records yet
    }

    await db()
      .prepare("UPDATE parking_spots SET is_active=0 WHERE tenant=? AND code LIKE 'A%'")
      .bind(tenant)
      .run();

    // Enforce normalized row_index, col_index and section matching approved 65-slot GoPick plan
    await db().prepare("UPDATE parking_spots SET row_index=1, col_index=CAST(SUBSTR(code, 2) AS INTEGER), section='Dãy chéo P1' WHERE tenant=? AND code BETWEEN 'P01' AND 'P09'").bind(tenant).run();
    await db().prepare("UPDATE parking_spots SET row_index=2, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 9, section='Dãy P2' WHERE tenant=? AND code BETWEEN 'P10' AND 'P20'").bind(tenant).run();
    await db().prepare("UPDATE parking_spots SET row_index=3, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 20, section='Dãy P3' WHERE tenant=? AND code BETWEEN 'P21' AND 'P31'").bind(tenant).run();
    await db().prepare("UPDATE parking_spots SET row_index=4, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 31, section='Dãy P4' WHERE tenant=? AND code BETWEEN 'P32' AND 'P42'").bind(tenant).run();
    await db().prepare("UPDATE parking_spots SET row_index=5, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 42, section='Dãy P5' WHERE tenant=? AND code BETWEEN 'P43' AND 'P53'").bind(tenant).run();
    await db().prepare("UPDATE parking_spots SET row_index=6, col_index=CAST(SUBSTR(code, 2) AS INTEGER) - 53, section='Dãy P6' WHERE tenant=? AND code BETWEEN 'P54' AND 'P65'").bind(tenant).run();
  }

  // Seed default spots if none exist
  const spotCount = await db()
    .prepare('SELECT COUNT(*) as cnt FROM parking_spots WHERE tenant=? AND is_active=1')
    .bind(tenant)
    .first<{ cnt: number }>();

  if (!spotCount || spotCount.cnt === 0) {
    await seedGoPickSpots(tenant);
  }

  return settings;
}

/**
 * Seeds the official 65-slot layout (P01-P65) for GoPick based on approved plan.
 */
async function seedGoPickSpots(tenant: string) {
  for (let p = 1; p <= 65; p++) {
    const code = `P${String(p).padStart(2, '0')}`;
    const id = `spot-${tenant}-${code}`;
    let section = 'Dãy chéo P1';
    let row = 1;
    let col = p;
    if (p <= 9) {
      section = 'Dãy chéo P1';
      row = 1;
      col = p; // 1..9
    } else if (p <= 20) {
      section = 'Dãy P2';
      row = 2;
      col = p - 9; // 1..11
    } else if (p <= 31) {
      section = 'Dãy P3';
      row = 3;
      col = p - 20; // 1..11
    } else if (p <= 42) {
      section = 'Dãy P4';
      row = 4;
      col = p - 31; // 1..11
    } else if (p <= 53) {
      section = 'Dãy P5';
      row = 5;
      col = p - 42; // 1..11
    } else {
      section = 'Dãy P6';
      row = 6;
      col = p - 53; // 1..12
    }
    await db()
      .prepare(
        `INSERT OR REPLACE INTO parking_spots (
          id, tenant, code, section, spot_type, row_index, col_index, is_active, status, sort_order
        ) VALUES (?, ?, ?, ?, 'car', ?, ?, 1, 'active', ?)`
      )
      .bind(id, tenant, code, section, row, col, p)
      .run();
  }
}

/**
 * Gets the list of parking spots along with their computed availability status for the requested window.
 */
export async function getSpotGrid(
  tenant: string = DEFAULT_PARKING_TENANT,
  expectedIn: number = Date.now(),
  expectedOut: number = Date.now() + 2.5 * 3600 * 1000,
  mode: 'now' | 'slot' = 'slot',
  now: number = Date.now(),
): Promise<{
  settings: ParkingSettings;
  spots: ParkingSpot[];
  summary: {
    total: number;
    available: number;
    held: number;
    booked: number;
    occupied: number;
    maintenance: number;
  };
}> {
  const settings = await ensureParkingInitialized(tenant);

  const rawSpots = (
    await db()
      .prepare('SELECT * FROM parking_spots WHERE tenant=? AND is_active=1 ORDER BY sort_order ASC')
      .bind(tenant)
      .all<any>()
  ).results;

  // Retrieve tickets that could be relevant (either currently active or within time range)
  const relevantTickets = (
    await db()
      .prepare(
        `SELECT * FROM parking_tickets 
         WHERE tenant=? 
           AND status IN ('holding', 'confirmed', 'active')`
      )
      .bind(tenant)
      .all<any>()
  ).results.map(mapDbTicket);

  const targetIn = mode === 'now' ? now : expectedIn;
  const targetOut = mode === 'now' ? now + 2 * 3600 * 1000 : expectedOut;

  let availableCount = 0;
  let heldCount = 0;
  let bookedCount = 0;
  let occupiedCount = 0;
  let maintenanceCount = 0;

  const spots: ParkingSpot[] = rawSpots.map((r) => {
    const spot: ParkingSpot = {
      id: r.id,
      tenant: r.tenant,
      code: r.code,
      section: r.section,
      spotType: r.spot_type as any,
      rowIndex: r.row_index,
      colIndex: r.col_index,
      isActive: Boolean(r.is_active),
      status: r.status,
      sortOrder: r.sort_order,
      hasCoordinates: Boolean(r.row_index && r.col_index && r.section),
    };

    const evaluation = evaluateSpotState(
      spot,
      relevantTickets,
      targetIn,
      targetOut,
      settings.bufferMinutes,
      now,
    );

    spot.stateForWindow = evaluation.state;
    if (evaluation.activeTicket) {
      spot.currentVehiclePlate = evaluation.activeTicket.licensePlate;
    }

    if (evaluation.state === 'available') availableCount++;
    else if (evaluation.state === 'held') heldCount++;
    else if (evaluation.state === 'booked') bookedCount++;
    else if (evaluation.state === 'occupied') occupiedCount++;
    else if (evaluation.state === 'maintenance') maintenanceCount++;

    return spot;
  });

  return {
    settings,
    spots,
    summary: {
      total: spots.length,
      available: availableCount,
      held: heldCount,
      booked: bookedCount,
      occupied: occupiedCount,
      maintenance: maintenanceCount,
    },
  };
}

/**
 * Checks Golf booking sponsorship: returns whether the booking qualifies for free parking.
 */
export async function verifyGolfBookingSponsorship(
  tenant: string = DEFAULT_PARKING_TENANT,
  bookingId: string,
  expectedIn: number,
  expectedOut: number,
): Promise<{
  isValid: boolean;
  message: string;
  customerName?: string;
  customerPhone?: string;
  bookingRoom?: string;
  bookingStart?: number;
  bookingEnd?: number;
  isFullySponsored: boolean;
  freeHours: number;
}> {
  const cleanId = String(bookingId || '').trim();
  if (!cleanId) {
    return { isValid: false, message: 'Chưa nhập mã lịch chơi Golf', isFullySponsored: false, freeHours: 0 };
  }

  const booking = await db()
    .prepare('SELECT * FROM bookings WHERE tenant=? AND id=?')
    .bind(tenant, cleanId)
    .first<any>();

  if (!booking) {
    return { isValid: false, message: `Không tìm thấy lịch đặt Golf "${cleanId}" tại cơ sở này`, isFullySponsored: false, freeHours: 0 };
  }

  if (['cancelled', 'no_show'].includes(booking.status)) {
    return { isValid: false, message: 'Lịch đặt Golf này đã bị hủy', isFullySponsored: false, freeHours: 0 };
  }

  const settings = await ensureParkingInitialized(tenant);
  const freeHours = settings.golfFreeHours || 3;

  // Check if this booking has already exhausted its parking quota
  const existingParking = await db()
    .prepare(
      `SELECT COUNT(*) as count FROM parking_tickets 
       WHERE tenant=? AND golf_booking_id=? AND status IN ('holding', 'confirmed', 'active', 'completed')`
    )
    .bind(tenant, cleanId)
    .first<{ count: number }>();

  if ((existingParking?.count ?? 0) >= settings.golfSlotsPerBooking) {
    return {
      isValid: false,
      message: `Lịch chơi Golf này đã sử dụng hết quyền lợi miễn phí xe (${settings.golfSlotsPerBooking} xe/lịch)`,
      isFullySponsored: false,
      freeHours: 0,
    };
  }

  const durationHours = (expectedOut - expectedIn) / (3600 * 1000);
  const isFullySponsored = durationHours <= freeHours;

  return {
    isValid: true,
    message: isFullySponsored
      ? `GoPick tài trợ 100% thời gian đậu xe (${freeHours} giờ) cho khách chơi Golf!`
      : `GoPick tài trợ ${freeHours} giờ đầu, phần vượt giờ sẽ tính theo quy định.`,
    customerName: booking.customer,
    customerPhone: booking.phone,
    bookingRoom: booking.room,
    bookingStart: booking.start,
    bookingEnd: booking.end,
    isFullySponsored,
    freeHours,
  };
}

/**
 * Holds a spot with strict server-side concurrency checking.
 * Generates an idempotent ticket with a 5-minute hold timeout.
 */
export async function holdSpot(
  tenant: string = DEFAULT_PARKING_TENANT,
  input: HoldSpotInput,
  now: number = Date.now(),
): Promise<ParkingTicket> {
  const settings = await ensureParkingInitialized(tenant);

  const cleanCode = String(input.spotCode || '').trim().toUpperCase();
  const cleanPlate = String(input.licensePlate || '').trim().toUpperCase();

  if (!cleanCode) throw new Error('Vui lòng chọn ô đỗ xe');
  if (!cleanPlate) throw new Error('Vui lòng nhập biển số xe');
  if (input.expectedOut <= input.expectedIn) throw new Error('Thời gian ra phải sau thời gian vào');

  // Verify the spot exists and is active
  const spot = await db()
    .prepare('SELECT * FROM parking_spots WHERE tenant=? AND code=?')
    .bind(tenant, cleanCode)
    .first<any>();

  if (!spot || !spot.is_active || spot.status === 'maintenance') {
    throw new Error(`Ô đỗ ${cleanCode} hiện đang bảo trì hoặc không thể sử dụng`);
  }

  // ATOMIC CONFLICT CHECK:
  // Check for any overlapping tickets on this spot that are either confirmed, active, or currently held and not expired
  const overlapping = await db()
    .prepare(
      `SELECT * FROM parking_tickets
       WHERE tenant=? 
         AND spot_id=?
         AND status IN ('holding', 'confirmed', 'active')
         AND (
           status IN ('confirmed', 'active')
           OR (status = 'holding' AND hold_expires_at > ?)
         )`
    )
    .bind(tenant, spot.id, now)
    .all<any>();

  const tickets = overlapping.results.map(mapDbTicket);
  for (const t of tickets) {
    if (doesTicketConflict(t, input.expectedIn, input.expectedOut, settings.bufferMinutes, now)) {
      throw new Error(`Ô ${cleanCode} vừa có người giữ chỗ hoặc đã được đặt. Vui lòng chọn ô khác.`);
    }
  }

  // Verify golf sponsorship if attached
  let isGolfSponsored = false;
  let golfBookingId: string | null = null;
  if (input.golfBookingId) {
    const golfCheck = await verifyGolfBookingSponsorship(tenant, input.golfBookingId, input.expectedIn, input.expectedOut);
    if (golfCheck.isValid) {
      isGolfSponsored = true;
      golfBookingId = input.golfBookingId;
    }
  }

  const pricing = calculateParkingPricing({
    expectedIn: input.expectedIn,
    expectedOut: input.expectedOut,
    defaultHourlyRate: settings.defaultHourlyRate,
    golfFreeHours: settings.golfFreeHours,
    isGolfSponsored,
  });

  const holdDurationMs = (settings.holdTimeoutSeconds || 300) * 1000;
  const holdExpiresAt = now + holdDurationMs;
  const ticketId = `pkt-${tenant}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  
  // Random readable ticket code: PK-xxxx (e.g. PK-0186)
  const ticketNumber = Math.floor(1000 + Math.random() * 9000);
  const ticketCode = `PK-${ticketNumber}`;
  const accessToken = crypto.randomUUID();

  await db()
    .prepare(
      `INSERT INTO parking_tickets (
        id, ticket_code, tenant, spot_id, spot_code, section,
        customer_id, customer_name, customer_phone, license_plate, vehicle_type,
        expected_in, expected_out, status, source, golf_booking_id,
        base_amount, sponsored_amount, paid_amount, overtime_amount,
        total_amount, refund_amount, fee_payer, hold_expires_at,
        access_token, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, 'holding', ?, ?,
        ?, ?, 0, 0,
        ?, 0, ?, ?,
        ?, ?, ?
      )`
    )
    .bind(
      ticketId,
      ticketCode,
      tenant,
      spot.id,
      cleanCode,
      spot.section,
      input.customerPhone || '',
      input.customerName || 'Khách vãng lai',
      input.customerPhone || '',
      cleanPlate,
      input.vehicleType || 'car',
      input.expectedIn,
      input.expectedOut,
      input.source || 'web',
      golfBookingId,
      pricing.baseAmount,
      pricing.sponsoredAmount,
      pricing.baseAmount,
      pricing.feePayer,
      holdExpiresAt,
      accessToken,
      now,
      now,
    )
    .run();

  await audit(tenant, 'GIỮ_CHỖ_BÃI_XE', `Khách giữ ô ${cleanCode} biển số ${cleanPlate} mã vé ${ticketCode}`);

  return {
    id: ticketId,
    ticketCode,
    tenant,
    spotId: spot.id,
    spotCode: cleanCode,
    section: spot.section,
    customerId: input.customerPhone || '',
    customerName: input.customerName || 'Khách vãng lai',
    customerPhone: input.customerPhone || '',
    licensePlate: cleanPlate,
    vehicleType: input.vehicleType || 'car',
    expectedIn: input.expectedIn,
    expectedOut: input.expectedOut,
    actualIn: null,
    actualOut: null,
    checkinBy: '',
    checkoutBy: '',
    status: 'holding',
    source: input.source || 'web',
    golfBookingId,
    posBillId: null,
    baseAmount: pricing.baseAmount,
    sponsoredAmount: pricing.sponsoredAmount,
    paidAmount: 0,
    overtimeAmount: 0,
    totalAmount: pricing.baseAmount,
    refundAmount: 0,
    feePayer: pricing.feePayer,
    holdExpiresAt,
    accessToken,
    paymentMethod: '',
    paymentRef: '',
    paidAt: null,
    paperTicketNo: null,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Confirms a ticket either by 100% GoPick sponsorship (Khách trả 0 đ) or payment confirmation.
 */
export async function confirmTicket(
  tenant: string = DEFAULT_PARKING_TENANT,
  input: ConfirmTicketInput,
  now: number = Date.now(),
): Promise<ParkingTicket> {
  const codeOrId = (input.ticketCode || input.ticketId || '').trim();
  const ticket = await db()
    .prepare('SELECT * FROM parking_tickets WHERE tenant=? AND (ticket_code=? OR id=?)')
    .bind(tenant, codeOrId, codeOrId)
    .first<any>();

  if (!ticket) {
    throw new Error(`Không tìm thấy vé "${codeOrId}"`);
  }

  if (ticket.status === 'confirmed' || ticket.status === 'active' || ticket.status === 'completed') {
    return mapDbTicket(ticket);
  }

  if (ticket.status === 'cancelled') {
    throw new Error('Vé đậu xe này đã bị hủy');
  }

  // Check if hold has expired
  if (ticket.status === 'holding' && ticket.hold_expires_at <= now) {
    // Late payment handling:
    // Check if the spot is still free
    const settings = await ensureParkingInitialized(tenant);
    const conflicts = await db()
      .prepare(
        `SELECT * FROM parking_tickets 
         WHERE tenant=? AND spot_id=? AND id<>? AND status IN ('confirmed', 'active')`
      )
      .bind(tenant, ticket.spot_id, ticket.id)
      .all<any>();

    const conflicting = conflicts.results.some((c: any) =>
      doesTicketConflict(mapDbTicket(c), ticket.expected_in, ticket.expected_out, settings.bufferMinutes, now),
    );

    if (conflicting) {
      // Spot has been booked by someone else! Set to pending_review
      await db()
        .prepare("UPDATE parking_tickets SET status='pending_review', updated_at=? WHERE id=?")
        .bind(now, ticket.id)
        .run();
      throw new Error(
        'Thanh toán đến sau khi hết hạn giữ chỗ và ô đỗ đã có người khác đặt. Khoản tiền đã được chuyển sang "Đã nhận tiền - Cần xử lý" để quản lý hỗ trợ đổi ô hoặc hoàn tiền.',
      );
    }
  }

  const customerMustPay = Math.max(0, ticket.base_amount - ticket.sponsored_amount);
  const paidAmount = customerMustPay;
  const paymentMethod = input.paymentMethod || (customerMustPay === 0 ? 'gopick_sponsored' : 'vietqr');
  const paymentRef = input.paymentRef || (customerMustPay === 0 ? 'SPONSORED_FREE' : `PAY-${ticket.ticket_code}`);

  await db()
    .prepare(
      `UPDATE parking_tickets 
       SET status='confirmed', paid_amount=?, payment_method=?, payment_ref=?, paid_at=?, updated_at=?
       WHERE id=?`
    )
    .bind(paidAmount, paymentMethod, paymentRef, now, now, ticket.id)
    .run();

  // Record transaction ledger entry
  await db()
    .prepare(
      `INSERT INTO parking_transactions (
        id, tenant, ticket_id, ticket_code, shift_id, tx_type, method, amount, reference_code, note, recorded_by, created_at
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'system', ?)`
    )
    .bind(
      `tx-${ticket.id}-${now}`,
      tenant,
      ticket.id,
      ticket.ticket_code,
      customerMustPay === 0 ? 'sponsored_accrual' : 'online_payment',
      customerMustPay === 0 ? 'internal' : (paymentMethod as any),
      customerMustPay === 0 ? ticket.sponsored_amount : paidAmount,
      paymentRef,
      customerMustPay === 0 ? 'GoPick tài trợ 100%' : 'Thanh toán trực tuyến thành công',
      now,
    )
    .run();

  await audit(tenant, 'XÁC_NHẬN_VÉ_BÃI_XE', `Vé ${ticket.ticket_code} ô ${ticket.spot_code} đã được xác nhận.`);

  const updated = await db().prepare('SELECT * FROM parking_tickets WHERE id=?').bind(ticket.id).first<any>();
  return mapDbTicket(updated);
}

/**
 * Gate Guard check-in (Xe vào).
 * Idempotent: Scanning the same ticket twice will not record two check-ins.
 */
export async function gateCheckIn(
  tenant: string = DEFAULT_PARKING_TENANT,
  input: GateCheckInInput,
  now: number = Date.now(),
): Promise<ParkingTicket> {
  const cleanPlate = input.licensePlate ? input.licensePlate.replace(/[-\s.]/g, '').toUpperCase() : '';
  const query = input.ticketCode
    ? 'SELECT * FROM parking_tickets WHERE tenant=? AND ticket_code=?'
    : input.accessToken
    ? 'SELECT * FROM parking_tickets WHERE tenant=? AND access_token=?'
    : "SELECT * FROM parking_tickets WHERE tenant=? AND REPLACE(REPLACE(REPLACE(license_plate, '-', ''), '.', ''), ' ', '')=? AND status IN ('confirmed', 'active') ORDER BY expected_in DESC LIMIT 1";

  const param = input.ticketCode || input.accessToken || cleanPlate;
  const ticket = await db().prepare(query).bind(tenant, param).first<any>();

  if (!ticket) {
    throw new Error('Không tìm thấy thông tin vé phù hợp để cho xe vào');
  }

  // Idempotency: Quét cùng vé 2 lần
  if (ticket.status === 'active' && ticket.actual_in) {
    return mapDbTicket(ticket); // Already checked in, return cleanly
  }

  if (ticket.status === 'completed') {
    throw new Error(`Vé ${ticket.ticket_code} đã hoàn tất lượt gửi và xe đã ra bãi trước đó`);
  }

  if (ticket.status === 'cancelled') {
    throw new Error(`Vé ${ticket.ticket_code} đã bị hủy, không thể cho xe vào`);
  }

  await db()
    .prepare(
      `UPDATE parking_tickets 
       SET status='active', actual_in=?, checkin_by=?, updated_at=?
       WHERE id=?`
    )
    .bind(now, input.staffName || 'Bảo vệ', now, ticket.id)
    .run();

  await audit(tenant, 'XE_VÀO_CỔNG', `Cho xe ${ticket.license_plate} vào ô ${ticket.spot_code} (Vé: ${ticket.ticket_code})`);

  // WebPush notification to reception POS
  try {
    const isGolf = ticket.fee_payer === 'gopick_sponsored' || Boolean(ticket.golf_booking_id);
    const title = isGolf ? `🏌️ Khách Golf vào bãi: ${ticket.license_plate}` : `🚗 Xe vào cổng: ${ticket.license_plate}`;
    const body = `Khách: ${ticket.customer_name || 'Khách vãng lai'} — Ô: ${ticket.spot_code} (Vé: ${ticket.ticket_code})${isGolf ? ' • GoPick đài thọ đỗ xe' : ''}`;
    await pushToTenant(tenant, {
      title,
      body,
      url: '/quan-ly?view=parking',
      tag: `parking-gate-${ticket.ticket_code}`,
    });
  } catch (pushErr) {
    console.warn('WebPush to reception POS skipped:', pushErr);
  }

  const updated = await db().prepare('SELECT * FROM parking_tickets WHERE id=?').bind(ticket.id).first<any>();
  return mapDbTicket(updated);
}

/**
 * Gate Guard check-out (Xe ra).
 * Automatically calculates overtime fees, deducts previous payments/sponsorship, and records gate payment.
 */
export async function gateCheckOut(
  tenant: string = DEFAULT_PARKING_TENANT,
  input: GateCheckOutInput,
  now: number = Date.now(),
): Promise<{ ticket: ParkingTicket; surchargeDue: number }> {
  const cleanPlate = input.licensePlate ? input.licensePlate.replace(/[-\s.]/g, '').toUpperCase() : '';
  const query = input.ticketCode
    ? 'SELECT * FROM parking_tickets WHERE tenant=? AND ticket_code=?'
    : input.accessToken
    ? 'SELECT * FROM parking_tickets WHERE tenant=? AND access_token=?'
    : "SELECT * FROM parking_tickets WHERE tenant=? AND REPLACE(REPLACE(REPLACE(license_plate, '-', ''), '.', ''), ' ', '')=? AND status='active' ORDER BY actual_in DESC LIMIT 1";

  const param = input.ticketCode || input.accessToken || cleanPlate;
  const ticket = await db().prepare(query).bind(tenant, param).first<any>();

  if (!ticket) {
    throw new Error('Không tìm thấy xe đang trong bãi phù hợp để cho ra');
  }

  if (ticket.status === 'completed') {
    return { ticket: mapDbTicket(ticket), surchargeDue: 0 };
  }

  const settings = await ensureParkingInitialized(tenant);
  const otRate = settings.overtimeRatePerHour || 30000;

  // Check overtime surcharge (with 15 mins grace period)
  let overtimeAmount = 0;
  if (now > ticket.expected_out + 15 * 60 * 1000) {
    const extraHours = Math.ceil((now - ticket.expected_out) / (3600 * 1000));
    overtimeAmount = extraHours * otRate;
  }

  const newTotal = ticket.base_amount + overtimeAmount;
  const alreadyPaid = (ticket.paid_amount || 0) + (ticket.sponsored_amount || 0);
  const surchargeDue = Math.max(0, newTotal - alreadyPaid);

  await db()
    .prepare(
      `UPDATE parking_tickets 
       SET status='completed', actual_out=?, checkout_by=?, overtime_amount=?, total_amount=?,
           paid_amount=paid_amount + ?, updated_at=?
       WHERE id=?`
    )
    .bind(now, input.staffName || 'Bảo vệ', overtimeAmount, newTotal, surchargeDue, now, ticket.id)
    .run();

  if (surchargeDue > 0) {
    await db()
      .prepare(
        `INSERT INTO parking_transactions (
          id, tenant, ticket_id, ticket_code, shift_id, tx_type, method, amount, reference_code, note, recorded_by, created_at
        ) VALUES (?, ?, ?, ?, NULL, 'surcharge', ?, ?, ?, 'Thu phụ thu quá giờ tại cổng', ?, ?)`
      )
      .bind(
        `tx-ot-${ticket.id}-${now}`,
        tenant,
        ticket.id,
        ticket.ticket_code,
        input.paymentMethod || 'cash',
        surchargeDue,
        `GATE-OT-${ticket.ticket_code}`,
        input.staffName || 'Bảo vệ',
        now,
      )
      .run();
  }

  await audit(tenant, 'XE_RA_CỔNG', `Cho xe ${ticket.license_plate} ra khỏi ô ${ticket.spot_code}. Phụ thu: ${surchargeDue} đ`);

  const updated = await db().prepare('SELECT * FROM parking_tickets WHERE id=?').bind(ticket.id).first<any>();
  return { ticket: mapDbTicket(updated), surchargeDue };
}

/**
 * Creates a walk-in paper ticket directly at the gate.
 */
export async function createGatePaperTicket(
  tenant: string = DEFAULT_PARKING_TENANT,
  input: CreatePaperTicketInput,
  now: number = Date.now(),
): Promise<ParkingTicket> {
  const settings = await ensureParkingInitialized(tenant);
  const cleanPlate = String(input.licensePlate || '').trim().toUpperCase();
  if (!cleanPlate) throw new Error('Vui lòng nhập biển số xe');

  const expectedOut = input.expectedOut || (now + 2 * 3600 * 1000);

  let spotCode = input.spotCode;
  if (!spotCode) {
    // Automatically find the first available spot
    const grid = await getSpotGrid(tenant, now, expectedOut, 'now', now);
    const freeSpot = grid.spots.find((s) => s.stateForWindow === 'available');
    if (!freeSpot) throw new Error('Bãi xe đã hết chỗ trống cho xe vãng lai');
    spotCode = freeSpot.code;
  }

  const spot = await db()
    .prepare('SELECT * FROM parking_spots WHERE tenant=? AND code=?')
    .bind(tenant, spotCode)
    .first<any>();

  if (!spot) throw new Error(`Không tìm thấy ô đỗ ${spotCode}`);

  const pricing = calculateParkingPricing({
    expectedIn: now,
    expectedOut,
    defaultHourlyRate: settings.defaultHourlyRate,
  });

  const ticketId = `pkt-paper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ticketNumber = Math.floor(1000 + Math.random() * 9000);
  const ticketCode = `PK-${ticketNumber}`;
  const accessToken = crypto.randomUUID();

  await db()
    .prepare(
      `INSERT INTO parking_tickets (
        id, ticket_code, tenant, spot_id, spot_code, section,
        customer_id, customer_name, customer_phone, license_plate, vehicle_type,
        expected_in, expected_out, actual_in, checkin_by, status, source,
        base_amount, sponsored_amount, paid_amount, overtime_amount, total_amount,
        fee_payer, hold_expires_at, access_token, paper_ticket_no, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        '', 'Khách vé giấy', '', ?, 'car',
        ?, ?, ?, ?, 'active', 'gate_paper',
        ?, 0, 0, 0, ?,
        'customer', ?, ?, ?, ?, ?
      )`
    )
    .bind(
      ticketId,
      ticketCode,
      tenant,
      spot.id,
      spot.code,
      spot.section,
      cleanPlate,
      now,
      expectedOut,
      now,
      input.staffName || 'Bảo vệ',
      pricing.baseAmount,
      pricing.baseAmount,
      now + 86400000,
      accessToken,
      input.paperTicketNo || ticketCode,
      now,
      now,
    )
    .run();

  await audit(tenant, 'TẠO_VÉ_GIẤY_CỔNG', `Bảo vệ tạo vé giấy ${ticketCode} cho xe ${cleanPlate} vào ô ${spot.code}`);

  const row = await db().prepare('SELECT * FROM parking_tickets WHERE id=?').bind(ticketId).first<any>();
  return mapDbTicket(row);
}

/**
 * Changes spot for an existing ticket with atomic collision checking.
 * Both client and admin screens use this exact method to prevent double bookings.
 */
export async function changeTicketSpot(
  tenant: string = DEFAULT_PARKING_TENANT,
  input: ChangeSpotInput,
  now: number = Date.now(),
): Promise<ParkingTicket> {
  const ticketCode = (input.ticketCode || '').trim();
  const targetCode = (input.newSpotCode || '').trim().toUpperCase();

  const ticket = await db()
    .prepare('SELECT * FROM parking_tickets WHERE tenant=? AND ticket_code=?')
    .bind(tenant, ticketCode)
    .first<any>();

  if (!ticket) {
    throw new Error(`Không tìm thấy vé đậu xe "${ticketCode}"`);
  }

  if (['completed', 'cancelled'].includes(ticket.status)) {
    throw new Error('Không thể đổi ô cho vé đã hoàn thành hoặc đã hủy');
  }

  if (ticket.spot_code === targetCode) {
    return mapDbTicket(ticket);
  }

  const targetSpot = await db()
    .prepare('SELECT * FROM parking_spots WHERE tenant=? AND code=?')
    .bind(tenant, targetCode)
    .first<any>();

  if (!targetSpot || !targetSpot.is_active) {
    throw new Error(`Ô đỗ ${targetCode} không tồn tại hoặc đã ngừng hoạt động`);
  }

  if (targetSpot.status === 'maintenance') {
    throw new Error(`Ô đỗ ${targetCode} đang trong thời gian bảo trì`);
  }

  const settings = await ensureParkingInitialized(tenant);

  // Check for any conflicting ticket on targetSpot in ticket's time window
  const overlapping = await db()
    .prepare(
      `SELECT * FROM parking_tickets 
       WHERE tenant=? 
         AND spot_id=? 
         AND id<>?
         AND status IN ('holding', 'confirmed', 'active')
         AND (
           status IN ('confirmed', 'active')
           OR (status = 'holding' AND hold_expires_at > ?)
         )`
    )
    .bind(tenant, targetSpot.id, ticket.id, now)
    .all<any>();

  const mappedOverlaps = overlapping.results.map(mapDbTicket);
  for (const ot of mappedOverlaps) {
    if (doesTicketConflict(ot, ticket.expected_in, ticket.expected_out, settings.bufferMinutes, now)) {
      throw new Error(`Ô ${targetCode} đã có xe giữ hoặc đặt trước trong khung giờ này. Vui lòng chọn ô khác.`);
    }
  }

  // Update ticket spot atomically
  await db()
    .prepare(
      `UPDATE parking_tickets 
       SET spot_id=?, spot_code=?, section=?, updated_at=? 
       WHERE id=?`
    )
    .bind(targetSpot.id, targetSpot.code, targetSpot.section, now, ticket.id)
    .run();

  await audit(
    tenant,
    'ĐỔI_Ô_ĐỖ',
    `Đổi ô vé ${ticketCode} của xe ${ticket.license_plate} từ ${ticket.spot_code} sang ${targetCode} bởi ${input.staffName || 'Quản lý'}`,
  );

  const updatedTicket = await db()
    .prepare('SELECT * FROM parking_tickets WHERE id=?')
    .bind(ticket.id)
    .first<any>();

  return mapDbTicket(updatedTicket);
}

/**
 * Extends the duration of an existing parking ticket.
 * Atomic collision checking prevents double booking the spot during extended time.
 */
export async function extendParkingTicket(
  tenant: string = DEFAULT_PARKING_TENANT,
  input: ExtendParkingTicketInput,
  now: number = Date.now(),
): Promise<ParkingTicket> {
  const extraMinutes = Math.max(15, Number(input.extraMinutes) || 60);
  const ticketCode = (input.ticketCode || '').trim();
  const accessToken = (input.accessToken || '').trim();

  let query = 'SELECT * FROM parking_tickets WHERE tenant=? AND (ticket_code=? OR access_token=?)';
  const ticket = await db().prepare(query).bind(tenant, ticketCode, accessToken).first<any>();

  if (!ticket) {
    throw new Error('Không tìm thấy thông tin vé đỗ xe để gia hạn');
  }

  if (['completed', 'cancelled'].includes(ticket.status)) {
    throw new Error(`Không thể gia hạn vé có trạng thái "${ticket.status}"`);
  }

  const settings = await ensureParkingInitialized(tenant);
  const newExpectedOut = ticket.expected_out + extraMinutes * 60 * 1000;

  // Collision checking on target spot
  const overlapping = await db()
    .prepare(
      `SELECT * FROM parking_tickets
       WHERE tenant=?
         AND spot_id=?
         AND id<>?
         AND status IN ('holding', 'confirmed', 'active')
         AND (
           status IN ('confirmed', 'active')
           OR (status = 'holding' AND hold_expires_at > ?)
         )`
    )
    .bind(tenant, ticket.spot_id, ticket.id, now)
    .all<any>();

  const mappedOverlaps = overlapping.results.map(mapDbTicket);
  for (const ot of mappedOverlaps) {
    if (doesTicketConflict(ot, ticket.expected_in, newExpectedOut, settings.bufferMinutes, now)) {
      const nextTime = new Date(ot.expectedIn).toTimeString().slice(0, 5);
      throw new Error(
        `Ô ${ticket.spot_code} đã có lượt khách tiếp theo đặt lúc ${nextTime}. Quý khách vui lòng liên hệ lễ tân/quản lý để đổi ô khác trước khi gia hạn.`
      );
    }
  }

  // Calculate pricing for extra time
  let extraCharge = 0;
  let extraSponsored = 0;

  if (ticket.golf_booking_id && ticket.fee_payer === 'gopick_sponsored') {
    const totalHours = (newExpectedOut - ticket.expected_in) / (3600 * 1000);
    if (totalHours <= settings.golfFreeHours) {
      extraSponsored = 0;
      extraCharge = 0;
    } else {
      const extraHours = Math.ceil(extraMinutes / 60);
      extraCharge = extraHours * (settings.defaultHourlyRate || 20000);
    }
  } else {
    const extraHours = Math.ceil(extraMinutes / 60);
    extraCharge = extraHours * (settings.defaultHourlyRate || 20000);
  }

  await db()
    .prepare(
      `UPDATE parking_tickets
       SET expected_out=?,
           total_amount=total_amount + ?,
           paid_amount=paid_amount + ?,
           sponsored_amount=sponsored_amount + ?,
           updated_at=?
       WHERE id=?`
    )
    .bind(
      newExpectedOut,
      extraCharge + extraSponsored,
      extraCharge,
      extraSponsored,
      now,
      ticket.id,
    )
    .run();

  if (extraCharge > 0) {
    await db()
      .prepare(
        `INSERT INTO parking_transactions (
          id, tenant, ticket_id, ticket_code, shift_id, tx_type, method, amount, reference_code, note, recorded_by, created_at
        ) VALUES (?, ?, ?, ?, NULL, 'online_payment', ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `tx-ext-${ticket.id}-${now}`,
        tenant,
        ticket.id,
        ticket.ticket_code,
        input.paymentMethod || 'vietqr',
        extraCharge,
        input.paymentRef || `EXT-${ticket.ticket_code}`,
        `Gia hạn thêm ${Math.round(extraMinutes / 60)} giờ`,
        input.staffName || 'Khách hàng',
        now,
      )
      .run();
  }

  await audit(
    tenant,
    'GIA_HẠN_ĐỖ_XE',
    `Gia hạn thêm ${extraMinutes} phút cho xe ${ticket.license_plate} (Vé ${ticket.ticket_code}). Phí thêm: ${extraCharge} đ`,
  );

  try {
    await pushToTenant(tenant, {
      title: `🕒 Gia hạn đỗ xe: ${ticket.license_plate}`,
      body: `Ô ${ticket.spot_code} vừa gia hạn thêm ${Math.round(extraMinutes / 60)} giờ (Đến ${new Date(newExpectedOut).toTimeString().slice(0, 5)})`,
      url: '/quan-ly?view=parking',
      tag: `parking-ext-${ticket.ticket_code}`,
    });
  } catch (pushErr) {
    console.warn('WebPush to reception POS skipped:', pushErr);
  }

  const updated = await db().prepare('SELECT * FROM parking_tickets WHERE id=?').bind(ticket.id).first<any>();
  return mapDbTicket(updated);
}

/**
 * End-of-shift reconciliation: accurately segregates online, gate cash, gate transfer, refunds, and GoPick sponsored.
 * Timestamps strictly adhere to transaction time rather than car checkout time.
 */
export async function getShiftReconciliation(
  tenant: string = DEFAULT_PARKING_TENANT,
  dateStr?: string,
  now: number = Date.now(),
): Promise<ShiftReconciliationSummary> {
  const targetDate = dateStr || new Date(now).toISOString().slice(0, 10);
  const startOfDay = new Date(`${targetDate}T00:00:00.000Z`).getTime();
  const endOfDay = new Date(`${targetDate}T23:59:59.999Z`).getTime();

  const txs = (
    await db()
      .prepare('SELECT * FROM parking_transactions WHERE tenant=? AND created_at>=? AND created_at<=? ORDER BY created_at DESC')
      .bind(tenant, startOfDay, endOfDay)
      .all<any>()
  ).results;

  let onlineAmount = 0;
  let gateCash = 0;
  let gateTransfer = 0;
  let refundAmount = 0;
  let sponsoredAmount = 0;

  for (const tx of txs) {
    if (tx.tx_type === 'online_payment') {
      onlineAmount += tx.amount;
    } else if (tx.tx_type === 'gate_payment' || tx.tx_type === 'surcharge') {
      if (tx.method === 'cash') gateCash += tx.amount;
      else gateTransfer += tx.amount;
    } else if (tx.tx_type === 'refund') {
      refundAmount += tx.amount;
    } else if (tx.tx_type === 'sponsored_accrual') {
      sponsoredAmount += tx.amount;
    }
  }

  const gateAmount = gateCash + gateTransfer;
  const netCollected = gateCash - refundAmount; // Cash on hand that security/staff must submit

  // Active cars in lot currently
  const activeCount = await db()
    .prepare("SELECT COUNT(*) as cnt FROM parking_tickets WHERE tenant=? AND status='active'")
    .bind(tenant)
    .first<{ cnt: number }>();

  // Fetch recent shifts history
  const shiftList = (
    await db()
      .prepare('SELECT * FROM parking_shifts WHERE tenant=? ORDER BY created_at DESC LIMIT 10')
      .bind(tenant)
      .all<any>()
      .catch(() => ({ results: [] }))
  ).results;

  const mappedTxs: ParkingTransaction[] = txs.map((tx: any) => ({
    id: tx.id,
    tenant: tx.tenant,
    ticketId: tx.ticket_id,
    ticketCode: tx.ticket_code,
    shiftId: tx.shift_id,
    txType: tx.tx_type,
    method: tx.method,
    amount: tx.amount,
    referenceCode: tx.reference_code || '',
    note: tx.note || '',
    recordedBy: tx.recorded_by || '',
    createdAt: tx.created_at,
  }));

  return {
    dateStr: targetDate,
    onlineAmount,
    gateAmount,
    refundAmount,
    netCollected,
    sponsoredAmount,
    gateCash,
    gateTransfer,
    transactionsCount: txs.length,
    ticketsCount: txs.length,
    activeCarsInLot: activeCount?.cnt ?? 0,
    transactions: mappedTxs,
    shiftsHistory: shiftList,
  };
}

/**
 * Closes shift with counted cash balance.
 * Implements idempotency to prevent duplicate shift logs on double click or network retry.
 */
export async function closeShift(
  tenant: string = DEFAULT_PARKING_TENANT,
  params: { staffId?: string; staffName?: string; cashSubmitted: number; notes?: string },
  now: number = Date.now(),
): Promise<ShiftReconciliationSummary & { shiftId: string }> {
  const staffId = params.staffId || 'staff-default';
  const staffName = params.staffName || 'Nhân viên trực ca';

  // 1. Idempotency check: prevent duplicate shift creation within 60 seconds
  const recentShift = await db()
    .prepare(
      `SELECT * FROM parking_shifts 
       WHERE tenant=? AND staff_id=? AND created_at > ? AND cash_submitted=?
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(tenant, staffId, now - 60000, params.cashSubmitted)
    .first<any>();

  if (recentShift) {
    console.log(`[Shift Close Idempotency] Existing shift found: ${recentShift.id}`);
    const currentRecon = await getShiftReconciliation(tenant, undefined, now);
    return { ...currentRecon, shiftId: recentShift.id };
  }

  const recon = await getShiftReconciliation(tenant, undefined, now);
  const shiftId = `shift-${tenant}-${now}`;
  const cashDiff = params.cashSubmitted - recon.gateCash;

  await db()
    .prepare(
      `INSERT INTO parking_shifts (
        id, tenant, staff_id, staff_name, opened_at, closed_at, status,
        online_total, gate_cash_total, gate_transfer_total, refund_total,
        net_collected, sponsored_total, cash_submitted, cash_diff, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'closed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      shiftId,
      tenant,
      staffId,
      staffName,
      now - 8 * 3600 * 1000,
      now,
      recon.onlineAmount,
      recon.gateCash,
      recon.gateTransfer,
      recon.refundAmount,
      recon.netCollected,
      recon.sponsoredAmount,
      params.cashSubmitted,
      cashDiff,
      params.notes || '',
      now,
    )
    .run();

  // 2. Associate all unclosed transactions with this shift
  await db()
    .prepare(
      `UPDATE parking_transactions 
       SET shift_id=? 
       WHERE tenant=? AND (shift_id IS NULL OR shift_id='') AND created_at <= ?`
    )
    .bind(shiftId, tenant, now)
    .run();

  await audit(tenant, 'CHỐT_CA_BÃI_XE', `Nhân viên ${staffName} chốt ca ${shiftId}. Tiền mặt bàn giao: ${params.cashSubmitted} đ (Chênh lệch: ${cashDiff} đ)`);

  return { ...recon, shiftId };
}

/**
 * Updates parking facility configuration.
 */
export async function updateParkingSettings(
  tenant: string = DEFAULT_PARKING_TENANT,
  input: Partial<ParkingSettings>,
  staffName?: string,
): Promise<ParkingSettings> {
  const current = await ensureParkingInitialized(tenant);
  const now = Date.now();

  const isEnabled = input.isEnabled !== undefined ? (input.isEnabled ? 1 : 0) : (current.isEnabled ? 1 : 0);
  const facilityName = (input.facilityName ?? current.facilityName).trim() || 'Bãi xe GoPick';
  const address = (input.address ?? current.address).trim();
  const directionsUrl = (input.directionsUrl ?? current.directionsUrl).trim();
  const defaultHourlyRate = Number(input.defaultHourlyRate) >= 0 ? Number(input.defaultHourlyRate) : current.defaultHourlyRate;
  const bufferMinutes = Number(input.bufferMinutes) >= 0 ? Number(input.bufferMinutes) : current.bufferMinutes;
  const holdTimeoutSeconds = Number(input.holdTimeoutSeconds) > 0 ? Number(input.holdTimeoutSeconds) : current.holdTimeoutSeconds;
  const golfFreeHours = Number(input.golfFreeHours) >= 0 ? Number(input.golfFreeHours) : current.golfFreeHours;
  const golfSlotsPerBooking = Number(input.golfSlotsPerBooking) > 0 ? Number(input.golfSlotsPerBooking) : current.golfSlotsPerBooking;
  const overtimeRatePerHour = Number(input.overtimeRatePerHour) >= 0 ? Number(input.overtimeRatePerHour) : current.overtimeRatePerHour;
  const allowPaperTickets = input.allowPaperTickets !== undefined ? (input.allowPaperTickets ? 1 : 0) : (current.allowPaperTickets ? 1 : 0);

  await db()
    .prepare(
      `UPDATE parking_settings SET
        is_enabled=?,
        facility_name=?,
        address=?,
        directions_url=?,
        default_hourly_rate=?,
        buffer_minutes=?,
        hold_timeout_seconds=?,
        golf_free_hours=?,
        golf_slots_per_booking=?,
        overtime_rate_per_hour=?,
        allow_paper_tickets=?,
        updated_at=?
      WHERE tenant=?`
    )
    .bind(
      isEnabled,
      facilityName,
      address,
      directionsUrl,
      defaultHourlyRate,
      bufferMinutes,
      holdTimeoutSeconds,
      golfFreeHours,
      golfSlotsPerBooking,
      overtimeRatePerHour,
      allowPaperTickets,
      now,
      tenant,
    )
    .run();

  await audit(
    tenant,
    'CẬP_NHẬT_CÀI_ĐẶT_BÃI_XE',
    `${staffName || 'Quản lý'} cập nhật cấu hình bãi xe ${facilityName} (Giá: ${defaultHourlyRate}đ, Quá giờ: ${overtimeRatePerHour}đ, Miễn phí Golf: ${golfFreeHours}h, Vé giấy: ${allowPaperTickets ? 'Bật' : 'Tắt'})`
  );

  return ensureParkingInitialized(tenant);
}

/**
 * Saves (creates or updates) a parking spot.
 */
export async function saveParkingSpot(
  tenant: string = DEFAULT_PARKING_TENANT,
  input: {
    code: string;
    section: string;
    spotType?: string;
    rowIndex?: number;
    colIndex?: number;
    isActive?: boolean;
    status?: string;
    sortOrder?: number;
  },
  staffName?: string,
): Promise<any> {
  const code = (input.code || '').trim().toUpperCase();
  if (!code) throw new Error('Vui lòng nhập mã ô đỗ');
  const section = (input.section || 'Dãy chung').trim();
  const spotType = input.spotType || 'car';
  const rowIndex = Number(input.rowIndex) || 1;
  const colIndex = Number(input.colIndex) || 1;
  const isActive = input.isActive !== false ? 1 : 0;
  const status = input.status === 'maintenance' ? 'maintenance' : 'active';
  const sortOrder = Number(input.sortOrder) || (rowIndex * 100 + colIndex);

  const existing = await db()
    .prepare('SELECT id FROM parking_spots WHERE tenant=? AND code=?')
    .bind(tenant, code)
    .first<any>();

  if (existing) {
    await db()
      .prepare(
        `UPDATE parking_spots SET
          section=?,
          spot_type=?,
          row_index=?,
          col_index=?,
          is_active=?,
          status=?,
          sort_order=?
        WHERE tenant=? AND code=?`
      )
      .bind(section, spotType, rowIndex, colIndex, isActive, status, sortOrder, tenant, code)
      .run();

    await audit(tenant, 'CẬP_NHẬT_Ô_ĐỖ', `${staffName || 'Quản lý'} cập nhật ô ${code} (${section}, Hàng ${rowIndex}, Cột ${colIndex}, ${status})`);
  } else {
    const spotId = `spot-${tenant}-${code}`;
    await db()
      .prepare(
        `INSERT INTO parking_spots (
          id, tenant, code, section, spot_type, row_index, col_index, is_active, status, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(spotId, tenant, code, section, spotType, rowIndex, colIndex, isActive, status, sortOrder)
      .run();

    await audit(tenant, 'THÊM_Ô_ĐỖ', `${staffName || 'Quản lý'} thêm mới ô ${code} (${section})`);
  }

  return { ok: true, code, section, spotType, rowIndex, colIndex, isActive, status };
}

/**
 * Deactivates or removes a parking spot if no active tickets exist.
 */
export async function deleteParkingSpot(
  tenant: string = DEFAULT_PARKING_TENANT,
  code: string,
  staffName?: string,
): Promise<{ code: string; status: string; isActive: boolean }> {
  const cleanCode = (code || '').trim().toUpperCase();
  const activeTickets = await db()
    .prepare(
      `SELECT COUNT(*) as count FROM parking_tickets 
       WHERE tenant=? AND spot_code=? AND status IN ('holding', 'confirmed', 'active')`
    )
    .bind(tenant, cleanCode)
    .first<{ count: number }>();

  if ((activeTickets?.count ?? 0) > 0) {
    throw new Error(`Ô ${cleanCode} đang có ${activeTickets?.count} vé hiệu lực. Không thể xóa ô này.`);
  }

  await db()
    .prepare('UPDATE parking_spots SET is_active=0, status=? WHERE tenant=? AND code=?')
    .bind('maintenance', tenant, cleanCode)
    .run();

  await audit(tenant, 'XÓA_Ô_ĐỖ', `${staffName || 'Quản lý'} đã ngừng hoạt động ô ${cleanCode}`);

  return { code: cleanCode, status: 'maintenance', isActive: false };
}

/**
 * Internal mapper for parking ticket row.
 */
function mapDbTicket(r: any): ParkingTicket {
  return {
    id: r.id,
    ticketCode: r.ticket_code,
    tenant: r.tenant,
    spotId: r.spot_id,
    spotCode: r.spot_code,
    section: r.section,
    customerId: r.customer_id || '',
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    licensePlate: r.license_plate,
    vehicleType: r.vehicle_type || 'car',
    expectedIn: r.expected_in,
    expectedOut: r.expected_out,
    actualIn: r.actual_in ?? null,
    actualOut: r.actual_out ?? null,
    checkinBy: r.checkin_by || '',
    checkoutBy: r.checkout_by || '',
    status: r.status,
    source: r.source || 'web',
    golfBookingId: r.golf_booking_id ?? null,
    posBillId: r.pos_bill_id ?? null,
    baseAmount: r.base_amount || 0,
    sponsoredAmount: r.sponsored_amount || 0,
    paidAmount: r.paid_amount || 0,
    overtimeAmount: r.overtime_amount || 0,
    totalAmount: r.total_amount || 0,
    customerAmount: Math.max(0, (r.total_amount || 0) - (r.sponsored_amount || 0)),
    isGolfSponsored: r.fee_payer === 'gopick_sponsored' || Boolean(r.sponsored_amount > 0),
    refundAmount: r.refund_amount || 0,
    feePayer: r.fee_payer || 'customer',
    holdExpiresAt: r.hold_expires_at,
    accessToken: r.access_token,
    paymentMethod: r.payment_method || '',
    paymentRef: r.payment_ref || '',
    paidAt: r.paid_at ?? null,
    paperTicketNo: r.paper_ticket_no ?? null,
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
