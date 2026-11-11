import { rooms, ready, quote, wholeQuote, type Config } from './club.ts';
import { clockMinute, packagePrice, type Service } from './pricing.ts';
export const BOOKING_START_STEP_MS = 15 * 60_000;
export const STAFF_BOOKING_MAX_DAYS = 90;
const DAY_MS = 24 * 60 * 60_000;

export function nextBookingStart(now: number) {
  return Math.ceil((now + 60_000) / BOOKING_START_STEP_MS) * BOOKING_START_STEP_MS;
}

export function latestStaffBookingStart(now: number) {
  return Math.floor((now + STAFF_BOOKING_MAX_DAYS * DAY_MS) / BOOKING_START_STEP_MS) *
    BOOKING_START_STEP_MS;
}

export function bookingDateTimeLocal(start: number) {
  return new Date(start + 7 * 60 * 60_000).toISOString().slice(0, 16);
}

export type BookingInput = {
  room: string;
  service: Service;
  start: number;
  people: number;
  minutes: number;
};
export function withinOpening(start: number, end: number, open: string, close: string) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  const from = clockMinute(open),
    until = clockMinute(close);
  const d = new Date(start + 7 * 3600000),
    m =
      d.getUTCHours() * 60 +
      d.getUTCMinutes() +
      d.getUTCSeconds() / 60 +
      d.getUTCMilliseconds() / 60000;
  const duration = (end - start) / 60000;
  // Equal opening/closing denotes a continuous 24-hour facility.
  if (from === until) return duration <= 1440;
  if (until > from) return m >= from && m + duration <= until;
  const position = m < until ? m + 1440 : m;
  return position >= from && position + duration <= until + 1440;
}
export function planBooking(
  input: BookingInput,
  c: Config,
  now: number,
  opts: { walkIn?: boolean; onlineRequest?: boolean } = {},
) {
  if (!ready(c))
    throw new Error('Hãy cấu hình giờ mở cửa, sức chứa, VAT và phí dịch vụ trước khi đặt thử.');
  const room = rooms.find((r) => r.id === input.room);
  if (!room) throw new Error('Phòng không hợp lệ');
  const { start, people, minutes, service } = input;
  if (
    !['gdr', '9', '18'].includes(service) ||
    !Number.isInteger(people) ||
    people < 1 ||
    people > Math.min(4, (room.vip ? c.vipCapacity : c.capacity)!)
  )
    throw new Error('Số người hoặc dịch vụ không hợp lệ');
  // Walk-ins start now; staff bookings must use a future 15-minute mark.
  if (
    !Number.isSafeInteger(start) ||
    (!opts.walkIn && start <= now) ||
    (!opts.walkIn && !opts.onlineRequest && start > now + STAFF_BOOKING_MAX_DAYS * DAY_MS) ||
    (!opts.walkIn && start % BOOKING_START_STEP_MS !== 0)
  ) {
    if (!Number.isSafeInteger(start)) throw new Error('Giờ bắt đầu không hợp lệ.');
    if (!opts.walkIn && start <= now) throw new Error('Giờ bắt đầu phải ở tương lai.');
    if (!opts.walkIn && !opts.onlineRequest && start > now + STAFF_BOOKING_MAX_DAYS * DAY_MS)
      throw new Error('Nhân viên chỉ có thể đặt lịch trước tối đa 90 ngày.');
    throw new Error('Giờ bắt đầu phải theo mốc 15 phút.');
  }
  let end: number,
    base = 0,
    ruleId: string | null = null,
    ruleLabel: string | null = null,
    listBase = 0,
    promo: { id: string; name: string } | null = null;
  if (service === 'gdr') {
    if (!Number.isInteger(minutes) || minutes < 60 || minutes > 720 || (minutes - 60) % 30 !== 0)
      throw new Error('Luyện tập tối thiểu 60 phút, tăng mỗi 30 phút.');
    end = start + minutes * 60000;
  } else {
    const price = packagePrice(start, c, service, room.vip, people);
    base = price.base;
    listBase = price.listBase;
    promo = price.promo;
    ruleId = price.ruleId;
    ruleLabel = price.label;
    const time = (service === '9' ? c.holeMinutes9 : c.holeMinutes18)[people - 1];
    if (!time) throw new Error('Chưa cấu hình thời lượng giữ phòng cho nhóm khách này.');
    end = start + (time + c.buffer) * 60000;
  }
  if (!withinOpening(start, end, c.open, c.close))
    throw new Error('Lượt chơi nằm ngoài giờ hoạt động.');
  const bill =
    service === 'gdr' ? quote([{ start, end }], c, room.vip) : wholeQuote(base, c, service);
  return {
    room,
    base,
    listBase,
    promo,
    end,
    reservedUntil: end + (room.vip ? c.vipClean : c.clean) * 60000,
    bill,
    ruleId,
    ruleLabel,
  };
}
