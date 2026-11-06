import { z } from 'zod';
import { quote, wholeQuote, type Config, type Booking, type Segment } from '../club';
import { configSchema } from '../config';
import { planBooking, withinOpening } from '../booking';
import { FINISH_SESSION_SQL } from '../fnb-sql';
import { db, audit, pendingCount, loadConfig, ok, fail, type ServiceResult } from './common';

export const MAX_BODY = 100000;
export const clubInput = z.object({
  action: z.enum([
    'settings',
    'book',
    'request-update',
    'start',
    'pause',
    'resume',
    'finish',
    'pay',
    'cancel',
    'support',
    'no-show',
    'reschedule',
    'extend',
    'walkin',
  ]),
  value: z.record(z.string(), z.unknown()).optional(),
  id: z.string().max(100).optional(),
  room: z.string().max(30).optional(),
  service: z.enum(['gdr', '9', '18']).optional(),
  start: z.number().finite().optional(),
  people: z.number().int().optional(),
  minutes: z.number().int().optional(),
  customer: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  status: z.string().max(30).optional(),
  kind: z.string().max(100).optional(),
  method: z.string().max(30).optional(),
  expectedRevision: z.string().max(100).optional(),
});
export type ClubInput = z.infer<typeof clubInput>;

/** Everything the dashboard needs for one tenant. */
export async function loadDashboard(tenant: string, displayName: string) {
  const day = 86400000,
    dayStart = Math.floor((Date.now() + 7 * 3600000) / day) * day - 7 * 3600000;
  const [c, b, r, a, activeShift, receipts] = await Promise.all([
    loadConfig(tenant),
    db()
      .prepare('SELECT * FROM bookings WHERE tenant=? ORDER BY start DESC LIMIT 200')
      .bind(tenant)
      .all(),
    db()
      .prepare('SELECT * FROM requests WHERE tenant=? ORDER BY created DESC LIMIT 100')
      .bind(tenant)
      .all(),
    db()
      .prepare('SELECT * FROM audit WHERE tenant=? ORDER BY created DESC LIMIT 30')
      .bind(tenant)
      .all(),
    db()
      .prepare("SELECT id,name,opened_at FROM shifts WHERE tenant=? AND status='open'")
      .bind(tenant)
      .first(),
    db()
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN kind='refund' THEN -amount ELSE amount END),0) AS total FROM finance_entries WHERE tenant=? AND kind IN ('payment','refund') AND created>=? AND created<?",
      )
      .bind(tenant, dayStart, dayStart + day)
      .first<{ total: number }>(),
  ]);
  return {
    config: c,
    bookings: b.results,
    requests: r.results,
    audit: a.results,
    activeShift,
    todayReceipts: receipts?.total ?? 0,
    onlinePending: await pendingCount(tenant),
    user: displayName,
    auth: 'Sites owner-private',
    stage: 'internal-pilot',
  };
}

/** Applies one staff action. Pure business logic: no HTTP objects. */
export async function runClubAction(
  tenant: string,
  input: ClubInput,
  nowArg = Date.now(),
): Promise<ServiceResult> {
  const c = await loadConfig(tenant);
  const now = nowArg;
  if (input.action === 'settings') {
    if (input.value?.pricingRevision !== c.pricingRevision)
      return fail('Cấu hình đã thay đổi ở thiết bị khác. Hãy tải lại trước khi lưu.', 409);
    const parsed = configSchema.safeParse({ ...c, ...input.value });
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(' · '));
    if (parsed.data.onlineEnabled && !parsed.data.onlineSlug)
      return fail('Hãy nhập mã đường dẫn để bật nhận đặt lịch online');
    if (parsed.data.onlineSlug) {
      const taken = await db()
        .prepare(
          "SELECT 1 AS x FROM settings WHERE tenant<>? AND json_extract(value,'$.onlineSlug')=?",
        )
        .bind(tenant, parsed.data.onlineSlug)
        .first();
      if (taken) return fail('Mã đường dẫn đã được cơ sở khác sử dụng', 409);
    }
    const v: Config = { ...parsed.data, pricingRevision: crypto.randomUUID(), published: false };
    v.published = false;
    const saved = await db()
      .prepare(
        "INSERT INTO settings(tenant,value) VALUES (?,?) ON CONFLICT(tenant) DO UPDATE SET value=excluded.value WHERE COALESCE(json_extract(settings.value,'$.pricingRevision'),'v01-upgrade')=?",
      )
      .bind(tenant, JSON.stringify(v), c.pricingRevision)
      .run();
    if (!saved.meta.changes) return fail('Cấu hình vừa thay đổi; hãy tải lại trước khi lưu.', 409);
    await audit(tenant, 'Cấu hình', 'Cập nhật thiết lập cơ sở');
    return ok();
  }
  if (input.action === 'book') {
    if (input.expectedRevision !== c.pricingRevision)
      return fail(
        'Bảng giá vừa thay đổi. Hãy tải lại và kiểm tra báo giá mới trước khi xác nhận.',
        409,
      );
    let plan;
    try {
      plan = planBooking(
        {
          room: input.room ?? '',
          service: input.service ?? 'gdr',
          start: Number(input.start),
          people: Number(input.people),
          minutes: Number(input.minutes),
        },
        c,
        now,
      );
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Lịch đặt không hợp lệ');
    }
    const { room, base, listBase, promo } = plan;
    const start = Number(input.start),
      people = Number(input.people),
      service = input.service ?? 'gdr';
    const end = plan.end;
    if (
      typeof input.customer !== 'string' ||
      input.customer.trim().length < 2 ||
      input.customer.length > 100 ||
      typeof input.phone !== 'string' ||
      !/^\+?[0-9 ()-]{8,20}$/.test(input.phone)
    )
      return fail('Vui lòng nhập tên và số điện thoại hợp lệ');
    const id = crypto.randomUUID();
    const clean = (room.vip ? c.vipClean : c.clean) * 60000;
    const price = JSON.stringify({
      config: c,
      base,
      listBase,
      promo,
      vip: room.vip,
      version: 2,
      ruleId: plan.ruleId,
      ruleLabel: plan.ruleLabel,
      pricingRevision: c.pricingRevision,
      estimated: plan.bill,
    });
    const result = await db()
      .prepare(
        "INSERT INTO bookings(id,tenant,room,customer,phone,service,people,start,end,status,segments,price,created) SELECT ?,?,?,?,?,?,?,?,?,?,'[]',?,? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE tenant=? AND room=? AND status <> 'cancelled' AND start < ? AND end > ?) AND NOT EXISTS (SELECT 1 FROM bookings WHERE tenant=? AND room=? AND status IN ('playing','paused') AND ? < ?)",
      )
      .bind(
        id,
        tenant,
        room.id,
        input.customer.trim(),
        input.phone,
        service,
        people,
        start,
        end + clean,
        'booked',
        price,
        now,
        tenant,
        room.id,
        end + clean,
        start,
        tenant,
        room.id,
        start,
        now + clean,
      )
      .run();
    if (!result.meta.changes)
      return fail('Phòng vừa có lịch trùng hoặc đang sử dụng. Vui lòng chọn giờ/phòng khác.', 409);
    await audit(tenant, 'Đặt lịch', `${room.name} · ${input.customer}`);
    return ok({ id });
  }
  if (input.action === 'walkin') {
    // A customer who walks in: the session starts and the meter runs now, with no prior booking.
    const customer = (input.customer ?? '').trim() || 'Khách vãng lai';
    const phone = (input.phone ?? '').trim();
    if (customer.length < 2 || customer.length > 100) return fail('Tên khách không hợp lệ');
    if (phone && !/^\+?[0-9 ()-]{8,20}$/.test(phone)) return fail('Số điện thoại không hợp lệ');
    let plan;
    try {
      plan = planBooking(
        {
          room: input.room ?? '',
          service: input.service ?? 'gdr',
          start: now,
          people: Number(input.people ?? 1),
          minutes: Number(input.minutes ?? 60),
        },
        c,
        now,
        { walkIn: true },
      );
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Không bắt đầu được lượt chơi');
    }
    const { room, base, listBase, promo } = plan;
    const clean = (room.vip ? c.vipClean : c.clean) * 60000;
    const id = crypto.randomUUID();
    const price = JSON.stringify({
      config: c,
      base,
      listBase,
      promo,
      vip: room.vip,
      version: 2,
      ruleId: plan.ruleId,
      ruleLabel: plan.ruleLabel,
      pricingRevision: c.pricingRevision,
      estimated: plan.bill,
      walkIn: true,
    });
    const started = await db()
      .prepare(
        "INSERT INTO bookings(id,tenant,room,customer,phone,service,people,start,end,status,segments,started,price,created) SELECT ?,?,?,?,?,?,?,?,?,'playing','[]',?,?,? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE tenant=? AND room=? AND status <> 'cancelled' AND start < ? AND end > ?) AND NOT EXISTS (SELECT 1 FROM bookings WHERE tenant=? AND room=? AND status IN ('playing','paused'))",
      )
      .bind(
        id,
        tenant,
        room.id,
        customer,
        phone,
        input.service ?? 'gdr',
        Number(input.people ?? 1),
        now,
        plan.end + clean,
        now,
        price,
        now,
        tenant,
        room.id,
        plan.end + clean,
        now,
        tenant,
        room.id,
      )
      .run();
    if (!started.meta.changes)
      return fail(
        'Line này đang có khách hoặc sắp có lịch đặt trong thời gian chơi. Hãy chọn line khác hoặc rút ngắn thời lượng.',
        409,
      );
    await audit(tenant, 'Vào chơi ngay', `${room.name} · ${customer}`);
    return ok({ id });
  }
  if (input.action === 'request-update') {
    if (!['received', 'done'].includes(input.status ?? '')) return fail('Trạng thái không hợp lệ');
    await db()
      .prepare('UPDATE requests SET status=? WHERE tenant=? AND id=?')
      .bind(input.status, tenant, input.id)
      .run();
    return ok();
  }
  const b = await db()
    .prepare('SELECT * FROM bookings WHERE tenant=? AND id=?')
    .bind(tenant, input.id)
    .first<Booking>();
  if (!b) return fail('Không tìm thấy phiên', 404);
  const segments: Segment[] = JSON.parse(b.segments);
  const snap = JSON.parse(b.price);
  const finished = b.finished,
    payment = b.payment;
  let status = b.status,
    started = b.started,
    amount = b.amount;
  if (input.action === 'start') {
    if (status !== 'booked') return fail('Chỉ bắt đầu lịch đã đặt');
    if (now < b.start - 15 * 60000) return fail('Chỉ bắt đầu trước lịch hẹn tối đa 15 phút');
    const conflict = await db()
      .prepare(
        "UPDATE bookings SET status='playing',started=? WHERE tenant=? AND id=? AND status='booked' AND NOT EXISTS(SELECT 1 FROM bookings x WHERE x.tenant=? AND x.room=? AND x.id<>? AND (x.status IN ('playing','paused') OR (x.status IN ('finished','paid') AND x.end>?)))",
      )
      .bind(now, tenant, b.id, tenant, b.room, b.id, now)
      .run();
    if (!conflict.meta.changes) return fail('Phòng đang được sử dụng hoặc đang dọn', 409);
    await audit(tenant, 'Bắt đầu', b.id);
    return ok();
  } else if (input.action === 'pause') {
    if (status !== 'playing' || started == null) return fail('Phiên chưa chạy');
    segments.push({ start: started, end: now });
    status = 'paused';
    started = null;
  } else if (input.action === 'resume') {
    if (status !== 'paused') return fail('Phiên chưa tạm dừng');
    status = 'playing';
    started = now;
  } else if (input.action === 'finish') {
    if (!['playing', 'paused'].includes(status)) return fail('Phiên chưa bắt đầu');
    if (status === 'playing' && started != null) segments.push({ start: started, end: now });
    try {
      amount = (
        b.service === 'gdr'
          ? quote(segments, snap.config, snap.vip)
          : wholeQuote(snap.base, snap.config, b.service as '9' | '18')
      ).total;
    } catch {
      amount = null;
    }
    const ended = await db()
      .prepare(FINISH_SESSION_SQL)
      .bind(
        JSON.stringify(segments),
        now,
        amount,
        amount,
        amount,
        now + (snap.vip ? snap.config.vipClean : snap.config.clean) * 60000,
        tenant,
        b.id,
        b.status,
        b.started,
      )
      .run();
    if (!ended.meta.changes) return fail('Phiên vừa thay đổi ở thiết bị khác. Hãy tải lại.', 409);
    await audit(tenant, 'Kết thúc', b.id);
    return ok();
  } else if (input.action === 'pay') {
    return fail('Thanh toán phải được ghi vào sổ ca tại màn hình mới. Hãy tải lại ứng dụng.', 409);
  } else if (input.action === 'cancel') {
    if (status !== 'booked') return fail('Chỉ hủy lịch chưa bắt đầu');
    status = 'cancelled';
  } else if (input.action === 'no-show') {
    // A customer who has not come 10 minutes after the start: the line is freed and the CRM follows up.
    if (status !== 'booked') return fail('Chỉ ghi nhận không đến cho lịch chưa bắt đầu');
    if (now < b.start + 10 * 60000) return fail('Chỉ ghi nhận khách không đến sau giờ hẹn 10 phút');
    status = 'cancelled';
  } else if (input.action === 'extend') {
    if (b.service !== 'gdr') return fail('Chỉ gia hạn lượt luyện tập tính theo giờ');
    if (!['booked', 'playing', 'paused'].includes(status))
      return fail('Phiên không còn gia hạn được');
    const minutes = Number(input.minutes);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 240 || minutes % 15 !== 0)
      return fail('Gia hạn từ 15 đến 240 phút, mỗi bước 15 phút');
    const clean = (snap.vip ? snap.config.vipClean : snap.config.clean) * 60000;
    const newEnd = b.end + minutes * 60000;
    // The next customer of this room must not be pushed back.
    const clash = await db()
      .prepare(
        "SELECT start FROM bookings WHERE tenant=? AND room=? AND id<>? AND status<>'cancelled' AND start<? AND end>? ORDER BY start LIMIT 1",
      )
      .bind(tenant, b.room, b.id, newEnd, b.end)
      .first<{ start: number }>();
    if (clash)
      return fail(
        `Không gia hạn được: line này đã có khách đặt từ ${new Date(clash.start).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}`,
        409,
      );
    if (!withinOpening(b.start, newEnd - clean, c.open, c.close))
      return fail('Gia hạn vượt giờ đóng cửa', 409);
    const moved = await db()
      .prepare(
        "UPDATE bookings SET end=? WHERE tenant=? AND id=? AND end=? AND status IN ('booked','playing','paused')",
      )
      .bind(newEnd, tenant, b.id, b.end)
      .run();
    if (!moved.meta.changes) return fail('Phiên vừa thay đổi ở thiết bị khác. Hãy tải lại.', 409);
    await audit(tenant, 'Gia hạn', `${b.id} +${minutes} phút`);
    return ok({ end: newEnd });
  } else if (input.action === 'reschedule') {
    if (status !== 'booked') return fail('Chỉ đổi lịch chưa bắt đầu');
    const clean = (snap.vip ? snap.config.vipClean : snap.config.clean) * 60000;
    const created = await runClubAction(
      tenant,
      {
        action: 'book',
        room: input.room ?? b.room,
        service: b.service as 'gdr' | '9' | '18',
        start: input.start,
        people: b.people,
        minutes: b.service === 'gdr' ? Math.round((b.end - b.start - clean) / 60000) : 0,
        customer: b.customer,
        phone: b.phone,
        expectedRevision: c.pricingRevision,
      },
      now,
    );
    if (created.status !== 200 || typeof created.body.id !== 'string') return created;
    const cancelled = await runClubAction(tenant, { action: 'cancel', id: b.id }, now);
    if (cancelled.status !== 200) {
      await runClubAction(tenant, { action: 'cancel', id: created.body.id }, now);
      return cancelled;
    }
    await audit(tenant, 'Đổi lịch', `${b.id} → ${created.body.id}`);
    return ok({ id: created.body.id, previous: b.id });
  } else if (input.action === 'support') {
    if (!['playing', 'paused'].includes(status))
      return fail('Chỉ gửi hỗ trợ trong phiên đang sử dụng');
    if (!['Nhân viên hỗ trợ', 'Hỗ trợ thiết bị', 'Yêu cầu khác'].includes(input.kind ?? ''))
      return fail('Loại yêu cầu không hợp lệ');
    await db()
      .prepare("INSERT INTO requests VALUES (?,?,?,?,'new',?)")
      .bind(crypto.randomUUID(), tenant, b.id, input.kind, now)
      .run();
    return ok();
  } else return fail('Thao tác không được hỗ trợ');
  const updated = await db()
    .prepare(
      'UPDATE bookings SET status=?,segments=?,started=?,finished=?,amount=?,payment=?,end=CASE WHEN ? IS NOT NULL THEN ? ELSE end END WHERE tenant=? AND id=? AND status=? AND started IS ?',
    )
    .bind(
      status,
      JSON.stringify(segments),
      started,
      finished,
      amount,
      payment,
      finished,
      finished == null
        ? null
        : finished + (snap.vip ? snap.config.vipClean : snap.config.clean) * 60000,
      tenant,
      b.id,
      b.status,
      b.started,
    )
    .run();
  if (!updated.meta.changes) return fail('Phiên đã thay đổi ở thiết bị khác. Hãy tải lại.', 409);
  await audit(tenant, input.action, b.id);
  return ok();
}
