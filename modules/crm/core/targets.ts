/** Monthly revenue targets and progress. Pure: no I/O. Months are Vietnam local months (UTC+7). */

const VN = 7 * 3_600_000;
export const MAX_TARGET = 10_000_000_000;

export type Targets = { club: number; staff: Record<string, number> };

/** "2026-11" for the Vietnam month that contains `ms`. */
export const monthKey = (ms: number) => new Date(ms + VN).toISOString().slice(0, 7);
export const validMonth = (m: unknown): m is string => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

/** Start (inclusive) and end (exclusive) of a month as timestamps, plus how many days it has. */
export function monthRange(key: string) {
  const [y, m] = key.split('-').map(Number);
  const start = Date.UTC(y, m - 1, 1) - VN;
  const end = Date.UTC(y, m, 1) - VN;
  return { start, end, days: Math.round((end - start) / 86_400_000) };
}

const money = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_TARGET) : 0;
};

/** Cleans stored or posted targets: non-negative whole amounts, zero targets dropped, only strings as staff ids. */
export function sanitizeTargets(raw: unknown): Targets {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const staff: Record<string, number> = {};
  if (r.staff && typeof r.staff === 'object')
    for (const [id, v] of Object.entries(r.staff as Record<string, unknown>)) {
      const n = money(v);
      if (id && id.length <= 100 && n > 0) staff[id] = n;
    }
  return { club: money(r.club), staff };
}

export type Progress = {
  target: number;
  actual: number;
  /** Still to collect; 0 once the target is reached. */
  remaining: number;
  /** Share of the target reached, 0-100 (above 100 when exceeded); null when no target is set. */
  pct: number | null;
  /** Where a steady pace would be today. */
  expected: number;
  /** If the pace so far continues until the end of the month. */
  forecast: number;
  state: 'none' | 'ahead' | 'on-track' | 'behind' | 'reached';
};

/**
 * Progress of `actual` against `target` for the month `key`, judged on `now`.
 * - past month: the final result (forecast = actual);
 * - future month: nothing collected yet, so everything is still to do.
 */
export function progress(target: number, actual: number, key: string, now: number): Progress {
  const { start, end, days } = monthRange(key);
  const done = now >= end ? days : now < start ? 0 : Math.min(days, Math.floor((now - start) / 86_400_000) + 1);
  const expected = target > 0 ? Math.round((target * done) / days) : 0;
  const forecast = done >= days ? actual : done > 0 ? Math.round((actual / done) * days) : 0;
  let state: Progress['state'] = 'none';
  if (target > 0) {
    if (actual >= target) state = 'reached';
    else if (now >= end) state = 'behind'; // the month is over and the target was missed
    else if (actual >= expected * 1.1) state = 'ahead';
    else if (actual >= expected * 0.9) state = 'on-track';
    else state = 'behind';
  }
  return {
    target,
    actual,
    remaining: Math.max(0, target - actual),
    pct: target > 0 ? Math.round((actual / target) * 100) : null,
    expected,
    forecast,
    state,
  };
}

export const STATE_LABELS: Record<Progress['state'], string> = {
  none: 'Chưa đặt mục tiêu',
  ahead: 'Vượt tiến độ',
  'on-track': 'Đúng tiến độ',
  behind: 'Chậm tiến độ',
  reached: 'Đã đạt mục tiêu',
};
