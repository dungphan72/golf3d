import { type LeadSource } from '../../../lib/leads';

export type Lead = {
  id: string;
  customer_id: string | null;
  name: string;
  phone: string;
  source: LeadSource;
  campaign: string;
  lost_reason: string;
  channel_ref: string;
  need: string;
  guests: number;
  message: string;
  status: 'queued' | 'assigned' | 'contacted' | 'booked' | 'lost';
  assignee: string | null;
  assignee_name: string | null;
  due_at: number | null;
  first_call_at: number | null;
  received_at: number;
  contacts: number;
  marketing_consent: number | null;
  stage: string;
  interest: string;
  budget: number;
  tags: string;
  note: string;
  deal_value: number;
  next_at: number | null;
  next_note: string;
  missed: number;
};
export const tagsOf = (l: Lead): string[] => {
  try {
    const v = JSON.parse(l.tags) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};
export type Avail = {
  lines: number;
  freeRooms: { id: string; name: string }[];
  enough: boolean;
  totalText: string;
  note: string;
  alternatives: { start: number; label: string; free: number }[];
};

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
export const stamp = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
export const mmss = (ms: number) => {
  const s = Math.abs(Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const toMs = (local: string) => Date.parse(local + ':00+07:00');
