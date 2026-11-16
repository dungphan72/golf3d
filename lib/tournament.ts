/**
 * Tournament admin helpers. A tournament is a `posts` row of kind "event": nothing here needs a new
 * column. Format, prizes and conditions are kept as labelled paragraphs inside the post body, so the
 * public page (which shows the body as plain paragraphs) still reads naturally.
 */
export type Sections = { other: string; format: string; prizes: string; rules: string };

const LABELS: { key: Exclude<keyof Sections, 'other'>; label: string }[] = [
  { key: 'format', label: 'Thể thức' },
  { key: 'prizes', label: 'Giải thưởng' },
  { key: 'rules', label: 'Điều kiện' },
];
const LABEL_RE = new RegExp(`^(${LABELS.map((l) => l.label).join('|')})\\s*:\\s*(.*)$`);

/** Splits a post body into the labelled sections and the free text (anything before/outside them). */
export function parseBody(body: string): Sections {
  const out: Sections = { other: '', format: '', prizes: '', rules: '' };
  let current: keyof Sections = 'other';
  const buf: Record<keyof Sections, string[]> = { other: [], format: [], prizes: [], rules: [] };
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    const m = LABEL_RE.exec(line);
    if (m) {
      current = LABELS.find((l) => l.label === m[1])!.key;
      buf[current].push(m[2]);
    } else buf[current].push(line);
  }
  for (const k of Object.keys(out) as (keyof Sections)[]) out[k] = buf[k].join('\n').trim();
  return out;
}

/** Inverse of parseBody: free text first, then each non-empty section under its label. */
export function composeBody(s: Sections): string {
  const parts: string[] = [];
  if (s.other.trim()) parts.push(s.other.trim());
  for (const { key, label } of LABELS) if (s[key].trim()) parts.push(`${label}: ${s[key].trim()}`);
  return parts.join('\n\n');
}

export type TournamentStatus = 'draft' | 'live' | 'upcoming' | 'ended';
const VN = 7 * 3_600_000;
const DAY = 86_400_000;
const dayIndex = (ms: number) => Math.floor((ms + VN) / DAY);

/** draft; or, once published, by the event day in Vietnam time: today = live, later = upcoming, earlier = ended. */
export function tournamentStatus(
  p: { status: 'draft' | 'published'; event_at: number | null },
  now = Date.now(),
): TournamentStatus {
  if (p.status === 'draft') return 'draft';
  if (p.event_at == null) return 'upcoming';
  const d = dayIndex(p.event_at) - dayIndex(now);
  return d === 0 ? 'live' : d > 0 ? 'upcoming' : 'ended';
}

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: 'Bản nháp',
  live: 'Đang diễn ra',
  upcoming: 'Sắp diễn ra',
  ended: 'Đã kết thúc',
};
