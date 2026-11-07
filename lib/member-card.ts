// Member card facts that need no extra storage: the code comes from the customer id, the tier from live packages.

/** Printed on the card and encoded in its QR. Short enough to read out at the counter. */
export const memberCode = (customerId: string) =>
  'HV-' + customerId.replaceAll('-', '').slice(0, 8).toUpperCase();

/** "HV-1A2B3C4D" or "hv1a2b3c4d" -> the lower-case 8 hex digits an id starts with; anything else -> null. */
export function parseMemberCode(text: string): string | null {
  const m = /^HV-?([0-9a-f]{8})$/i.exec(text.trim());
  return m ? m[1].toLowerCase() : null;
}

export type Tier = 'diamond' | 'platinum' | 'member' | 'guest';
export const TIER_LABEL: Record<Tier, string> = {
  diamond: 'Diamond',
  platinum: 'Platinum',
  member: 'Hội viên',
  guest: 'Thành viên',
};

/** The best card among packages still in date: VIP Diamond, then VIP Platinum, then any package. */
export function tierOf(packs: { name: string; expires: number }[], now: number): Tier {
  const live = packs.filter((p) => p.expires >= now);
  if (live.some((p) => /diamond/i.test(p.name))) return 'diamond';
  if (live.some((p) => /platinum/i.test(p.name))) return 'platinum';
  return live.length ? 'member' : 'guest';
}
