import test from 'node:test';
import assert from 'node:assert/strict';
import {
  memberCode,
  parseMemberCode,
  tierOf,
  tierBySpend,
  memberTier,
  nextTier,
  tierThresholds,
  DEFAULT_TIER_THRESHOLDS,
} from '../lib/member-card.ts';

const ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

test('member code comes from the customer id and parses back', () => {
  assert.equal(memberCode(ID), 'HV-1A2B3C4D');
  assert.equal(parseMemberCode('HV-1A2B3C4D'), '1a2b3c4d');
  assert.equal(parseMemberCode('  hv1a2b3c4d '), '1a2b3c4d');
  assert.equal(ID.startsWith(parseMemberCode(memberCode(ID))!), true);
});

test('only a full HV code counts: phone numbers and names never match', () => {
  assert.equal(parseMemberCode('0966777888'), null);
  assert.equal(parseMemberCode('12345678'), null);
  assert.equal(parseMemberCode('HV-1234'), null);
  assert.equal(parseMemberCode('HV-1A2B3C4DX'), null);
  assert.equal(parseMemberCode('Nguyen Van A'), null);
});

test('tier is the best package still in date', () => {
  const now = 1_000;
  const live = (name: string) => ({ name, expires: now + 1 });
  assert.equal(tierOf([], now), 'guest');
  assert.equal(tierOf([{ name: 'Thẻ VIP Diamond', expires: now - 1 }], now), 'guest');
  assert.equal(tierOf([live('Combo 9 hố · 10 lượt (+1)')], now), 'member');
  assert.equal(tierOf([live('Combo 9 hố'), live('Thẻ VIP Platinum')], now), 'platinum');
  assert.equal(tierOf([live('Thẻ VIP Platinum'), live('Thẻ VIP Diamond')], now), 'diamond');
});

test('rank follows total spending: Gold 50M, Platinum 80M, Diamond 100M by default', () => {
  const t = DEFAULT_TIER_THRESHOLDS;
  assert.equal(tierBySpend(49_999_999, t), null);
  assert.equal(tierBySpend(50_000_000, t), 'gold');
  assert.equal(tierBySpend(79_999_999, t), 'gold');
  assert.equal(tierBySpend(80_000_000, t), 'platinum');
  assert.equal(tierBySpend(99_999_999, t), 'platinum');
  assert.equal(tierBySpend(100_000_000, t), 'diamond');
  // Below Gold: a live package still makes a member, nothing makes a guest.
  assert.equal(memberTier(1_000_000, true, t), 'member');
  assert.equal(memberTier(1_000_000, false, t), 'guest');
  assert.equal(memberTier(60_000_000, false, t), 'gold');
});

test('next rank and the money still needed', () => {
  const t = DEFAULT_TIER_THRESHOLDS;
  assert.deepEqual(nextTier(0, t), { tier: 'gold', need: 50_000_000 });
  assert.deepEqual(nextTier(55_000_000, t), { tier: 'platinum', need: 25_000_000 });
  assert.deepEqual(nextTier(90_000_000, t), { tier: 'diamond', need: 10_000_000 });
  assert.equal(nextTier(100_000_000, t), null);
});

test('stored thresholds are used only when whole and rising', () => {
  assert.deepEqual(tierThresholds({ gold: 10, platinum: 20, diamond: 30 }), { gold: 10, platinum: 20, diamond: 30 });
  assert.deepEqual(tierThresholds({ gold: 30, platinum: 20, diamond: 10 }), DEFAULT_TIER_THRESHOLDS);
  assert.deepEqual(tierThresholds({ gold: 1.5, platinum: 2, diamond: 3 }), DEFAULT_TIER_THRESHOLDS);
  assert.deepEqual(tierThresholds(undefined), DEFAULT_TIER_THRESHOLDS);
});
