export async function call<T = Record<string, any>>( // eslint-disable-line @typescript-eslint/no-explicit-any
  url: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    ...(body
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
  const v = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
  return v as T;
}

export const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const fmt = (ms: number, o: Intl.DateTimeFormatOptions) =>
  new Date(ms).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', ...o });
export const stamp = (ms: number | null | undefined) =>
  ms ? fmt(ms, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
export const dateOnly = (ms: number | null | undefined) =>
  ms ? fmt(ms, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
/** datetime-local value (Vietnam wall clock) to a timestamp. */
export const toMs = (local: string) => Date.parse(local + ':00+07:00');

/** "còn 2 giờ 5 phút" / "quá hạn 15 phút" */
export function countdown(due: number | null | undefined, now: number) {
  if (due == null) return { text: '—', late: false };
  const diff = due - now;
  const abs = Math.abs(diff);
  const m = Math.floor(abs / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const t = d >= 1 ? `${d} ngày ${h % 24} giờ` : h >= 1 ? `${h} giờ ${m % 60} phút` : `${m} phút`;
  return { text: diff < 0 ? `quá hạn ${t}` : `còn ${t}`, late: diff < 0 };
}

export type Lead = {
  id: string;
  fullName: string;
  phone: string;
  phoneNorm: string;
  email: string;
  notes: string;
  source: string;
  targetService: string;
  stage: string;
  statusId: string;
  owner: string | null;
  lostReason: string;
  expectedValue: number;
  budget: number;
  lastContactAt: number | null;
  inquiryCount: number;
  nextAction: string;
  nextDue: number | null;
  callAttempts: number;
  labels: string;
  created: number;
  masked?: boolean;
};
export type Staff = { id: string; name: string; email: string; role: string; active?: boolean };
