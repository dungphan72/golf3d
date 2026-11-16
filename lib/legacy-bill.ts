/** Old (paper / pre-system) bills typed in by hand. Pure rules: no I/O. */

export const LEGACY_SERVICES = ['gdr', '9', '18', 'other'] as const;
export type LegacyService = (typeof LEGACY_SERVICES)[number];
export const LEGACY_SERVICE_LABEL: Record<LegacyService, string> = {
  gdr: 'Luyện tập theo giờ',
  '9': 'Chơi 9 hố',
  '18': 'Chơi 18 hố',
  other: 'Dịch vụ khác',
};
export const LEGACY_METHODS = ['cash', 'transfer', 'card', 'other'] as const;
export type LegacyMethod = (typeof LEGACY_METHODS)[number];
export const LEGACY_METHOD_LABEL: Record<LegacyMethod, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Thẻ',
  other: 'Khác',
};
export const LEGACY_STATUS_LABEL = {
  pending: 'Chờ chủ cơ sở duyệt',
  approved: 'Đã duyệt',
  rejected: 'Không duyệt',
} as const;
export type LegacyStatus = keyof typeof LEGACY_STATUS_LABEL;

/** One line of the bill. `fnb` marks food and drink so reports can show it apart. */
export type LegacyLine = { name: string; qty: number; price: number; fnb?: boolean };

export const MAX_LINES = 50;
export const MAX_TOTAL = 1_000_000_000;
const DAY_MS = 86_400_000;

export const lineAmount = (l: LegacyLine) => l.qty * l.price;
export const linesTotal = (lines: LegacyLine[]) => lines.reduce((s, l) => s + lineAmount(l), 0);
export const linesFood = (lines: LegacyLine[]) =>
  lines.reduce((s, l) => (l.fnb ? s + lineAmount(l) : s), 0);

/** Epoch ms of a Vietnam local date ("YYYY-MM-DD") and time ("HH:MM"), or null when invalid. */
export function billMoment(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const ms = Date.parse(`${date}T${time}:00+07:00`);
  if (!Number.isFinite(ms)) return null;
  // Reject impossible dates such as 2026-02-31 that Date.parse would roll over.
  const back = new Date(ms + 7 * 3_600_000).toISOString();
  return back.startsWith(date) ? ms : null;
}

/** An old bill is in the past (not later than now) and not older than ten years. */
export function momentProblem(ms: number, now: number): string | null {
  if (ms > now + 5 * 60_000) return 'Ngày giờ của bill không được ở tương lai';
  if (ms < now - 3650 * DAY_MS) return 'Bill quá cũ (tối đa 10 năm)';
  return null;
}

/** Returns a Vietnamese error message, or null when the lines can be saved. */
export function linesProblem(lines: LegacyLine[]): string | null {
  if (!lines.length) return 'Thêm ít nhất một dòng hàng';
  if (lines.length > MAX_LINES) return `Tối đa ${MAX_LINES} dòng`;
  for (const l of lines) {
    if (!l.name.trim()) return 'Mỗi dòng cần có tên';
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 10_000) return `Số lượng không hợp lệ: ${l.name}`;
    if (!Number.isInteger(l.price) || l.price < 0 || l.price > MAX_TOTAL)
      return `Đơn giá không hợp lệ: ${l.name}`;
  }
  const total = linesTotal(lines);
  if (!Number.isSafeInteger(total) || total <= 0) return 'Tổng tiền phải lớn hơn 0';
  if (total > MAX_TOTAL) return 'Tổng tiền quá lớn';
  return null;
}
