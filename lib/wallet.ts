/**
 * Prepaid money wallet. Top up a tier amount and the club adds a bonus on top:
 * 1.000.000đ → +200.000đ, 2.000.000đ → +500.000đ (poster 11/2026, see docs/PRICING.md).
 * Any other amount is accepted (min 100.000đ) and earns the bonus of the highest tier it reaches.
 * The wallet pays a whole finished bill (golf and F&B); there is no partial wallet payment.
 */
export const WALLET_TIERS = [
  { amount: 1_000_000, bonus: 200_000 },
  { amount: 2_000_000, bonus: 500_000 },
] as const;
export const WALLET_MIN_TOPUP = 100_000;
export const WALLET_MAX_TOPUP = 100_000_000;
export const WALLET_LOW_BALANCE_THRESHOLD = 200_000;

export function isWalletLow(balance: number): boolean {
  return balance <= WALLET_LOW_BALANCE_THRESHOLD;
}

export function walletBonus(amount: number): number {
  let bonus = 0;
  for (const t of WALLET_TIERS) if (amount >= t.amount) bonus = t.bonus;
  return bonus;
}
