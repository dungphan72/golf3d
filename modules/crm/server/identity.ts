import { audit, db } from '../../../lib/server/common';
import {
  normalizePhone,
  normalizeEmail,
  isDedupable,
  calculateMatchConfidence,
  normalizeCustomerCode,
  type MatchConfidence,
} from '../core/identity.ts';
import { fail, reply, type Ctx, type Result } from './store';
import { ensureProfile } from './customers';

export type DuplicateMatch = {
  isDuplicate: boolean;
  confidence: MatchConfidence;
  reason: string;
  matchedCustomer?: {
    id: string;
    code: string;
    name: string;
    phone: string;
    email: string;
    spend: number;
    visits: number;
  };
  matchedLeads?: Array<{
    id: string;
    fullName: string;
    phone: string;
    email: string;
    stage: string;
    owner: string | null;
    created: number;
  }>;
};

/**
 * Checks for duplicate records by phone and/or email across customers and active leads.
 * Does not mutate any data. Returns actionable match report for staff.
 */
export async function checkDuplicates(
  c: Ctx,
  input: { phone?: string; email?: string; excludeId?: string },
): Promise<Result> {
  const d = db();
  const rawPhone = String(input.phone ?? '').trim();
  const rawEmail = String(input.email ?? '').trim();

  const phoneNorm = normalizePhone(rawPhone);
  const emailNorm = normalizeEmail(rawEmail);

  if (!isDedupable(phoneNorm) && !emailNorm) {
    return reply({
      isDuplicate: false,
      confidence: 'NONE',
      reason: 'Thông tin chưa đủ điều kiện đối soát (SĐT tối thiểu 8 số hoặc email hợp lệ)',
    });
  }

  // 1. Check against customers & crm2_customer_profiles
  let customerMatch: {
    id: string;
    code: string | null;
    name: string;
    phone: string;
    email: string;
    spend: number;
    visits: number;
  } | null = null;

  if (isDedupable(phoneNorm)) {
    customerMatch = await d
      .prepare(
        `SELECT c.id, c.name, c.phone, c.email, p.code,
           COALESCE((SELECT SUM(amount) FROM crm_visits WHERE tenant=c.tenant AND customer_id=c.id), 0) AS spend,
           (SELECT COUNT(*) FROM crm_visits WHERE tenant=c.tenant AND customer_id=c.id) AS visits
         FROM customers c
         LEFT JOIN crm2_customer_profiles p ON p.tenant=c.tenant AND p.phone_norm=c.phone
         WHERE c.tenant=? AND c.phone=? AND (?='' OR c.id<>?)
         LIMIT 1`,
      )
      .bind(c.tenant, phoneNorm, input.excludeId ?? '', input.excludeId ?? '')
      .first();
  }

  if (!customerMatch && emailNorm) {
    customerMatch = await d
      .prepare(
        `SELECT c.id, c.name, c.phone, c.email, p.code,
           COALESCE((SELECT SUM(amount) FROM crm_visits WHERE tenant=c.tenant AND customer_id=c.id), 0) AS spend,
           (SELECT COUNT(*) FROM crm_visits WHERE tenant=c.tenant AND customer_id=c.id) AS visits
         FROM customers c
         LEFT JOIN crm2_customer_profiles p ON p.tenant=c.tenant AND p.phone_norm=c.phone
         WHERE c.tenant=? AND lower(c.email)=? AND (?='' OR c.id<>?)
         LIMIT 1`,
      )
      .bind(c.tenant, emailNorm, input.excludeId ?? '', input.excludeId ?? '')
      .first();
  }

  // 2. Check against leads
  let matchedLeads: Array<{
    id: string;
    fullName: string;
    phone: string;
    email: string;
    stage: string;
    owner: string | null;
    created: number;
  }> = [];

  if (isDedupable(phoneNorm) || emailNorm) {
    matchedLeads = (
      await d
        .prepare(
          `SELECT id, full_name AS fullName, phone, email, stage, owner, created
           FROM crm2_leads
           WHERE tenant=? AND (?<>'' AND phone_norm=? OR ?<>'' AND lower(email)=?)
           ORDER BY created DESC LIMIT 5`,
        )
        .bind(c.tenant, phoneNorm, phoneNorm, emailNorm, emailNorm)
        .all<{
          id: string;
          fullName: string;
          phone: string;
          email: string;
          stage: string;
          owner: string | null;
          created: number;
        }>()
    ).results;
  }

  const phoneMatched = Boolean(
    customerMatch?.phone === phoneNorm || matchedLeads.some((l) => normalizePhone(l.phone) === phoneNorm),
  );
  const emailMatched = Boolean(
    (customerMatch?.email && normalizeEmail(customerMatch.email) === emailNorm) ||
      matchedLeads.some((l) => l.email && normalizeEmail(l.email) === emailNorm),
  );

  const evaluation = calculateMatchConfidence({
    phoneMatched,
    emailMatched,
    nameSimilar: false,
  });

  const isDuplicate = evaluation.confidence !== 'NONE';

  return reply({
    isDuplicate,
    confidence: evaluation.confidence,
    reason: evaluation.reason,
    matchedCustomer: customerMatch
      ? {
          id: customerMatch.id,
          code: customerMatch.code || `KH${customerMatch.id.slice(-6).toUpperCase()}`,
          name: customerMatch.name,
          phone: customerMatch.phone,
          email: customerMatch.email || '',
          spend: Number(customerMatch.spend || 0),
          visits: Number(customerMatch.visits || 0),
        }
      : undefined,
    matchedLeads,
  });
}

/**
 * Retrieves unlinked walk-in bookings and unlinked leads for a customer's verified phone/email.
 * Used by the verification review drawer / modal.
 */
export async function getUnlinkedRecords(c: Ctx, customerId: string): Promise<Result> {
  const d = db();
  const cust = await d
    .prepare('SELECT id, name, phone, email FROM customers WHERE tenant=? AND id=?')
    .bind(c.tenant, customerId)
    .first<{ id: string; name: string; phone: string; email: string }>();

  if (!cust) return fail('Không tìm thấy khách hàng', 404);

  const phoneNorm = normalizePhone(cust.phone);

  // 1. Unlinked bookings (e.g. walk-ins where customer name is 'Khách vãng lai' or booking has not been added to crm_visits)
  const unlinkedBookings = (
    await d
      .prepare(
        `SELECT b.id, b.room, b.service, b.customer, b.phone, b.start, b.end, b.amount, b.status, b.created
         FROM bookings b
         WHERE b.tenant=? AND (b.phone=? OR replace(replace(replace(b.phone,' ',''),'-',''),'+84','0')=?)
           AND NOT EXISTS (
             SELECT 1 FROM crm_visits v WHERE v.tenant=b.tenant AND v.booking_id=b.id AND v.customer_id=?
           )
         ORDER BY b.start DESC LIMIT 20`,
      )
      .bind(c.tenant, cust.phone, phoneNorm, cust.id)
      .all<{
        id: string;
        room: string;
        service: string;
        customer: string;
        phone: string;
        start: number;
        end: number;
        amount: number | null;
        status: string;
        created: number;
      }>()
  ).results;

  // 2. Unlinked leads with matching phone
  const unlinkedLeads = (
    await d
      .prepare(
        `SELECT id, full_name AS fullName, phone, email, source, target_service AS targetService, stage, owner, created
         FROM crm2_leads
         WHERE tenant=? AND phone_norm=?
         ORDER BY created DESC LIMIT 20`,
      )
      .bind(c.tenant, phoneNorm)
      .all<{
        id: string;
        fullName: string;
        phone: string;
        email: string;
        source: string;
        targetService: string;
        stage: string;
        owner: string | null;
        created: number;
      }>()
  ).results;

  return reply({
    customer: {
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
    },
    unlinkedBookings,
    unlinkedLeads,
  });
}

/**
 * Links a walk-in booking or lead to a verified customer profile with explicit confirmation.
 * Never auto-merges or mutates financial ledgers without staff confirmation & audit trail.
 */
export async function linkRecordToCustomer(
  c: Ctx,
  input: {
    customerId: string;
    recordType: 'booking' | 'lead';
    recordId: string;
    reason?: string;
    confirmed: boolean;
  },
): Promise<Result> {
  if (!input.confirmed) {
    return fail('Yêu cầu nhân viên xác nhận liên kết hồ sơ');
  }

  const d = db();
  const cust = await d
    .prepare('SELECT id, name, phone FROM customers WHERE tenant=? AND id=?')
    .bind(c.tenant, input.customerId)
    .first<{ id: string; name: string; phone: string }>();

  if (!cust) return fail('Không tìm thấy khách hàng', 404);

  const now = c.now;
  const reason = (input.reason ?? '').trim() || 'Xác minh thông tin đối soát';

  if (input.recordType === 'booking') {
    const booking = await d
      .prepare('SELECT id, room, service, customer, phone, start, end, amount, status FROM bookings WHERE tenant=? AND id=?')
      .bind(c.tenant, input.recordId)
      .first<{
        id: string;
        room: string;
        service: string;
        customer: string;
        phone: string;
        start: number;
        end: number;
        amount: number | null;
        status: string;
      }>();

    if (!booking) return fail('Không tìm thấy lượt đặt sân', 404);

    // Insert into crm_visits if not exists (so customer 360 visits and spend stats are updated)
    await d
      .prepare(
        `INSERT OR IGNORE INTO crm_visits(id, tenant, customer_id, booking_id, room, service, start, finished, amount, created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        c.tenant,
        cust.id,
        booking.id,
        booking.room,
        booking.service,
        booking.start,
        booking.end,
        booking.amount || 0,
        now,
      )
      .run();

    // Log a timeline note in customer profile
    await d
      .prepare(
        `INSERT INTO crm2_customer_notes(id, tenant, customer_id, channel, content, actor, created)
         VALUES (?, ?, ?, 'manual', ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        c.tenant,
        cust.id,
        `[Xác minh] Đã liên kết lượt chơi ${booking.room.toUpperCase()} (${new Date(booking.start).toLocaleDateString('vi-VN')}) vào hồ sơ khách hàng. Lý do: ${reason}`,
        c.userId,
        now,
      )
      .run();

    await audit(
      c.tenant,
      'Xác minh & Liên kết Booking',
      `Khách ${cust.name} (${cust.phone}) · Booking #${booking.id.slice(0, 8)} · ${reason}`,
    );

    return reply({ ok: true, linked: 'booking', bookingId: booking.id });
  }

  if (input.recordType === 'lead') {
    const lead = await d
      .prepare('SELECT id, full_name AS fullName, phone, email, stage FROM crm2_leads WHERE tenant=? AND id=?')
      .bind(c.tenant, input.recordId)
      .first<{ id: string; fullName: string; phone: string; email: string; stage: string }>();

    if (!lead) return fail('Không tìm thấy Lead', 404);

    // Update lead notes with link verification mark
    await d
      .prepare(
        `UPDATE crm2_leads
         SET notes = COALESCE(notes, '') || ?
         WHERE tenant=? AND id=?`,
      )
      .bind(
        `\n[Đã xác minh liên kết vào KH ${cust.name} (${cust.phone}) bởi ${c.userId} lúc ${new Date(now).toLocaleString('vi-VN')}]`,
        c.tenant,
        lead.id,
      )
      .run();

    // Insert a note into customer timeline
    await d
      .prepare(
        `INSERT INTO crm2_customer_notes(id, tenant, customer_id, channel, content, actor, created)
         VALUES (?, ?, ?, 'manual', ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        c.tenant,
        cust.id,
        `[Xác minh] Đã liên kết Lead "${lead.fullName}" (${lead.phone}) vào hồ sơ khách hàng 360°. Lý do: ${reason}`,
        c.userId,
        now,
      )
      .run();

    await audit(
      c.tenant,
      'Xác minh & Liên kết Lead',
      `Khách ${cust.name} · Lead ${lead.fullName} (${lead.phone}) · ${reason}`,
    );

    return reply({ ok: true, linked: 'lead', leadId: lead.id });
  }

  return fail('Loại hồ sơ liên kết không hợp lệ', 400);
}

/**
 * Reverses a previously verified link in case of human input error.
 */
export async function unlinkRecordFromCustomer(
  c: Ctx,
  input: {
    customerId: string;
    recordType: 'booking' | 'lead';
    recordId: string;
    reason: string;
  },
): Promise<Result> {
  const d = db();
  const cust = await d
    .prepare('SELECT id, name, phone FROM customers WHERE tenant=? AND id=?')
    .bind(c.tenant, input.customerId)
    .first<{ id: string; name: string; phone: string }>();

  if (!cust) return fail('Không tìm thấy khách hàng', 404);

  const reason = (input.reason ?? '').trim();
  if (!reason) return fail('Vui lòng nêu rõ lý do hủy liên kết');

  if (input.recordType === 'booking') {
    await d
      .prepare('DELETE FROM crm_visits WHERE tenant=? AND customer_id=? AND booking_id=?')
      .bind(c.tenant, cust.id, input.recordId)
      .run();

    await d
      .prepare(
        `INSERT INTO crm2_customer_notes(id, tenant, customer_id, channel, content, actor, created)
         VALUES (?, ?, ?, 'manual', ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        c.tenant,
        cust.id,
        `[Hủy liên kết] Đã hủy liên kết lượt chơi #${input.recordId.slice(0, 8)} khỏi hồ sơ. Lý do: ${reason}`,
        c.userId,
        c.now,
      )
      .run();

    await audit(
      c.tenant,
      'Hủy liên kết Booking',
      `Khách ${cust.name} · Booking #${input.recordId.slice(0, 8)} · ${reason}`,
    );

    return reply({ ok: true, unlinked: 'booking' });
  }

  return fail('Chưa hỗ trợ loại hủy liên kết này');
}
