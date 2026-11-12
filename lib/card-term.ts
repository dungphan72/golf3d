import { UNLIMITED, type Grant } from './member.ts';

/**
 * Term rules for prepaid cards (see docs/PRICING.md):
 *  - Hour card: when it expires with hours left, the customer renews it (pays the card again) and the
 *    leftover hours are added to the new card, which is valid for the package's term from the day of payment.
 *  - Monthly card (unlimited hours): must be activated within 30 days of purchase, otherwise the system
 *    activates it on day 30. The customer may report an absence of at least 7 consecutive days; those
 *    days are not counted, so the card's expiry moves out by the same number of days. A 1-month card
 *    allows 1 notice, a 3-month card 2, a 6-month card 3.
 */
export const DAY_MS = 86_400_000;
export const ACTIVATE_WITHIN_DAYS = 30;
export const MIN_ABSENCE_DAYS = 7;
export const REMIND_BEFORE_DAYS = 3;
const VN_OFFSET = 7 * 3_600_000;

export const isPeriodCard = (grants: Grant[]) => grants.some((g) => g.qty >= UNLIMITED);

/** 'YYYY-MM-DD' of a timestamp in club-local time (UTC+7). */
export const clubDay = (ms: number) => new Date(ms + VN_OFFSET).toISOString().slice(0, 10);
const dayNumber = (day: string) => Math.floor(Date.parse(day + 'T00:00:00Z') / DAY_MS);
export function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const t = Date.parse(day + 'T00:00:00Z');
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === day;
}
/** Calendar days from start to end, both included. */
export const inclusiveDays = (start: string, end: string) => dayNumber(end) - dayNumber(start) + 1;

/** Absence notices a card allows: 1 month → 1, 3 months → 2, 6 months → 3. */
export function maxAbsences(validDays: number) {
  const months = Math.max(1, Math.round(validDays / 30));
  return Math.max(1, Math.ceil(months / 2));
}

export type CardState = 'pending' | 'active' | 'expired';
export function cardState(c: {
  activatedAt: number | null;
  activateBy: number | null;
  expires: number;
  now: number;
}): CardState {
  if (c.activatedAt == null && c.activateBy != null) return c.activateBy < c.now ? 'active' : 'pending';
  return c.expires < c.now ? 'expired' : 'active';
}

/** Dates for a freshly sold card. Monthly cards start unactivated; others run from the purchase. */
export function termForSale(now: number, validDays: number, period: boolean) {
  if (!period) return { expires: now + validDays * DAY_MS, activatedAt: now, activateBy: null };
  const activateBy = now + ACTIVATE_WITHIN_DAYS * DAY_MS;
  // Until it is activated, expires is only the latest possible end (activation deadline + term).
  return { expires: activateBy + validDays * DAY_MS, activatedAt: null, activateBy };
}
/** Expiry once a card is activated at `at`, counting absences already reported. */
export const expiryOnActivation = (at: number, validDays: number, absenceDays = 0) =>
  at + (validDays + absenceDays) * DAY_MS;

export type Absence = { id: string; startDay: string; endDay: string; days: number };

/** Returns an error message for staff/customers, or null when the notice can be recorded. */
export function checkAbsence(i: {
  now: number;
  startDay: string;
  endDay: string;
  activated: boolean;
  expires: number;
  validDays: number;
  active: Absence[];
}): string | null {
  if (!validDay(i.startDay) || !validDay(i.endDay)) return 'Ngày vắng không hợp lệ';
  if (!i.activated) return 'Thẻ chưa kích hoạt nên chưa báo vắng được';
  if (i.expires < i.now) return 'Thẻ đã hết hạn';
  const today = clubDay(i.now);
  if (i.startDay <= today) return 'Chỉ báo vắng cho các ngày sau hôm nay';
  const days = inclusiveDays(i.startDay, i.endDay);
  if (days < MIN_ABSENCE_DAYS) return `Báo vắng tối thiểu ${MIN_ABSENCE_DAYS} ngày liên tục`;
  if (i.startDay > clubDay(i.expires)) return 'Ngày vắng nằm sau ngày hết hạn của thẻ';
  if (i.active.some((a) => i.startDay <= a.endDay && i.endDay >= a.startDay))
    return 'Trùng với lịch vắng đã báo';
  const max = maxAbsences(i.validDays);
  if (i.active.length >= max) return `Thẻ này chỉ được báo vắng tối đa ${max} lần`;
  return null;
}
export const absenceDays = (startDay: string, endDay: string) => inclusiveDays(startDay, endDay);
/** A notice can be cancelled until its first day; the slot is given back. */
export const canCancelAbsence = (now: number, startDay: string) => startDay > clubDay(now);

