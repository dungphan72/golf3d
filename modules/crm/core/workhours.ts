/** Working hours (UTC+7). When disabled every clock simply runs. */
export type WorkHours = {
  enabled: boolean;
  /** 0 = Sunday ... 6 = Saturday */
  days: number[];
  /** minutes from midnight */
  start: number;
  end: number;
};
export const DEFAULT_WORK_HOURS: WorkHours = {
  enabled: false,
  days: [0, 1, 2, 3, 4, 5, 6],
  start: 480,
  end: 1320,
};

const MIN = 60_000;
const DAY = 86_400_000;
const VN = 7 * 3_600_000;
const local = (t: number) => {
  const l = t + VN;
  const dayStart = Math.floor(l / DAY) * DAY;
  return { dayStart, weekday: new Date(l).getUTCDay(), minute: Math.floor((l - dayStart) / MIN) };
};
const open = (wh: WorkHours, weekday: number) => wh.days.includes(weekday);

export function addWorkingMinutes(from: number, minutes: number, wh: WorkHours): number {
  if (!wh.enabled || wh.end <= wh.start) return from + minutes * MIN;
  let t = from;
  let left = minutes;
  for (let i = 0; i < 2000 && left > 0; i++) {
    const { dayStart, weekday, minute } = local(t);
    if (!open(wh, weekday) || minute >= wh.end) {
      t = dayStart + DAY - VN; // next local midnight
      continue;
    }
    if (minute < wh.start) {
      t += (wh.start - minute) * MIN;
      continue;
    }
    const take = Math.min(left, wh.end - minute);
    t += take * MIN;
    left -= take;
  }
  return t;
}

export function workMinutesBetween(a: number, b: number, wh: WorkHours): number {
  if (b <= a) return 0;
  if (!wh.enabled || wh.end <= wh.start) return Math.round((b - a) / MIN);
  let t = a;
  let total = 0;
  for (let i = 0; i < 5000 && t < b; i++) {
    const { dayStart, weekday, minute } = local(t);
    if (!open(wh, weekday) || minute >= wh.end) {
      t = dayStart + DAY - VN;
      continue;
    }
    if (minute < wh.start) {
      t += (wh.start - minute) * MIN;
      continue;
    }
    const end = Math.min(b, t + (wh.end - minute) * MIN);
    total += end - t;
    t = end;
  }
  return Math.round(total / MIN);
}
