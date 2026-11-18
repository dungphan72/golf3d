import { getAuth } from '../../auth-session';
import { can } from '../../../lib/auth/permissions';
import { db, audit } from '../../../lib/server/common';
import {
  DEFAULT_PARKING_TENANT,
  ensureParkingInitialized,
  getSpotGrid,
  verifyGolfBookingSponsorship,
  holdSpot,
  confirmTicket,
  gateCheckIn,
  gateCheckOut,
  createGatePaperTicket,
  getShiftReconciliation,
  closeShift,
} from '../../../modules/parking/server/parking-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'spots';
  const tenantParam = url.searchParams.get('tenant') || DEFAULT_PARKING_TENANT;

  const auth = await getAuth();
  const tenant = auth?.tenant || tenantParam;

  try {
    if (action === 'config') {
      const config = await ensureParkingInitialized(tenant);
      return Response.json({ ok: true, config });
    }

    if (action === 'spots') {
      const expectedIn = Number(url.searchParams.get('in')) || Date.now();
      const expectedOut = Number(url.searchParams.get('out')) || expectedIn + 2.5 * 3600 * 1000;
      const mode = (url.searchParams.get('mode') as 'now' | 'slot') || 'slot';

      const data = await getSpotGrid(tenant, expectedIn, expectedOut, mode);
      return Response.json({ ok: true, ...data });
    }

    if (action === 'ticket') {
      const code = url.searchParams.get('code');
      const token = url.searchParams.get('token');

      if (!code && !token) {
        return Response.json({ error: 'Cần mã vé hoặc token truy cập' }, { status: 400 });
      }

      const query = code
        ? 'SELECT * FROM parking_tickets WHERE ticket_code=?'
        : 'SELECT * FROM parking_tickets WHERE access_token=?';

      const param = code || token;
      const row = await db().prepare(query).bind(param).first<any>();

      if (!row) {
        return Response.json({ error: 'Không tìm thấy vé đậu xe' }, { status: 404 });
      }

      return Response.json({
        ok: true,
        ticket: {
          id: row.id,
          ticketCode: row.ticket_code,
          tenant: row.tenant,
          spotId: row.spot_id,
          spotCode: row.spot_code,
          section: row.section,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          licensePlate: row.license_plate,
          vehicleType: row.vehicle_type,
          expectedIn: row.expected_in,
          expectedOut: row.expected_out,
          actualIn: row.actual_in,
          actualOut: row.actual_out,
          status: row.status,
          source: row.source,
          golfBookingId: row.golf_booking_id,
          baseAmount: row.base_amount,
          sponsoredAmount: row.sponsored_amount,
          paidAmount: row.paid_amount,
          overtimeAmount: row.overtime_amount,
          totalAmount: row.total_amount,
          feePayer: row.fee_payer,
          holdExpiresAt: row.hold_expires_at,
          accessToken: row.access_token,
          paymentMethod: row.payment_method,
          paymentRef: row.payment_ref,
          paidAt: row.paid_at,
          notes: row.notes,
        },
      });
    }

    if (action === 'tickets-list') {
      // Operator view for booking schedule
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const status = url.searchParams.get('status') || 'all';
      const dateStr = url.searchParams.get('date');

      let sql = 'SELECT * FROM parking_tickets WHERE tenant=?';
      const params: any[] = [tenant];

      if (status !== 'all') {
        sql += ' AND status=?';
        params.push(status);
      }

      if (dateStr) {
        const start = new Date(`${dateStr}T00:00:00.000Z`).getTime();
        const end = new Date(`${dateStr}T23:59:59.999Z`).getTime();
        sql += ' AND expected_in>=? AND expected_in<=?';
        params.push(start, end);
      }

      sql += ' ORDER BY expected_in DESC LIMIT 100';

      const results = (await db().prepare(sql).bind(...params).all<any>()).results;

      const filtered = q
        ? results.filter((r) =>
            `${r.ticket_code} ${r.license_plate} ${r.customer_name} ${r.customer_phone} ${r.spot_code}`
              .toLowerCase()
              .includes(q),
          )
        : results;

      return Response.json({
        ok: true,
        tickets: filtered.map((r) => ({
          id: r.id,
          ticketCode: r.ticket_code,
          spotCode: r.spot_code,
          section: r.section,
          licensePlate: r.license_plate,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          expectedIn: r.expected_in,
          expectedOut: r.expected_out,
          actualIn: r.actual_in,
          actualOut: r.actual_out,
          status: r.status,
          paidAmount: r.paid_amount,
          sponsoredAmount: r.sponsored_amount,
          totalAmount: r.total_amount,
          feePayer: r.fee_payer,
          paymentMethod: r.payment_method,
          source: r.source,
          golfBookingId: r.golf_booking_id,
          accessToken: r.access_token,
        })),
      });
    }

    if (action === 'reconciliation') {
      const dateStr = url.searchParams.get('date') || undefined;
      const data = await getShiftReconciliation(tenant, dateStr);
      return Response.json({ ok: true, report: data });
    }

    return Response.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Lỗi xử lý yêu cầu bãi xe' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Payload không hợp lệ' }, { status: 400 });
  }

  const auth = await getAuth();
  const tenant = auth?.tenant || body.tenant || DEFAULT_PARKING_TENANT;
  const action = body.action || '';

  try {
    if (action === 'verify-golf') {
      const res = await verifyGolfBookingSponsorship(
        tenant,
        body.bookingId,
        Number(body.expectedIn) || Date.now(),
        Number(body.expectedOut) || Date.now() + 2.5 * 3600 * 1000,
      );
      return Response.json({ ok: true, ...res });
    }

    if (action === 'hold') {
      const ticket = await holdSpot(tenant, {
        spotCode: body.spotCode,
        licensePlate: body.licensePlate,
        expectedIn: Number(body.expectedIn),
        expectedOut: Number(body.expectedOut),
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        golfBookingId: body.golfBookingId,
        vehicleType: body.vehicleType,
        source: body.source,
      });
      return Response.json({ ok: true, ticket });
    }

    if (action === 'confirm') {
      const ticket = await confirmTicket(tenant, {
        ticketCode: body.ticketCode,
        accessToken: body.accessToken,
        paymentMethod: body.paymentMethod,
        paymentRef: body.paymentRef,
      });
      return Response.json({ ok: true, ticket });
    }

    if (action === 'gate-checkin') {
      const staffName = auth?.name || body.staffName || 'Bảo vệ cổng';
      const ticket = await gateCheckIn(tenant, {
        ticketCode: body.ticketCode,
        licensePlate: body.licensePlate,
        accessToken: body.accessToken,
        staffName,
      });
      return Response.json({ ok: true, ticket });
    }

    if (action === 'gate-checkout') {
      const staffName = auth?.name || body.staffName || 'Bảo vệ cổng';
      const result = await gateCheckOut(tenant, {
        ticketCode: body.ticketCode,
        licensePlate: body.licensePlate,
        accessToken: body.accessToken,
        paymentMethod: body.paymentMethod,
        staffName,
      });
      return Response.json({ ok: true, ...result });
    }

    if (action === 'gate-paper-ticket') {
      const staffName = auth?.name || body.staffName || 'Bảo vệ cổng';
      const ticket = await createGatePaperTicket(tenant, {
        spotCode: body.spotCode,
        licensePlate: body.licensePlate,
        expectedOut: Number(body.expectedOut) || Date.now() + 3 * 3600 * 1000,
        paperTicketNo: body.paperTicketNo,
        golfBookingId: body.golfBookingId,
        staffName,
      });
      return Response.json({ ok: true, ticket });
    }

    if (action === 'close-shift') {
      if (auth && !can(auth.role, 'finance.shift') && !can(auth.role, 'parking.manage')) {
        return Response.json({ error: 'Không có quyền chốt ca bãi xe' }, { status: 403 });
      }
      const staffName = auth?.name || body.staffName || 'Bảo vệ ca trực';
      const report = await closeShift(tenant, {
        staffId: auth?.userId || 'guard-1',
        staffName,
        cashSubmitted: Number(body.cashSubmitted) || 0,
        notes: body.notes,
      });
      return Response.json({ ok: true, report });
    }

    if (action === 'change-spot') {
      // Operator changes spot for a ticket
      const ticketCode = String(body.ticketCode || '').trim();
      const newSpotCode = String(body.newSpotCode || '').trim().toUpperCase();

      const ticket = await db().prepare('SELECT * FROM parking_tickets WHERE tenant=? AND ticket_code=?').bind(tenant, ticketCode).first<any>();
      if (!ticket) throw new Error('Không tìm thấy vé để đổi ô');

      const spot = await db().prepare('SELECT * FROM parking_spots WHERE tenant=? AND code=?').bind(tenant, newSpotCode).first<any>();
      if (!spot) throw new Error(`Không tìm thấy ô đỗ ${newSpotCode}`);

      await db()
        .prepare('UPDATE parking_tickets SET spot_id=?, spot_code=?, section=?, updated_at=? WHERE id=?')
        .bind(spot.id, spot.code, spot.section, Date.now(), ticket.id)
        .run();

      await audit(tenant, 'ĐỔI_Ô_ĐỖ', `Đổi ô vé ${ticketCode} từ ${ticket.spot_code} sang ${newSpotCode} bởi ${auth?.name || 'Nhân viên'}`);

      return Response.json({ ok: true, message: `Đã đổi vé sang ô ${newSpotCode}` });
    }

    if (action === 'cancel-ticket') {
      const ticketCode = String(body.ticketCode || '').trim();
      const reason = String(body.reason || 'Khách yêu cầu hủy').trim();

      const ticket = await db().prepare('SELECT * FROM parking_tickets WHERE tenant=? AND ticket_code=?').bind(tenant, ticketCode).first<any>();
      if (!ticket) throw new Error('Không tìm thấy vé để hủy');

      await db()
        .prepare("UPDATE parking_tickets SET status='cancelled', updated_at=? WHERE id=?")
        .bind(Date.now(), ticket.id)
        .run();

      // If customer paid, record refund transaction
      if (ticket.paid_amount > 0) {
        await db()
          .prepare(
            `INSERT INTO parking_transactions (
              id, tenant, ticket_id, ticket_code, shift_id, tx_type, method, amount, reference_code, note, recorded_by, created_at
            ) VALUES (?, ?, ?, ?, NULL, 'refund', ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            `tx-rf-${ticket.id}-${Date.now()}`,
            tenant,
            ticket.id,
            ticket.ticket_code,
            ticket.payment_method || 'transfer',
            ticket.paid_amount,
            `REFUND-${ticket.ticket_code}`,
            `Hoàn tiền hủy vé: ${reason}`,
            auth?.name || 'Nhân viên',
            Date.now(),
          )
          .run();
      }

      await audit(tenant, 'HỦY_VÉ_BÃI_XE', `Hủy vé ${ticketCode}: ${reason}`);

      return Response.json({ ok: true, message: 'Đã hủy vé thành công' });
    }

    if (action === 'set-spot-status') {
      const spotCode = String(body.spotCode || '').trim().toUpperCase();
      const status = body.status === 'maintenance' ? 'maintenance' : 'active';

      await db()
        .prepare('UPDATE parking_spots SET status=? WHERE tenant=? AND code=?')
        .bind(status, tenant, spotCode)
        .run();

      await audit(tenant, 'CẬP_NHẬT_TRẠNG_THÁI_Ô', `Cập nhật ô ${spotCode} thành ${status}`);

      return Response.json({ ok: true, spotCode, status });
    }

    return Response.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Lỗi thao tác bãi xe' }, { status: 400 });
  }
}
