import type { PriceRule } from './pricing.ts';

export type PriceSyncInput = {
  /** Opening hours before the change. */
  prevOpen: string;
  prevClose: string;
  /** Values after the change. */
  open: string;
  close: string;
  rate: number;
  happy: number;
  vipRate: number;
  vipHappy: number;
  ratesTouched: boolean;
  hoursTouched: boolean;
};

const HAPPY_END = '11:00';

/**
 * Keeps the hourly price table in step when the simple price fields or opening hours change
 * without an explicit table edit. Only weekday hourly ("gdr") rules follow the simple fields:
 * a rule that ends by 11:00 is the happy-hour price, a rule that starts at 11:00 or later is the
 * normal price. Weekend and holiday rules, per-person rules and anything in between are never
 * rewritten, because they carry their own prices. Hours move only the rules that sit exactly on
 * the old opening or closing time.
 */
export function syncRulesWithRates(rules: PriceRule[], p: PriceSyncInput): PriceRule[] {
  return rules.map((rule) => {
    let next = { ...rule };
    if (p.hoursTouched) {
      if (next.from === p.prevOpen) next.from = p.open;
      if (next.to === p.prevClose) next.to = p.close;
    }
    if (p.ratesTouched && next.service === 'gdr' && next.day === 'weekday' && next.people == null) {
      const vip = next.room === 'vip';
      if (next.to <= HAPPY_END) next = { ...next, amount: vip ? p.vipHappy : p.happy };
      else if (next.from >= HAPPY_END) next = { ...next, amount: vip ? p.vipRate : p.rate };
    }
    return next;
  });
}
