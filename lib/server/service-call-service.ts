import { db, ok, fail, type ServiceResult } from './common';
import { pushToTenant } from './webpush';
import { rooms } from '../club';
import { applyFnb } from './fnb-service';
import {
  type ServiceCall,
  type ServiceCallSettings,
  type ServiceCallCategory,
  type ServiceCallQr,
  type ServiceCallEvent,
  type ServiceCallStatus,
  type ResolutionType,
  DEFAULT_SERVICE_CALL_SETTINGS,
  DEFAULT_CATEGORIES,
} from '../service-call';

/**
 * 1. SETTINGS & CATEGORIES
 */
export async function getServiceCallSettings(tenant: string): Promise<ServiceCallSettings> {
  const row = await db()
    .prepare('SELECT * FROM sc_settings WHERE tenant=?')
    .bind(tenant)
    .first<{
      tenant: string;
      is_enabled: number;
      guest_mode: string;
      require_active_session: number;
      sla_ack_seconds: number;
      sla_resolve_seconds: number;
      cooldown_seconds: number;
      max_open_requests: number;
      sound_alert_enabled: number;
      auto_assign_staff: number;
      updated_at: number;
    }>();

  if (row) {
    return {
      tenant: row.tenant,
      is_enabled: row.is_enabled === 1,
      guest_mode: row.guest_mode as ServiceCallSettings['guest_mode'],
      require_active_session: row.require_active_session === 1,
      sla_ack_seconds: row.sla_ack_seconds,
      sla_resolve_seconds: row.sla_resolve_seconds,
      cooldown_seconds: row.cooldown_seconds,
      max_open_requests: row.max_open_requests,
      sound_alert_enabled: row.sound_alert_enabled === 1,
      auto_assign_staff: row.auto_assign_staff === 1,
      updated_at: row.updated_at,
    };
  }

  // Seed default settings for tenant
  const now = Date.now();
  const d = DEFAULT_SERVICE_CALL_SETTINGS;
  await db()
    .prepare(
      `INSERT OR IGNORE INTO sc_settings (
        tenant, is_enabled, guest_mode, require_active_session,
        sla_ack_seconds, sla_resolve_seconds, cooldown_seconds,
        max_open_requests, sound_alert_enabled, auto_assign_staff, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      tenant,
      d.is_enabled ? 1 : 0,
      d.guest_mode,
      d.require_active_session ? 1 : 0,
      d.sla_ack_seconds,
      d.sla_resolve_seconds,
      d.cooldown_seconds,
      d.max_open_requests,
      d.sound_alert_enabled ? 1 : 0,
      d.auto_assign_staff ? 1 : 0,
      now
    )
    .run();

  return { tenant, ...d, updated_at: now };
}

export async function updateServiceCallSettings(
  tenant: string,
  patch: Partial<ServiceCallSettings>
): Promise<ServiceResult> {
  const cur = await getServiceCallSettings(tenant);
  const next = { ...cur, ...patch, updated_at: Date.now() };

  await db()
    .prepare(
      `UPDATE sc_settings SET
        is_enabled=?, guest_mode=?, require_active_session=?,
        sla_ack_seconds=?, sla_resolve_seconds=?, cooldown_seconds=?,
        max_open_requests=?, sound_alert_enabled=?, auto_assign_staff=?, updated_at=?
      WHERE tenant=?`
    )
    .bind(
      next.is_enabled ? 1 : 0,
      next.guest_mode,
      next.require_active_session ? 1 : 0,
      next.sla_ack_seconds,
      next.sla_resolve_seconds,
      next.cooldown_seconds,
      next.max_open_requests,
      next.sound_alert_enabled ? 1 : 0,
      next.auto_assign_staff ? 1 : 0,
      next.updated_at,
      tenant
    )
    .run();

  return ok({ settings: next });
}

export async function getServiceCallCategories(tenant: string): Promise<ServiceCallCategory[]> {
  const rows = (
    await db()
      .prepare('SELECT * FROM sc_categories WHERE tenant=? AND is_active=1 ORDER BY sort_order ASC')
      .bind(tenant)
      .all<ServiceCallCategory>()
  ).results;

  if (rows.length > 0) return rows;

  // Seed default categories
  for (const cat of DEFAULT_CATEGORIES) {
    const id = `cat_${cat.code.toLowerCase()}`;
    await db()
      .prepare(
        `INSERT OR IGNORE INTO sc_categories (
          id, tenant, code, name_vi, name_en, name_ko, icon, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .bind(id, tenant, cat.code, cat.name_vi, cat.name_en, cat.name_ko, cat.icon, cat.sort_order)
      .run();
  }

  return (
    await db()
      .prepare('SELECT * FROM sc_categories WHERE tenant=? AND is_active=1 ORDER BY sort_order ASC')
      .bind(tenant)
      .all<ServiceCallCategory>()
  ).results;
}

/**
 * 2. SECURE QR CODE MANAGEMENT
 */
function generateToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let t = '';
  for (let i = 0; i < 24; i++) {
    t += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return t;
}

export async function getOrCreateQrForRoom(tenant: string, roomId: string): Promise<ServiceCallQr> {
  const existing = await db()
    .prepare('SELECT * FROM sc_qr_codes WHERE tenant=? AND room_id=? AND is_active=1')
    .bind(tenant, roomId)
    .first<ServiceCallQr>();

  if (existing) return existing;

  const id = crypto.randomUUID();
  const token = generateToken();
  const now = Date.now();

  await db()
    .prepare(
      `INSERT INTO sc_qr_codes (
        id, tenant, room_id, token_secret, version, is_active, created_at
      ) VALUES (?, ?, ?, ?, 1, 1, ?)`
    )
    .bind(id, tenant, roomId, token, now)
    .run();

  return {
    id,
    tenant,
    room_id: roomId,
    token_secret: token,
    version: 1,
    is_active: true,
    created_at: now,
  };
}

export async function listQrCodes(tenant: string): Promise<ServiceCallQr[]> {
  // Ensure every room has at least one active QR code
  for (const r of rooms) {
    await getOrCreateQrForRoom(tenant, r.id);
  }
  const rows = (
    await db()
      .prepare('SELECT * FROM sc_qr_codes WHERE tenant=? AND is_active=1 ORDER BY room_id ASC')
      .bind(tenant)
      .all<ServiceCallQr>()
  ).results;
  return rows;
}

export async function revokeAndRotateQr(tenant: string, roomId: string): Promise<ServiceCallQr> {
  const now = Date.now();
  // Revoke old QRs for this room
  await db()
    .prepare('UPDATE sc_qr_codes SET is_active=0, revoked_at=? WHERE tenant=? AND room_id=?')
    .bind(now, tenant, roomId)
    .run();

  // Find max version
  const last = await db()
    .prepare('SELECT MAX(version) as max_v FROM sc_qr_codes WHERE tenant=? AND room_id=?')
    .bind(tenant, roomId)
    .first<{ max_v: number | null }>();

  const newVersion = (last?.max_v ?? 0) + 1;
  const id = crypto.randomUUID();
  const token = generateToken();

  await db()
    .prepare(
      `INSERT INTO sc_qr_codes (
        id, tenant, room_id, token_secret, version, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?)`
    )
    .bind(id, tenant, roomId, token, newVersion, now)
    .run();

  return {
    id,
    tenant,
    room_id: roomId,
    token_secret: token,
    version: newVersion,
    is_active: true,
    created_at: now,
  };
}

export async function resolveQrToken(tokenSecret: string) {
  if (!tokenSecret || tokenSecret.length < 10) {
    return fail('Mã QR không hợp lệ', 404);
  }

  const qr = await db()
    .prepare('SELECT * FROM sc_qr_codes WHERE token_secret=? AND is_active=1')
    .bind(tokenSecret)
    .first<ServiceCallQr>();

  if (!qr) {
    return fail('Mã QR đã hết hạn hoặc bị thu hồi bởi quản trị viên', 404);
  }

  const settings = await getServiceCallSettings(qr.tenant);
  if (!settings.is_enabled) {
    return fail('Cơ sở hiện đang tạm tắt tính năng gọi phục vụ trực tuyến', 403);
  }

  const room = rooms.find((r) => r.id === qr.room_id);
  const categories = await getServiceCallCategories(qr.tenant);

  // Check if active playing session exists
  const activeBooking = await db()
    .prepare(
      "SELECT id, customer, phone, status FROM bookings WHERE tenant=? AND room=? AND status IN ('playing','paused') LIMIT 1"
    )
    .bind(qr.tenant, qr.room_id)
    .first<{ id: string; customer: string; phone: string; status: string }>();

  const menuItems = await getActiveMenuItems(qr.tenant);

  return ok({
    tenant: qr.tenant,
    roomId: qr.room_id,
    roomName: room ? (room.vip ? `Phòng ${room.name}` : room.name) : qr.room_id,
    isVip: room?.vip ?? false,
    guestMode: settings.guest_mode,
    requireActiveSession: settings.require_active_session,
    hasActiveSession: !!activeBooking,
    activeBooking: activeBooking ? { customer: activeBooking.customer, id: activeBooking.id } : null,
    categories,
    menuItems,
    qrToken: tokenSecret,
  });
}

export async function getActiveMenuItems(tenant: string) {
  try {
    const items = await db()
      .prepare('SELECT id, name, category, unit, price FROM menu_items WHERE tenant=? AND active=1 ORDER BY category, name')
      .bind(tenant)
      .all<{ id: string; name: string; category: string; unit: string; price: number }>();
    return items.results || [];
  } catch {
    return [];
  }
}

/**
 * 3. EPHEMERAL GUEST SESSIONS
 */
export async function createGuestSession(
  tenant: string,
  roomId: string,
  qrToken: string,
  phone?: string,
  ipHash?: string,
  userAgent?: string
) {
  const qr = await db()
    .prepare('SELECT id FROM sc_qr_codes WHERE token_secret=? AND is_active=1')
    .bind(qrToken)
    .first<{ id: string }>();

  if (!qr) return fail('Mã QR không hợp lệ', 400);

  const id = 'gs_' + crypto.randomUUID().replace(/-/g, '');
  const now = Date.now();
  const expiresAt = now + 8 * 3600 * 1000; // 8 hours TTL

  await db()
    .prepare(
      `INSERT INTO sc_guest_sessions (
        id, tenant, room_id, qr_id, phone, ip_hash, user_agent, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, tenant, roomId, qr.id, phone || null, ipHash || null, userAgent || null, expiresAt, now)
    .run();

  return ok({ sessionToken: id, expiresAt, roomId });
}

export async function verifyGuestSession(sessionToken: string) {
  if (!sessionToken) return null;
  const now = Date.now();
  const row = await db()
    .prepare('SELECT * FROM sc_guest_sessions WHERE id=? AND expires_at>?')
    .bind(sessionToken, now)
    .first<{
      id: string;
      tenant: string;
      room_id: string;
      qr_id: string;
      phone?: string | null;
      expires_at: number;
    }>();
  return row || null;
}

/**
 * 4. CORE ENGINE — CREATING & DISPATCHING SERVICE CALLS
 */
export async function createServiceCall(input: {
  tenant: string;
  roomId: string;
  categoryCode: string;
  source: 'guest_qr' | 'member_app' | 'staff_proxy';
  customerName?: string;
  customerPhone?: string;
  memberId?: string;
  note?: string;
  idempotencyKey?: string;
  items?: Array<{ itemId: string; qty: number; name?: string; price?: number; unit?: string }>;
}): Promise<ServiceResult> {
  const { tenant, roomId, categoryCode, source, customerName, customerPhone, memberId, note, idempotencyKey, items } =
    input;

  const room = rooms.find((r) => r.id === roomId);
  if (!room) return fail('Không tìm thấy Line / Phòng', 404);

  const settings = await getServiceCallSettings(tenant);
  if (!settings.is_enabled) {
    return fail('Dịch vụ gọi phục vụ đang tạm ngưng', 403);
  }

  // Find category
  const categories = await getServiceCallCategories(tenant);
  const cat = categories.find((c) => c.code === categoryCode);
  if (!cat) return fail('Loại yêu cầu không hợp lệ', 400);

  // Check active booking on room if configured
  const activeBooking = await db()
    .prepare(
      "SELECT id, customer, phone FROM bookings WHERE tenant=? AND room=? AND status IN ('playing','paused') LIMIT 1"
    )
    .bind(tenant, roomId)
    .first<{ id: string; customer: string; phone: string }>();

  if (settings.require_active_session && !activeBooking) {
    return fail('Line này hiện chưa có phiên chơi hoạt động. Vui lòng liên hệ quầy thu ngân.', 409);
  }

  // Idempotency check: if client sent key and call exists within last 5 minutes, return existing
  const now = Date.now();
  if (idempotencyKey) {
    const existing = await db()
      .prepare('SELECT * FROM sc_calls WHERE tenant=? AND idempotency_key=? AND created_at>?')
      .bind(tenant, idempotencyKey, now - 5 * 60_000)
      .first<ServiceCall>();
    if (existing) {
      return ok({ call: existing, callId: existing.id, repeated: true });
    }
  }

  // Cooldown check on this room & category (e.g. 60s)
  const recentSame = await db()
    .prepare(
      "SELECT id, status, created_at FROM sc_calls WHERE tenant=? AND room_id=? AND category_code=? AND status IN ('CREATED','ACKNOWLEDGED','IN_PROGRESS') AND created_at>?"
    )
    .bind(tenant, roomId, categoryCode, now - settings.cooldown_seconds * 1000)
    .first<{ id: string }>();

  if (recentSame) {
    return fail(`Yêu cầu đang được chuyển đến nhân viên. Vui lòng đợi ${settings.cooldown_seconds} giây giữa mỗi lần gửi.`, 429);
  }

  // Max open requests limit
  const openCount = await db()
    .prepare(
      "SELECT COUNT(*) as cnt FROM sc_calls WHERE tenant=? AND room_id=? AND status IN ('CREATED','ACKNOWLEDGED','IN_PROGRESS')"
    )
    .bind(tenant, roomId)
    .first<{ cnt: number }>();

  if ((openCount?.cnt ?? 0) >= settings.max_open_requests) {
    return fail('Đã có nhiều yêu cầu đang chờ xử lý tại line này. Nhân viên sẽ hỗ trợ ngay.', 429);
  }

  const callId = 'sc_' + crypto.randomUUID().replace(/-/g, '');
  const finalCustName = customerName || activeBooking?.customer || 'Khách tại line';
  const finalCustPhone = customerPhone || activeBooking?.phone || null;
  const bookingId = activeBooking?.id || null;

  let finalNote = note?.trim() || '';
  if (items && items.length > 0) {
    const orderLinesText = items.map((i) => `${i.qty}x ${i.name || i.itemId}`).join(', ');
    finalNote = finalNote
      ? `[Món: ${orderLinesText}] · ${finalNote}`
      : `[Món: ${orderLinesText}]`;
  }

  // Auto-record order into food_orders if session is active and items provided
  if (items && items.length > 0 && activeBooking) {
    try {
      const lines: Array<{ itemId: string; qty: number; expectedVersion: number }> = [];
      for (const it of items) {
        const dbItem = await db()
          .prepare('SELECT version FROM menu_items WHERE tenant=? AND id=? AND active=1')
          .bind(tenant, it.itemId)
          .first<{ version: number }>();
        if (dbItem) {
          lines.push({
            itemId: it.itemId,
            qty: Math.max(1, Math.min(99, it.qty)),
            expectedVersion: dbItem.version,
          });
        }
      }
      if (lines.length > 0) {
        await applyFnb(tenant, finalCustName, {
          action: 'order',
          requestId: 'scord_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24),
          bookingId: activeBooking.id,
          note: `Khách gọi qua App/QR: ${finalNote}`,
          lines,
        });
      }
    } catch (err) {
      console.error('Failed to auto-order fnb from service call:', err);
    }
  }

  await db().batch([
    db()
      .prepare(
        `INSERT INTO sc_calls (
          id, tenant, room_id, category_id, category_code, source, status,
          customer_name, customer_phone, member_id, booking_id, note,
          idempotency_key, created_at, sla_ack_breached, sla_resolve_breached
        ) VALUES (?, ?, ?, ?, ?, ?, 'CREATED', ?, ?, ?, ?, ?, ?, ?, 0, 0)`
      )
      .bind(
        callId,
        tenant,
        roomId,
        cat.id,
        cat.code,
        source,
        finalCustName,
        finalCustPhone,
        memberId || null,
        bookingId,
        finalNote || null,
        idempotencyKey || null,
        now
      ),
    db()
      .prepare(
        `INSERT INTO sc_call_events (
          id, call_id, tenant, from_status, to_status, actor_type, actor_id, actor_name, note, created_at
        ) VALUES (?, ?, ?, NULL, 'CREATED', ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        callId,
        tenant,
        source === 'staff_proxy' ? 'staff' : source === 'member_app' ? 'member' : 'guest',
        memberId || null,
        finalCustName,
        finalNote || `Khách gọi: ${cat.name_vi}`,
        now
      ),
  ]);

  // Send Web Push Notification
  const roomTitle = room.vip ? `Phòng ${room.name}` : room.name;
  await pushToTenant(tenant, {
    title: `🔔 ${roomTitle} gọi phục vụ`,
    body: `${cat.name_vi}: ${finalCustName}`,
    url: '/quan-ly',
  }).catch(() => undefined);

  const createdCall: ServiceCall = {
    id: callId,
    tenant,
    room_id: roomId,
    category_id: cat.id,
    category_code: categoryCode,
    source,
    status: 'CREATED',
    customer_name: finalCustName,
    customer_phone: finalCustPhone,
    member_id: memberId || null,
    booking_id: bookingId,
    note: finalNote || null,
    assigned_staff_id: null,
    assigned_staff_name: null,
    resolution_type: null,
    resolution_note: null,
    idempotency_key: idempotencyKey || null,
    created_at: now,
    acknowledged_at: null,
    started_at: null,
    completed_at: null,
    sla_ack_breached: 0,
    sla_resolve_breached: 0,
  };

  return ok({
    callId,
    call: createdCall,
    status: 'CREATED',
    roomName: roomTitle,
    categoryName: cat.name_vi,
    createdAt: now,
  });
}

/**
 * 5. STAFF OPERATIONS (ATOMIC STATE TRANSITIONS)
 */
export async function acknowledgeServiceCall(
  tenant: string,
  callId: string,
  staffId: string,
  staffName: string
): Promise<ServiceResult> {
  const now = Date.now();
  const settings = await getServiceCallSettings(tenant);

  // Check SLA breached at moment of acknowledge
  const call = await db()
    .prepare('SELECT id, created_at, status, room_id, category_code FROM sc_calls WHERE id=? AND tenant=?')
    .bind(callId, tenant)
    .first<{ id: string; created_at: number; status: string; room_id: string; category_code: string }>();

  if (!call) return fail('Không tìm thấy yêu cầu phục vụ', 404);
  if (call.status !== 'CREATED') {
    return fail('Yêu cầu này đã được tiếp nhận hoặc đã hoàn thành', 409);
  }

  const slaBreached = now - call.created_at > settings.sla_ack_seconds * 1000 ? 1 : 0;

  // Atomic update: only if status is still CREATED
  const updated = await db()
    .prepare(
      `UPDATE sc_calls SET
        status = 'ACKNOWLEDGED',
        assigned_staff_id = ?,
        assigned_staff_name = ?,
        acknowledged_at = ?,
        sla_ack_breached = ?
      WHERE id = ? AND tenant = ? AND status = 'CREATED'`
    )
    .bind(staffId, staffName, now, slaBreached, callId, tenant)
    .run();

  if (!updated.meta.changes) {
    return fail('Yêu cầu vừa được nhân viên khác tiếp nhận trước', 409);
  }

  // Record Event
  await db()
    .prepare(
      `INSERT INTO sc_call_events (
        id, call_id, tenant, from_status, to_status, actor_type, actor_id, actor_name, note, created_at
      ) VALUES (?, ?, ?, 'CREATED', 'ACKNOWLEDGED', 'staff', ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      callId,
      tenant,
      staffId,
      staffName,
      `Nhân viên ${staffName} đã tiếp nhận`,
      now
    )
    .run();

  return ok({ callId, status: 'ACKNOWLEDGED', staffName, acknowledgedAt: now });
}

export async function startServiceCall(
  tenant: string,
  callId: string,
  staffId: string,
  staffName: string
): Promise<ServiceResult> {
  const now = Date.now();
  const updated = await db()
    .prepare(
      `UPDATE sc_calls SET
        status = 'IN_PROGRESS',
        started_at = ?,
        assigned_staff_id = COALESCE(assigned_staff_id, ?),
        assigned_staff_name = COALESCE(assigned_staff_name, ?)
      WHERE id = ? AND tenant = ? AND status IN ('CREATED', 'ACKNOWLEDGED')`
    )
    .bind(now, staffId, staffName, callId, tenant)
    .run();

  if (!updated.meta.changes) {
    return fail('Yêu cầu không còn ở trạng thái chờ xử lý', 409);
  }

  await db()
    .prepare(
      `INSERT INTO sc_call_events (
        id, call_id, tenant, from_status, to_status, actor_type, actor_id, actor_name, note, created_at
      ) VALUES (?, ?, ?, 'ACKNOWLEDGED', 'IN_PROGRESS', 'staff', ?, ?, 'Bắt đầu xử lý tại line', ?)`
    )
    .bind(crypto.randomUUID(), callId, tenant, staffId, staffName, now)
    .run();

  return ok({ callId, status: 'IN_PROGRESS', startedAt: now });
}

export async function completeServiceCall(input: {
  tenant: string;
  callId: string;
  staffId: string;
  staffName: string;
  resolutionType: ResolutionType;
  resolutionNote?: string;
}): Promise<ServiceResult> {
  const { tenant, callId, staffId, staffName, resolutionType, resolutionNote } = input;
  const now = Date.now();
  const settings = await getServiceCallSettings(tenant);

  const call = await db()
    .prepare('SELECT id, created_at, status FROM sc_calls WHERE id=? AND tenant=?')
    .bind(callId, tenant)
    .first<{ id: string; created_at: number; status: string }>();

  if (!call) return fail('Không tìm thấy yêu cầu phục vụ', 404);
  if (['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(call.status)) {
    return fail('Yêu cầu này đã kết thúc trước đó', 409);
  }

  const resolveSlaBreached = now - call.created_at > settings.sla_resolve_seconds * 1000 ? 1 : 0;

  const updated = await db()
    .prepare(
      `UPDATE sc_calls SET
        status = 'COMPLETED',
        completed_at = ?,
        resolution_type = ?,
        resolution_note = ?,
        sla_resolve_breached = ?,
        assigned_staff_id = COALESCE(assigned_staff_id, ?),
        assigned_staff_name = COALESCE(assigned_staff_name, ?)
      WHERE id = ? AND tenant = ? AND status IN ('CREATED', 'ACKNOWLEDGED', 'IN_PROGRESS')`
    )
    .bind(now, resolutionType, resolutionNote || null, resolveSlaBreached, staffId, staffName, callId, tenant)
    .run();

  if (!updated.meta.changes) {
    return fail('Không thể hoàn thành yêu cầu', 409);
  }

  await db()
    .prepare(
      `INSERT INTO sc_call_events (
        id, call_id, tenant, from_status, to_status, actor_type, actor_id, actor_name, note, created_at
      ) VALUES (?, ?, ?, ?, 'COMPLETED', 'staff', ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      callId,
      tenant,
      call.status,
      staffId,
      staffName,
      `Hoàn thành: ${resolutionType}${resolutionNote ? ` · ${resolutionNote}` : ''}`,
      now
    )
    .run();

  return ok({ callId, status: 'COMPLETED', completedAt: now });
}

export async function cancelServiceCall(input: {
  tenant: string;
  callId: string;
  actorType: 'guest' | 'member' | 'staff' | 'system';
  actorId?: string;
  actorName?: string;
  reason?: string;
}): Promise<ServiceResult> {
  const { tenant, callId, actorType, actorId, actorName, reason } = input;
  const now = Date.now();

  const call = await db()
    .prepare('SELECT id, status FROM sc_calls WHERE id=? AND tenant=?')
    .bind(callId, tenant)
    .first<{ id: string; status: string }>();

  if (!call) return fail('Không tìm thấy yêu cầu phục vụ', 404);
  if (['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(call.status)) {
    return fail('Yêu cầu đã đóng', 409);
  }

  // Guests can only cancel their own call if it's still in CREATED or ACKNOWLEDGED
  if (actorType === 'guest' && call.status === 'IN_PROGRESS') {
    return fail('Nhân viên đang tới hỗ trợ, bạn không thể hủy lúc này', 409);
  }

  await db()
    .prepare(
      "UPDATE sc_calls SET status = 'CANCELLED', resolution_type = 'CUSTOMER_CANCELLED', resolution_note = ? WHERE id = ? AND tenant = ?"
    )
    .bind(reason || 'Khách tự hủy', callId, tenant)
    .run();

  await db()
    .prepare(
      `INSERT INTO sc_call_events (
        id, call_id, tenant, from_status, to_status, actor_type, actor_id, actor_name, note, created_at
      ) VALUES (?, ?, ?, ?, 'CANCELLED', ?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), callId, tenant, call.status, actorType, actorId || null, actorName || 'Khách', reason || 'Hủy yêu cầu', now)
    .run();

  return ok({ callId, status: 'CANCELLED' });
}

/**
 * 6. REALTIME / LIVE CALLS FOR POS & STAFF DASHBOARD
 */
export async function getLiveServiceCalls(tenant: string) {
  const now = Date.now();
  const settings = await getServiceCallSettings(tenant);

  // Return calls that are CREATED, ACKNOWLEDGED, IN_PROGRESS, or COMPLETED within the last 15 minutes
  const recentThreshold = now - 15 * 60_000;
  const rows = (
    await db()
      .prepare(
        `SELECT c.*, cat.name_vi as category_name, cat.icon as category_icon
         FROM sc_calls c
         LEFT JOIN sc_categories cat ON cat.id = c.category_id
         WHERE c.tenant = ? AND (
           c.status IN ('CREATED', 'ACKNOWLEDGED', 'IN_PROGRESS') OR
           (c.status IN ('COMPLETED', 'CANCELLED') AND c.completed_at >= ?)
         )
         ORDER BY 
           CASE c.status
             WHEN 'CREATED' THEN 1
             WHEN 'ACKNOWLEDGED' THEN 2
             WHEN 'IN_PROGRESS' THEN 3
             ELSE 4
           END ASC,
           c.created_at ASC`
      )
      .bind(tenant, recentThreshold)
      .all<
        ServiceCall & {
          category_name?: string;
          category_icon?: string;
        }
      >()
  ).results;

  // Augment with room name and computed SLA warning
  const augmented = rows.map((c) => {
    const r = rooms.find((rm) => rm.id === c.room_id);
    const roomName = r ? (r.vip ? `Phòng ${r.name}` : r.name) : c.room_id;
    const elapsed = now - c.created_at;

    const isAckBreached =
      c.status === 'CREATED' && elapsed > settings.sla_ack_seconds * 1000;
    const isResolveBreached =
      ['CREATED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status) &&
      elapsed > settings.sla_resolve_seconds * 1000;

    return {
      ...c,
      room_name: roomName,
      is_vip: r?.vip ?? false,
      elapsed_ms: elapsed,
      sla_ack_warning: isAckBreached,
      sla_resolve_warning: isResolveBreached,
    };
  });

  const pendingCount = augmented.filter((c) => c.status === 'CREATED').length;
  const inProgressCount = augmented.filter((c) => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status)).length;

  return {
    calls: augmented,
    pendingCount,
    inProgressCount,
    settings,
    serverTime: now,
  };
}

/**
 * 7. GUEST STATUS VIEW
 */
export async function getCallStatusForGuest(tenant: string, callId: string) {
  const call = await db()
    .prepare(
      `SELECT c.*, cat.name_vi, cat.name_en, cat.name_ko, cat.icon
       FROM sc_calls c
       LEFT JOIN sc_categories cat ON cat.id = c.category_id
       WHERE c.id=? AND c.tenant=?`
    )
    .bind(callId, tenant)
    .first<ServiceCall & { name_vi: string; name_en: string; name_ko: string; icon: string }>();

  if (!call) return fail('Không tìm thấy yêu cầu', 404);

  const room = rooms.find((r) => r.id === call.room_id);
  return ok({
    call: {
      id: call.id,
      roomId: call.room_id,
      roomName: room ? (room.vip ? `Phòng ${room.name}` : room.name) : call.room_id,
      categoryCode: call.category_code,
      name_vi: call.name_vi,
      name_en: call.name_en,
      name_ko: call.name_ko,
      status: call.status,
      assignedStaffName: call.assigned_staff_name,
      createdAt: call.created_at,
      acknowledgedAt: call.acknowledged_at,
      startedAt: call.started_at,
      completedAt: call.completed_at,
    },
  });
}
