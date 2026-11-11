import { db, loadConfig, type ServiceResult } from './common';
import { turnstileSiteKey } from './turnstile';
import { runClubAction } from './club-service';
import { sendWebsiteLead } from './website-lead';
import { onBookingConfirmed } from './booking-messages';
import { BOOKING_START_STEP_MS, planBooking } from '../booking';
import { ready, rooms, type Config } from '../club';
import { normalizePhone, validPhone } from '../member';
import { newToken, tokenId } from '../auth/password';
import {
  publicRequestInput,
  staffRequestInput,
  codeLooksValid,
  SLUG_PATTERN,
  lineSizes,
  type PublicRequestInput,
  type StaffRequestInput,
} from '../online';
import {
  INSERT_REQUEST_SQL,
  CLAIM_REQUEST_SQL,
  RELEASE_REQUEST_SQL,
  CONFIRM_REQUEST_SQL,
  REJECT_REQUEST_SQL,
  CANCEL_REQUEST_SQL,
  REQUEST_BY_CODE_SQL,
  LIST_REQUESTS_SQL,
} from '../online-sql';

export { publicRequestInput, staffRequestInput };
type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);

export async function tenantBySlug(slug: string) {
  const row = await db()
    .prepare(
      "SELECT tenant FROM settings WHERE json_extract(value,'$.onlineSlug')=? AND json_extract(value,'$.onlineEnabled')=1",
    )
    .bind(slug)
    .first<{ tenant: string }>();
  if (!row) return null;
  const config = await loadConfig(row.tenant);
  return config.onlineEnabled && config.onlineSlug === slug
    ? { tenant: row.tenant, config }
    : null;
}

/** What the public page may know about the facility. */
export async function publicInfo(slug: string): Promise<R> {
  try {
    const site = await tenantBySlug(slug);
    if (!site) return error('Cơ sở chưa mở nhận đặt lịch online', 404);
    const c = site.config;
    return reply({
      name: c.name,
      address: c.address,
      open: c.open,
      close: c.close,
      vip: (c.vipCapacity ?? 0) > 0,
      maxPeople: Math.min(4, c.capacity ?? 4),
      services: ['gdr', '9', '18'],
      captchaSiteKey: turnstileSiteKey(),
    });
  } catch (e) {
    console.error('public info', e);
    return error('Chưa tải được thông tin cơ sở', 503);
  }
}

const REPRESENTATIVE = { standard: 'line-1', vip: 'vip-1' } as const;

export async function submitRequest(
  slug: string,
  raw: unknown,
  clientIp: string,
  base = '',
): Promise<R> {
  const parsed = publicRequestInput.safeParse(raw);
  if (!parsed.success) return error('Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.');
  const input: PublicRequestInput = parsed.data;
  const phone = normalizePhone(input.phone);
  if (!validPhone(phone)) return error('Số điện thoại không hợp lệ');
  try {
    const site = await tenantBySlug(slug);
    if (!site) return error('Cơ sở chưa mở nhận đặt lịch online', 404);
    const now = Date.now();
    const c = site.config;
    if (!Number.isSafeInteger(input.start) || input.start <= now)
      return error('Giờ bắt đầu phải ở tương lai');
    if (input.start % BOOKING_START_STEP_MS !== 0)
      return error('Giờ bắt đầu phải theo mốc 15 phút');
    if (input.vip && !(c.vipCapacity && c.vipCapacity > 0))
      return error('Cơ sở không có phòng VIP');
    // A line holds at most 4: a bigger group is priced line by line and booked on several lines.
    const sizes = input.guests > 0 ? lineSizes(input.guests) : [input.people];
    const perLine = Math.max(...sizes);
    let plan: ReturnType<typeof planBooking> | undefined;
    let total: number | null = null;
    if (ready(c)) {
      total = 0;
      try {
        for (const size of sizes) {
          const p = planBooking(
            {
              room: REPRESENTATIVE[input.vip ? 'vip' : 'standard'],
              service: input.service,
              start: input.start,
              people: size,
              minutes: input.minutes,
            },
            c,
            now,
            { onlineRequest: true },
          );
          plan ??= p;
          total += p.bill.total;
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Khung giờ này chưa nhận đặt';
        if (!message.startsWith('Chưa cấu hình') && !message.startsWith('Chưa có giá '))
          return error(message);
        plan = undefined;
        total = null;
      }
    }
    const code = newToken();
    const quote = JSON.stringify({
      total,
      ...(plan ? { bill: plan.bill, rule: plan.ruleLabel } : {}),
      guests: input.guests,
      lines: sizes.length,
    });
    const requestId = crypto.randomUUID();
    await db()
      .prepare(INSERT_REQUEST_SQL)
      .bind(
        requestId,
        site.tenant,
        await tokenId(code),
        input.name,
        phone,
        input.service,
        input.vip ? 1 : 0,
        perLine,
        input.start,
        input.service === 'gdr' ? input.minutes : 0,
        input.note,
        quote,
        await tokenId('ip:' + clientIp),
        now,
      )
      .run();
    // Every booking request is also a lead: it is assigned to the on-duty agent who must call within 5 minutes.
    await sendWebsiteLead(
      site.tenant,
      {
        name: input.name,
        phone,
        email: '',
        need: input.service === 'gdr' ? 'swing' : input.service,
        guests: input.guests > 0 ? input.guests : input.people,
        preferredStart: input.start,
        message: input.note,
        campaign: 'form-dat-lich',
        extKey: 'booking-form:' + requestId,
        consent: input.consent,
      },
      base,
      now,
    );
    return reply({ ok: true, code, total });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('RATE_LIMITED'))
      return error('Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.', 429);
    if (message.includes('TOO_MANY_PENDING'))
      return error('Số yêu cầu đang chờ đã đạt giới hạn. Vui lòng gọi trực tiếp cho cơ sở.', 429);
    if (message.includes('DUPLICATE_REQUEST'))
      return error('Bạn đã gửi yêu cầu này rồi. Nhân viên sẽ liên hệ sớm.', 409);
    console.error('submit request', e);
    return error('Chưa gửi được yêu cầu. Vui lòng thử lại.', 500);
  }
}

export async function requestStatus(code: string): Promise<R> {
  if (!codeLooksValid(code)) return error('Mã yêu cầu không hợp lệ', 404);
  try {
    const row = await db()
      .prepare(REQUEST_BY_CODE_SQL)
      .bind(await tokenId(code))
      .first<{
        status: string;
        service: string;
        vip: number;
        people: number;
        start: number;
        minutes: number;
        reason: string;
        quote: string;
      }>();
    if (!row) return error('Không tìm thấy yêu cầu', 404);
    const quote = JSON.parse(row.quote) as { total?: number | null; guests?: number };
    return reply({
      status: row.status,
      service: row.service,
      vip: !!row.vip,
      people: row.people,
      guests: quote.guests ?? 0,
      start: row.start,
      minutes: row.minutes,
      reason: row.status === 'rejected' ? row.reason : '',
      total: quote.total ?? null,
    });
  } catch (e) {
    console.error('request status', e);
    return error('Chưa tải được trạng thái', 503);
  }
}

export async function cancelRequest(code: string): Promise<R> {
  if (!codeLooksValid(code)) return error('Mã yêu cầu không hợp lệ', 404);
  const r = await db()
    .prepare(CANCEL_REQUEST_SQL)
    .bind(await tokenId(code))
    .run();
  return r.meta.changes
    ? reply({ ok: true })
    : error('Yêu cầu đã được xử lý nên không thể hủy tại đây. Vui lòng gọi cơ sở.', 409);
}

// ---- Staff side ----

type RequestRow = {
  id: string;
  service: 'gdr' | '9' | '18';
  vip: number;
  people: number;
  start: number;
  minutes: number;
  status: string;
  quote: string;
  [key: string]: unknown;
};

/** Rooms of the requested type that are free for the requested time (best-effort preview). */
async function freeRooms(tenant: string, row: RequestRow, c: Config, now: number) {
  const candidates = rooms.filter((r) => r.vip === !!row.vip);
  const free: { id: string; name: string }[] = [];
  for (const room of candidates) {
    try {
      const plan = planBooking(
        {
          room: room.id,
          service: row.service,
          start: row.start,
          people: row.people,
          minutes: row.minutes,
        },
        c,
        now,
        { onlineRequest: true },
      );
      const clean = (room.vip ? c.vipClean : c.clean) * 60_000;
      const clash = await db()
        .prepare(
          "SELECT 1 AS x FROM bookings WHERE tenant=? AND room=? AND status<>'cancelled' AND start<? AND end>? LIMIT 1",
        )
        .bind(tenant, room.id, plan.end + clean, row.start)
        .first();
      if (!clash) free.push({ id: room.id, name: room.name });
    } catch {
      break; // same plan failure for every room of the type (e.g. start already passed)
    }
  }
  return free;
}

export async function listRequests(tenant: string): Promise<R> {
  try {
    const c = await loadConfig(tenant);
    const rows = (await db().prepare(LIST_REQUESTS_SQL).bind(tenant).all<RequestRow>()).results;
    const now = Date.now();
    const requests = [];
    for (const row of rows) {
      requests.push({
        ...row,
        quote: JSON.parse(row.quote),
        freeRooms: row.status === 'pending' ? await freeRooms(tenant, row, c, now) : [],
        late: row.status === 'pending' && row.start < now,
      });
    }
    return reply({ requests, enabled: !!c.onlineEnabled, slug: c.onlineSlug ?? '' });
  } catch (e) {
    console.error('list requests', e);
    return error('Chưa tải được yêu cầu đặt online. Kiểm tra migration 0006.', 503);
  }
}

export async function applyRequest(
  tenant: string,
  actor: string,
  input: StaffRequestInput,
): Promise<R> {
  const d = db();
  const now = Date.now();
  try {
    if (input.action === 'reject') {
      const r = await d
        .prepare(REJECT_REQUEST_SQL)
        .bind(input.reason, actor, now, tenant, input.id)
        .run();
      return r.meta.changes
        ? reply({ ok: true })
        : error('Yêu cầu đã được xử lý hoặc không tồn tại', 409);
    }
    const row = await d
      .prepare('SELECT * FROM booking_requests WHERE tenant=? AND id=?')
      .bind(tenant, input.id)
      .first<{
        id: string;
        name: string;
        phone: string;
        service: 'gdr' | '9' | '18';
        vip: number;
        people: number;
        start: number;
        minutes: number;
        status: string;
      }>();
    if (!row) return error('Không tìm thấy yêu cầu', 404);
    if (row.status !== 'pending') return error('Yêu cầu đã được xử lý', 409);
    // A group of more than 4 is booked on one line per 4 players, each line in a different room.
    const guests = (JSON.parse((row as { quote?: string }).quote ?? '{}') as { guests?: number })
      .guests;
    const sizes = guests && guests > 4 ? lineSizes(guests) : [row.people];
    const picked = [input.room, ...input.extraRooms];
    if (picked.length !== sizes.length || new Set(picked).size !== picked.length)
      return error(`Nhóm này cần ${sizes.length} phòng khác nhau, một phòng cho mỗi line`);
    const chosen = picked.map((id) => rooms.find((r) => r.id === id));
    if (chosen.some((r) => !r || r.vip !== !!row.vip))
      return error('Phòng không đúng loại khách yêu cầu');
    const claim = await d.prepare(CLAIM_REQUEST_SQL).bind(actor, now, tenant, row.id).run();
    if (!claim.meta.changes) return error('Yêu cầu đang được nhân viên khác xử lý', 409);
    const c = await loadConfig(tenant);
    const made: string[] = [];
    for (const [i, room] of chosen.entries()) {
      const booked = await runClubAction(
        tenant,
        {
          action: 'book',
          room: room!.id,
          service: row.service,
          start: row.start,
          people: sizes[i],
          minutes: row.minutes,
          customer: row.name,
          phone: row.phone,
          expectedRevision: c.pricingRevision,
        },
        now,
        { onlineRequest: true },
      );
      if (booked.status !== 200 || typeof booked.body.id !== 'string') {
        // Undo the lines already booked so the request can be handled again.
        for (const id of made) await runClubAction(tenant, { action: 'cancel', id });
        await d.prepare(RELEASE_REQUEST_SQL).bind(tenant, row.id).run();
        return booked;
      }
      made.push(booked.body.id);
    }
    await d
      .prepare(CONFIRM_REQUEST_SQL)
      .bind(picked[0], made[0], actor, now, tenant, row.id, actor)
      .run();
    try {
      await onBookingConfirmed(
        tenant,
        { name: row.name, phone: row.phone },
        made.map((id, i) => ({
          id,
          room: picked[i],
          start: row.start,
          service: row.service,
          people: sizes[i],
        })),
      );
    } catch (e) {
      console.error('booking confirmation messages', e);
    }
    return reply({ ok: true, bookingId: made[0], bookingIds: made });
  } catch (e) {
    console.error('apply request', e);
    return error('Chưa xác minh được kết quả. Tải lại danh sách trước khi thử tiếp.', 500);
  }
}

/** Slug of the first club that accepts online booking, for the public landing page (null = none). */
export async function bookingSlug(): Promise<string | null> {
  try {
    const rows = (
      await db()
        .prepare(
          "SELECT json_extract(value,'$.onlineSlug') AS slug FROM settings WHERE json_extract(value,'$.onlineEnabled')=1 LIMIT 20",
        )
        .all<{ slug: string | null }>()
    ).results;
    for (const r of rows) {
      if (r.slug && SLUG_PATTERN.test(r.slug) && (await tenantBySlug(r.slug))) return r.slug;
    }
  } catch (e) {
    console.error('booking slug', e);
  }
  return null;
}
