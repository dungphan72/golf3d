/** Tournament scoring rules: gross / net by handicap, ±Par, ranking and groups. Pure: no I/O. */

export const HOLE_CHOICES = [9, 18] as const;
export type Holes = (typeof HOLE_CHOICES)[number];
export const MIN_PAR = 3;
export const MAX_PAR = 6;
export const MAX_STROKES = 15;

/** A standard par for the holes of a new round; the organiser edits it to match the course played. */
export const DEFAULT_PARS_18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
export const defaultPars = (holes: Holes) => DEFAULT_PARS_18.slice(0, holes);

export type Score = number | null;
export type RoundDef = { id: string; no: number; name: string; holes: Holes; pars: number[] };
export type PlayerDef = { id: string; name: string; hcp10: number; group: string };
export type ScoreRow = { roundId: string; playerId: string; holes: Score[]; status: string };

export function parsProblem(holes: number, pars: unknown): string | null {
  if (!(HOLE_CHOICES as readonly number[]).includes(holes)) return 'Giải chơi 9 hoặc 18 hố';
  if (!Array.isArray(pars) || pars.length !== holes) return `Cần par của ${holes} hố`;
  for (const p of pars)
    if (!Number.isInteger(p) || p < MIN_PAR || p > MAX_PAR) return `Par mỗi hố từ ${MIN_PAR} đến ${MAX_PAR}`;
  return null;
}

/** Strokes per hole: whole numbers 1..15, or empty (not played yet). */
export function strokesProblem(holes: number, scores: unknown): string | null {
  if (!Array.isArray(scores) || scores.length !== holes) return `Cần điểm của ${holes} hố`;
  for (const s of scores)
    if (s !== null && (!Number.isInteger(s) || s < 1 || s > MAX_STROKES))
      return `Số gậy mỗi hố từ 1 đến ${MAX_STROKES}`;
  return null;
}

export const isComplete = (scores: Score[]) => scores.length > 0 && scores.every((s) => s != null);
export const grossOf = (scores: Score[]): number | null =>
  isComplete(scores) ? (scores as number[]).reduce((a, b) => a + b, 0) : null;
export const sumPars = (pars: number[]) => pars.reduce((a, b) => a + b, 0);
/** Strokes played so far, and how many holes are filled. */
export const progressOf = (scores: Score[]) => ({
  strokes: scores.reduce<number>((a, b) => a + (b ?? 0), 0),
  thru: scores.filter((s) => s != null).length,
});

/** Handicap is entered with one decimal (stored in tenths). A 9-hole round gets half of it. */
export const courseHcp = (hcp10: number, holes: number) => Math.round(((hcp10 / 10) * holes) / 18);
export const hcpText = (hcp10: number) => (hcp10 / 10).toFixed(hcp10 % 10 === 0 ? 0 : 1);

/** A, B or C from the handicap; the organiser can overwrite it per golfer. */
export function groupFor(hcp10: number): string {
  const h = hcp10 / 10;
  return h <= 12 ? 'A' : h <= 24 ? 'B' : 'C';
}
export const GROUPS = ['A', 'B', 'C'] as const;

/** The colour class of one hole against par on the score card. */
export function holeTone(stroke: number | null, par: number): 'eagle' | 'birdie' | 'par' | 'bogey' | 'double' | 'empty' {
  if (stroke == null) return 'empty';
  const d = stroke - par;
  return d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 0 ? 'par' : d === 1 ? 'bogey' : 'double';
}

export const toParText = (n: number) => (n > 0 ? `+${n}` : n === 0 ? 'E' : String(n));

export type BoardRow = {
  playerId: string;
  name: string;
  group: string;
  hcp10: number;
  rounds: number;
  gross: number | null;
  net: number | null;
  toPar: number | null;
  rank: number | null;
};

/**
 * Ranking of confirmed, completed rounds. `roundId` = one round, or null = all rounds added up.
 * Order: lowest net, then lowest gross; equal net and gross share a rank. Golfers with no completed
 * round are listed last without a rank.
 */
export function leaderboard(
  players: PlayerDef[],
  rounds: RoundDef[],
  scores: ScoreRow[],
  opts: { roundId?: string | null; group?: string | null } = {},
): BoardRow[] {
  const byId = new Map(rounds.map((r) => [r.id, r]));
  const rows: BoardRow[] = [];
  for (const p of players) {
    if (opts.group && p.group !== opts.group) continue;
    let gross = 0,
      par = 0,
      hcp = 0,
      played = 0;
    for (const s of scores) {
      if (s.playerId !== p.id || s.status !== 'confirmed') continue;
      if (opts.roundId && s.roundId !== opts.roundId) continue;
      const r = byId.get(s.roundId);
      const g = grossOf(s.holes);
      if (!r || g == null) continue;
      gross += g;
      par += sumPars(r.pars);
      hcp += courseHcp(p.hcp10, r.holes);
      played++;
    }
    rows.push({
      playerId: p.id,
      name: p.name,
      group: p.group,
      hcp10: p.hcp10,
      rounds: played,
      gross: played ? gross : null,
      net: played ? gross - hcp : null,
      toPar: played ? gross - par : null,
      rank: null,
    });
  }
  const done = rows.filter((r) => r.net != null);
  done.sort((a, b) => a.net! - b.net! || a.gross! - b.gross! || a.name.localeCompare(b.name, 'vi'));
  done.forEach((r, i) => {
    const prev = done[i - 1];
    r.rank = prev && prev.net === r.net && prev.gross === r.gross ? prev.rank : i + 1;
  });
  const rest = rows.filter((r) => r.net == null).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return [...done, ...rest];
}
