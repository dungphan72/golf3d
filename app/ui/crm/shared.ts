import { type Channel, type CrmTask, type Segment } from '../../../lib/crm';

export type Counts = { overdue: number; today: number; upcoming: number; doneWeek: number };
export type CustomerRow = {
  email: string;
  zalo_id: string;
  marketing_consent: number;
  id: string;
  name: string;
  phone: string;
  birthday: string;
  created: number;
  visits: number;
  last_visit: number | null;
  spend: number;
  points: number;
  open_tasks: number;
  account: number | null;
  segments: Segment[];
};
export type LeadInfo = {
  leads: {
    id: string;
    status: string;
    source: string;
    campaign: string;
    need: string;
    assignee_name: string | null;
    due_at: number | null;
    first_call_at: number | null;
    received_at: number;
  }[];
  events: {
    id: string;
    kind: string;
    detail: string;
    created: number;
    actor_name: string | null;
  }[];
};
export const EVENT_TEXT: Record<string, (d: Record<string, unknown>) => string> = {
  received: (d) => `Tiếp nhận lead từ ${d.source}${d.campaign ? ` (${d.campaign})` : ''}`,
  contact: (d) => `Khách liên hệ lại qua ${d.source}`,
  assigned: (d) =>
    `Giao cho ${d.to}${d.mode === 'reassigned' ? ' (chuyển vì nhân viên trước chưa gọi)' : ''}`,
  queued: () => 'Vào hàng chờ: chưa có nhân viên trực',
  overdue: (d) => `Quá hạn 5 phút${d.agent ? `: ${d.agent} chưa ghi nhận cuộc gọi` : ''}`,
  call: (d) =>
    `Cuộc gọi: ${d.label}${d.note ? `. ${d.note}` : ''}${d.seconds != null ? ` (phản hồi sau ${Math.round(Number(d.seconds) / 60)} phút)` : ''}`,
  replied: (d) => `${d.label}${d.note ? `. ${d.note}` : ''}`,
  claimed: () => 'Nhân viên nhận lead',
  booked: () => 'Đã đặt lịch',
  lost: (d) => `Không đặt: ${d.reason}`,
  link_sent: (d) => (d.manual ? 'Tạo link đặt lịch (gửi thủ công)' : 'Gửi link đặt lịch cho khách'),
  notify_gap: (d) => String(d.reason ?? 'Không có kênh thông báo'),
};
export type Detail = {
  customer: CustomerRow;
  visits: { id: string; service: string; room: string; finished: number; amount: number }[];
  packages: { id: string; name: string; expires: number; balances: string | null }[];
  interactions: {
    id: string;
    channel: Channel;
    content: string;
    created: number;
    actor_name: string | null;
  }[];
  tasks: CrmTask[];
  now: number;
};

export const DAY = 86_400_000;
export const SERVICE: Record<string, string> = {
  gdr: 'Luyện tập',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
};
export const day = (ms: number) =>
  new Date(ms).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const stamp = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export async function call(url: string, body?: Record<string, unknown>) {
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    ...(body
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
  const v = (await r.json()) as Record<string, unknown> & { error?: string };
  if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
  return v;
}
export const zaloLink = (phone: string) => `https://zalo.me/${phone}`;

export function dueText(due: number, now: number) {
  const startToday = Math.floor((now + 7 * 3_600_000) / DAY) * DAY - 7 * 3_600_000;
  if (due < startToday) return `quá hạn ${Math.ceil((startToday - due) / DAY)} ngày`;
  if (due < startToday + DAY) return 'hôm nay';
  return day(due);
}
