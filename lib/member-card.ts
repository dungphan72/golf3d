// Member card facts that need no extra storage: the code comes from the customer id, the tier from live packages.

/** Printed on the card and encoded in its QR. Short enough to read out at the counter. */
export const memberCode = (customerId: string) =>
  'HV-' + customerId.replaceAll('-', '').slice(0, 8).toUpperCase();

/** "HV-1A2B3C4D" or "hv1a2b3c4d" -> the lower-case 8 hex digits an id starts with; anything else -> null. */
export function parseMemberCode(text: string): string | null {
  const m = /^HV-?([0-9a-f]{8})$/i.exec(text.trim());
  return m ? m[1].toLowerCase() : null;
}

export type Tier = 'diamond' | 'platinum' | 'gold' | 'member' | 'guest';
export const TIER_LABEL: Record<Tier, string> = {
  diamond: 'Diamond',
  platinum: 'Platinum',
  gold: 'Gold',
  member: 'Hội viên',
  guest: 'Thành viên',
};

/** Money a member has spent (đồng) that lifts them to each rank. Editable in Settings. */
export type TierThresholds = { gold: number; platinum: number; diamond: number };
export const DEFAULT_TIER_THRESHOLDS: TierThresholds = {
  gold: 50_000_000,
  platinum: 80_000_000,
  diamond: 100_000_000,
};

/** Stored thresholds if they make sense (whole, positive, rising); otherwise the defaults. */
export function tierThresholds(raw?: Partial<TierThresholds> | null): TierThresholds {
  const g = raw?.gold;
  const p = raw?.platinum;
  const d = raw?.diamond;
  const whole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
  return whole(g) && whole(p) && whole(d) && g < p && p < d
    ? { gold: g, platinum: p, diamond: d }
    : DEFAULT_TIER_THRESHOLDS;
}

/** What the server sends about a member's rank (see tier-service). */
export type Rank = {
  tier: Tier;
  spent: number;
  thresholds: TierThresholds;
  next: { tier: Tier; need: number } | null;
};

/** Rank from total spending alone: null while below the Gold line. */
export function tierBySpend(spent: number, t: TierThresholds): Tier | null {
  if (spent >= t.diamond) return 'diamond';
  if (spent >= t.platinum) return 'platinum';
  if (spent >= t.gold) return 'gold';
  return null;
}

/** The rank to show: by spending, else "Hội viên" for someone holding a live package, else "Thành viên". */
export function memberTier(spent: number, hasLivePackage: boolean, t: TierThresholds): Tier {
  return tierBySpend(spent, t) ?? (hasLivePackage ? 'member' : 'guest');
}

/** The next rank up and how much more spending it takes; null at the top. */
export function nextTier(spent: number, t: TierThresholds): { tier: Tier; need: number } | null {
  if (spent < t.gold) return { tier: 'gold', need: t.gold - spent };
  if (spent < t.platinum) return { tier: 'platinum', need: t.platinum - spent };
  if (spent < t.diamond) return { tier: 'diamond', need: t.diamond - spent };
  return null;
}

/** The best card among packages still in date: VIP Diamond, then VIP Platinum, then any package. */
export function tierOf(packs: { name: string; expires: number }[], now: number): Tier {
  const live = packs.filter((p) => p.expires >= now);
  if (live.some((p) => /diamond/i.test(p.name))) return 'diamond';
  if (live.some((p) => /platinum/i.test(p.name))) return 'platinum';
  return live.length ? 'member' : 'guest';
}
