/** First-response time: how long a lead waited between getting an owner and the first contact. Pure: no I/O. */

export type ResponseRow = {
  owner: string;
  ownerName: string;
  team: string;
  source: string;
  /** Calendar minutes from owner assigned to first contact; null while nobody has contacted the lead. */
  minutes: number | null;
  /** Same, counting only working hours. */
  workMinutes: number | null;
};

export type ResponseStats = {
  leads: number;
  responded: number;
  avgMin: number | null;
  medianMin: number | null;
  avgWorkMin: number | null;
  /** Share of responded leads contacted within the SLA (0-100), null when nobody was contacted. */
  withinSlaPct: number | null;
};

const avg = (v: number[]) => (v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null);
export function median(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

export function statsOf(rows: ResponseRow[], slaMinutes: number): ResponseStats {
  const done = rows.filter((r) => r.minutes != null) as (ResponseRow & { minutes: number })[];
  const work = done.filter((r) => r.workMinutes != null).map((r) => r.workMinutes as number);
  const within = done.filter((r) => r.minutes <= slaMinutes).length;
  return {
    leads: rows.length,
    responded: done.length,
    avgMin: avg(done.map((r) => r.minutes)),
    medianMin: median(done.map((r) => r.minutes)),
    avgWorkMin: avg(work),
    withinSlaPct: done.length ? Math.round((within / done.length) * 100) : null,
  };
}

/** Stats per value of `key` (staff, team or source), slowest average first so problems show at the top. */
export function groupStats(
  rows: ResponseRow[],
  key: (r: ResponseRow) => string,
  slaMinutes: number,
): ({ name: string } & ResponseStats)[] {
  const groups = new Map<string, ResponseRow[]>();
  for (const r of rows) {
    const k = key(r) || 'Không rõ';
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([name, list]) => ({ name, ...statsOf(list, slaMinutes) }))
    .sort((a, b) => (b.avgMin ?? -1) - (a.avgMin ?? -1) || b.leads - a.leads);
}

/** "5 phút", "1 giờ 20 phút", "2 ngày 3 giờ"; "—" when unknown. */
export function durationText(min: number | null | undefined): string {
  if (min == null) return '—';
  if (min < 60) return `${min} phút`;
  if (min < 1440) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} giờ ${m} phút` : `${h} giờ`;
  }
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  return h ? `${d} ngày ${h} giờ` : `${d} ngày`;
}
