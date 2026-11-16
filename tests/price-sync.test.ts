import test from 'node:test';
import assert from 'node:assert/strict';
import { syncRulesWithRates, type PriceSyncInput } from '../lib/price-sync.ts';
import { officialPriceRules } from '../lib/official-pricing.ts';

const base: PriceSyncInput = {
  prevOpen: '08:00',
  prevClose: '23:00',
  open: '08:00',
  close: '23:00',
  rate: 200000,
  happy: 150000,
  vipRate: 300000,
  vipHappy: 250000,
  ratesTouched: false,
  hoursTouched: false,
};
const byId = (rules: ReturnType<typeof officialPriceRules>) => new Map(rules.map((r) => [r.id, r]));

test('no change leaves every rule untouched', () => {
  const rules = officialPriceRules();
  assert.deepEqual(syncRulesWithRates(rules, base), rules);
});

test('rate change updates weekday hourly rules only; weekend, holiday and per-person keep their price', () => {
  const rules = officialPriceRules();
  const out = syncRulesWithRates(rules, { ...base, ratesTouched: true });
  const before = byId(rules);
  for (const r of out) {
    const old = before.get(r.id)!;
    if (r.service === 'gdr' && r.day === 'weekday' && r.people == null) {
      const vip = r.room === 'vip';
      const expected = r.to <= '11:00' ? (vip ? 250000 : 150000) : vip ? 300000 : 200000;
      assert.equal(r.amount, expected, r.id);
    } else {
      assert.equal(r.amount, old.amount, `${r.id} must not change`);
    }
  }
});

test('hours change moves only rules on the old opening/closing time', () => {
  const rules = officialPriceRules();
  const out = syncRulesWithRates(rules, { ...base, open: '07:00', close: '22:00', hoursTouched: true });
  for (const [i, r] of out.entries()) {
    const old = rules[i];
    assert.equal(r.from, old.from === '08:00' ? '07:00' : old.from);
    assert.equal(r.to, old.to === '23:00' ? '22:00' : old.to);
    assert.equal(r.amount, old.amount);
  }
});

test('does not mutate the input rules', () => {
  const rules = officialPriceRules();
  const copy = structuredClone(rules);
  syncRulesWithRates(rules, { ...base, ratesTouched: true, hoursTouched: true, open: '06:00' });
  assert.deepEqual(rules, copy);
});
