import test from 'node:test';
import assert from 'node:assert/strict';
import { memberCode, parseMemberCode, tierOf } from '../lib/member-card.ts';

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
