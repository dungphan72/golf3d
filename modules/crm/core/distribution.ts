/** Lead distribution among sales staff. */
export type DistributionConfig = {
  mode: 'FAIR' | 'WEIGHTED';
  weights: Record<string, number>;
  paused: string[];
  returnToPrevious: boolean;
  bySource: Record<string, string[]>;
};
export const DEFAULT_DISTRIBUTION: DistributionConfig = {
  mode: 'FAIR',
  weights: {},
  paused: [],
  returnToPrevious: true,
  bySource: {},
};

export type Pick = { owner: string | null; reason: 'RETURN' | 'BALANCED' | 'NONE' };

export function pickAssignee(o: {
  candidates: string[];
  openCounts: Record<string, number>;
  cfg: DistributionConfig;
  source?: string | null;
  previousOwner?: string | null;
}): Pick {
  const { cfg } = o;
  const weight = (c: string) => (cfg.mode === 'FAIR' ? 1 : (cfg.weights[c] ?? 1));
  const receiving = o.candidates.filter((c) => !cfg.paused.includes(c) && weight(c) > 0);
  if (o.previousOwner && cfg.returnToPrevious && receiving.includes(o.previousOwner))
    return { owner: o.previousOwner, reason: 'RETURN' };
  const restricted = o.source ? cfg.bySource[o.source] : undefined;
  const pool = restricted?.length ? receiving.filter((c) => restricted.includes(c)) : receiving;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of pool) {
    const score = ((o.openCounts[c] ?? 0) + 1) / weight(c);
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best ? { owner: best, reason: 'BALANCED' } : { owner: null, reason: 'NONE' };
}
