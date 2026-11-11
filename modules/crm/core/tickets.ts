/** Support tickets: status, SLA deadline, who gets the ticket, and the summary numbers. Pure: no I/O. */

export const STATUSES = ['new', 'in_progress', 'waiting', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Mới',
  in_progress: 'Đang xử lý',
  waiting: 'Chờ khách',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng',
};

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof PRIORITIES)[number];
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Thấp',
  normal: 'Thường',
  high: 'Cao',
  urgent: 'Khẩn',
};
/** Hours to the first resolution, by priority. */
export const SLA_HOURS: Record<TicketPriority, number> = { low: 72, normal: 24, high: 8, urgent: 2 };

export const CATEGORIES = ['complaint', 'support', 'equipment', 'billing', 'booking', 'other'] as const;
export type TicketCategory = (typeof CATEGORIES)[number];
export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  complaint: 'Khiếu nại',
  support: 'Yêu cầu hỗ trợ',
  equipment: 'Sự cố thiết bị',
  billing: 'Hóa đơn, thanh toán',
  booking: 'Đặt lịch',
  other: 'Khác',
};

export const isOpen = (s: TicketStatus) => s === 'new' || s === 'in_progress' || s === 'waiting';
/** The SLA clock runs while the club has to act: not while waiting for the customer, not once resolved. */
export const slaRunning = (s: TicketStatus) => s === 'new' || s === 'in_progress';

export const slaDue = (priority: TicketPriority, created: number) => created + SLA_HOURS[priority] * 3_600_000;

export type TicketLite = {
  status: TicketStatus;
  dueAt: number;
  created: number;
  resolvedAt: number | null;
  rating: number | null;
  assignee: string | null;
};

export const isOverdue = (t: Pick<TicketLite, 'status' | 'dueAt'>, now: number) => slaRunning(t.status) && now > t.dueAt;

/** A ticket may only move forward or be reopened; closing needs it to be resolved or still open (not already closed). */
export function canMove(from: TicketStatus, to: TicketStatus, manager: boolean): boolean {
  if (from === to) return false;
  if (from === 'closed') return manager && to === 'in_progress'; // only a manager reopens a closed ticket
  return (STATUSES as readonly string[]).includes(to);
}

/** Satisfaction score is only asked once the work is done. */
export const canRate = (s: TicketStatus) => s === 'resolved' || s === 'closed';

/**
 * Who gets a new ticket: the available person with the fewest open tickets (first in the list on a tie, which
 * the caller sorts by name so the choice is stable). Null when nobody is available.
 */
export function pickAssignee(candidates: { id: string }[], openCounts: Record<string, number>): string | null {
  let best: string | null = null;
  let bestN = Infinity;
  for (const c of candidates) {
    const n = openCounts[c.id] ?? 0;
    if (n < bestN) {
      best = c.id;
      bestN = n;
    }
  }
  return best;
}

export type Summary = {
  open: number;
  overdue: number;
  waiting: number;
  resolvedInPeriod: number;
  avgRating: number | null;
  rated: number;
  /** Average hours from created to resolved, for tickets resolved in the period. */
  avgResolveHours: number | null;
};

export function summarize(tickets: TicketLite[], now: number, since: number): Summary {
  const resolved = tickets.filter((t) => t.resolvedAt != null && t.resolvedAt >= since);
  const rated = tickets.filter((t) => t.rating != null && t.resolvedAt != null && t.resolvedAt >= since);
  const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
  const ratingAvg = avg(rated.map((t) => t.rating as number));
  const hoursAvg = avg(resolved.map((t) => ((t.resolvedAt as number) - t.created) / 3_600_000));
  return {
    open: tickets.filter((t) => isOpen(t.status)).length,
    overdue: tickets.filter((t) => isOverdue(t, now)).length,
    waiting: tickets.filter((t) => t.status === 'waiting').length,
    resolvedInPeriod: resolved.length,
    avgRating: ratingAvg == null ? null : Math.round(ratingAvg * 10) / 10,
    rated: rated.length,
    avgResolveHours: hoursAvg == null ? null : Math.round(hoursAvg * 10) / 10,
  };
}

export const ticketCode = (n: number) => 'TK-' + String(n).padStart(4, '0');

export function validateNew(i: { subject: string; description: string; category: string; priority: string }): string | null {
  if (i.subject.trim().length < 3) return 'Hãy nhập tiêu đề (ít nhất 3 ký tự)';
  if (!(CATEGORIES as readonly string[]).includes(i.category)) return 'Loại ticket không hợp lệ';
  if (!(PRIORITIES as readonly string[]).includes(i.priority)) return 'Mức ưu tiên không hợp lệ';
  if (i.description.length > 4000) return 'Mô tả quá dài';
  return null;
}
