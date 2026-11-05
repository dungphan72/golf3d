import test from 'node:test';
import assert from 'node:assert/strict';
import { hoursUsed, unitsForSession, roomAllows, playedMinutes } from '../lib/package-use.ts';

const min = (m: number) => m * 60_000;

test('hourly packages are charged in started hours, with a 5-minute grace', () => {
  assert.equal(hoursUsed(0), 1);
  assert.equal(hoursUsed(30), 1);
  assert.equal(hoursUsed(60), 1);
  assert.equal(hoursUsed(65), 1); // within the grace
  assert.equal(hoursUsed(66), 2);
  assert.equal(hoursUsed(120), 2);
  assert.equal(hoursUsed(185), 3);
});

test('units come from the actual play segments; hole rounds are always one', () => {
  const twoSegments = [
    { start: 0, end: min(50) },
    { start: min(60), end: min(100) },
  ];
  assert.equal(playedMinutes(twoSegments), 90);
  assert.equal(unitsForSession('gdr', twoSegments), 2);
  assert.equal(unitsForSession('18', twoSegments), 1);
  assert.equal(unitsForSession('9', []), 1);
});

test('a standard package never pays for a VIP room; VIP and older packages do', () => {
  assert.equal(roomAllows('standard', 'line-3'), true);
  assert.equal(roomAllows('standard', 'vip-1'), false);
  assert.equal(roomAllows('vip', 'line-3'), true);
  assert.equal(roomAllows('vip', 'vip-2'), true);
  assert.equal(roomAllows('any', 'vip-2'), true);
});
