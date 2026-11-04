import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, type Config } from '../lib/club.ts';
import { selectRule, validateRules, upgradeConfig, packagePrice } from '../lib/pricing.ts';
import { officialPriceRules } from '../lib/official-pricing.ts';

const config: Config = { ...defaults, priceRules: officialPriceRules(), holidays: ['2026-09-02'] };
// Vietnam time (UTC+7) helper
const at = (iso: string) => Date.parse(iso + '+07:00');

test('official rules are valid and non-overlapping', () => {
  assert.doesNotThrow(() => validateRules(officialPriceRules()));
});
test('GDR prices follow golden hour on weekdays only', () => {
  assert.equal(selectRule(at('2026-09-07T09:00:00'), config, 'gdr', false).amount, 100_000);
  assert.equal(selectRule(at('2026-09-07T11:00:00'), config, 'gdr', false).amount, 250_000);
  assert.equal(selectRule(at('2026-09-12T09:00:00'), config, 'gdr', false).amount, 250_000);
  assert.equal(selectRule(at('2026-09-02T09:00:00'), config, 'gdr', false).amount, 250_000);
});
test('9/18 hole prices are per person for 1-3 players', () => {
  assert.equal(packagePrice(at('2026-09-07T09:00:00'), config, '9', false, 2).base, 600_000);
  assert.equal(packagePrice(at('2026-09-07T14:00:00'), config, '18', false, 3).base, 1_950_000);
  assert.equal(packagePrice(at('2026-09-12T10:00:00'), config, '9', false, 1).base, 500_000);
});
test('group of four is flat all day on every day type', () => {
  for (const d of [
    '2026-09-07T09:00:00',
    '2026-09-07T20:00:00',
    '2026-09-12T09:00:00',
    '2026-09-02T09:00:00',
  ]) {
    assert.equal(packagePrice(at(d), config, '9', false, 4).base, 900_000);
    assert.equal(packagePrice(at(d), config, '18', true, 4).base, 1_000_000);
  }
});
test('closed hours have no price and VIP shares standard prices', () => {
  assert.throws(() => selectRule(at('2026-09-07T07:00:00'), config, 'gdr', false));
  assert.equal(selectRule(at('2026-09-07T20:00:00'), config, 'gdr', true).amount, 250_000);
});
test('new tenants get the official list; saved configs are untouched', () => {
  assert.equal(upgradeConfig({}, defaults).priceRules?.length, officialPriceRules().length);
  assert.deepEqual(upgradeConfig({ ...defaults, priceRules: [] }, defaults).priceRules, []);
});
