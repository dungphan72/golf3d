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
  assert.equal(selectRule(at('2026-09-07T06:00:00'), config, 'gdr', false).amount, 100_000);
  assert.equal(selectRule(at('2026-09-07T09:00:00'), config, 'gdr', false).amount, 100_000);
  assert.equal(selectRule(at('2026-09-07T11:00:00'), config, 'gdr', false).amount, 150_000);
  assert.equal(selectRule(at('2026-09-12T09:00:00'), config, 'gdr', false).amount, 200_000);
  assert.equal(selectRule(at('2026-09-02T09:00:00'), config, 'gdr', false).amount, 200_000);
});
test('9/18 hole prices are per person and scale with the group', () => {
  assert.equal(packagePrice(at('2026-09-07T09:00:00'), config, '9', false, 2).base, 500_000);
  assert.equal(packagePrice(at('2026-09-07T14:00:00'), config, '18', false, 3).base, 1_200_000);
  assert.equal(packagePrice(at('2026-09-12T10:00:00'), config, '9', false, 1).base, 350_000);
  assert.equal(packagePrice(at('2026-09-12T10:00:00'), config, '18', false, 4).base, 1_800_000);
});
test('VIP lines have their own prices', () => {
  assert.equal(selectRule(at('2026-09-07T09:00:00'), config, 'gdr', true).amount, 150_000);
  assert.equal(selectRule(at('2026-09-07T20:00:00'), config, 'gdr', true).amount, 200_000);
  assert.equal(selectRule(at('2026-09-12T20:00:00'), config, 'gdr', true).amount, 250_000);
  assert.equal(packagePrice(at('2026-09-07T09:00:00'), config, '9', true, 1).base, 350_000);
  assert.equal(packagePrice(at('2026-09-07T20:00:00'), config, '18', true, 1).base, 500_000);
  assert.equal(packagePrice(at('2026-09-12T20:00:00'), config, '18', true, 1).base, 550_000);
});
test('the club opens at 06:00 and closes at 23:00', () => {
  assert.throws(() => selectRule(at('2026-09-07T05:59:00'), config, 'gdr', false));
  assert.doesNotThrow(() => selectRule(at('2026-09-07T22:59:00'), config, 'gdr', false));
  assert.throws(() => selectRule(at('2026-09-07T23:00:00'), config, 'gdr', false));
});
test('new tenants get the official list; saved configs are untouched', () => {
  assert.equal(upgradeConfig({}, defaults).priceRules?.length, officialPriceRules().length);
  assert.deepEqual(upgradeConfig({ ...defaults, priceRules: [] }, defaults).priceRules, []);
});
