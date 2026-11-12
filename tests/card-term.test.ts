import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  absenceDays,
  canCancelAbsence,
  cardState,
  checkAbsence,
  clubDay,
  expiryOnActivation,
  isPeriodCard,
  maxAbsences,
  termForSale,
} from '../lib/card-term.ts';
import { UNLIMITED } from '../lib/member.ts';

const NOW = Date.parse('2026-11-11T03:00:00Z'); // 10:00 club time, 11/11
const base = {
  now: NOW,
  activated: true,
  expires: NOW + 25 * DAY_MS,
  validDays: 30,
  active: [],
};

test('card kinds', () => {
  assert.ok(isPeriodCard([{ kind: 'gdr', qty: UNLIMITED }]));
});

test('a monthly card starts unactivated with 30 days to activate; an hour card runs from purchase', () => {
  const m = termForSale(NOW, 30, true);
  assert.equal(m.activatedAt, null);
  assert.equal(m.activateBy, NOW + 30 * DAY_MS);
  assert.equal(m.expires, NOW + 60 * DAY_MS);
  const h = termForSale(NOW, 30, false);
  assert.equal(h.activatedAt, NOW);
  assert.equal(h.activateBy, null);
  assert.equal(h.expires, NOW + 30 * DAY_MS);
  assert.equal(expiryOnActivation(NOW, 90), NOW + 90 * DAY_MS);
});

test('card state', () => {
  const pending = { activatedAt: null, activateBy: NOW + DAY_MS, expires: NOW + 60 * DAY_MS, now: NOW };
  assert.equal(cardState(pending), 'pending');
  assert.equal(cardState({ ...pending, activateBy: NOW - 1 }), 'active');
  assert.equal(cardState({ activatedAt: NOW, activateBy: null, expires: NOW - 1, now: NOW }), 'expired');
});

test('absence allowances: 1 month → 1, 3 months → 2, 6 months → 3', () => {
  assert.equal(maxAbsences(30), 1);
  assert.equal(maxAbsences(90), 2);
  assert.equal(maxAbsences(180), 3);
});

test('club day uses UTC+7', () => {
  assert.equal(clubDay(Date.parse('2026-11-10T18:00:00Z')), '2026-11-11');
  assert.equal(absenceDays('2026-11-15', '2026-11-21'), 7);
});

test('absence rules', () => {
  assert.equal(checkAbsence({ ...base, startDay: '2026-11-15', endDay: '2026-11-21' }), null);
  assert.match(checkAbsence({ ...base, startDay: '2026-11-15', endDay: '2026-11-20' })!, /tối thiểu 7/);
  assert.match(checkAbsence({ ...base, startDay: '2026-11-11', endDay: '2026-11-20' })!, /sau hôm nay/);
  assert.match(checkAbsence({ ...base, startDay: '2026-11-05', endDay: '2026-11-20' })!, /sau hôm nay/);
  assert.match(checkAbsence({ ...base, activated: false, startDay: '2026-11-15', endDay: '2026-11-21' })!, /chưa kích hoạt/);
  assert.match(checkAbsence({ ...base, expires: NOW - 1, startDay: '2026-11-15', endDay: '2026-11-21' })!, /hết hạn/);
  assert.match(checkAbsence({ ...base, startDay: '2027-02-01', endDay: '2027-02-10' })!, /sau ngày hết hạn/);
  assert.match(checkAbsence({ ...base, startDay: '2026-13-01', endDay: '2026-13-09' })!, /không hợp lệ/);
});

test('absences cannot overlap and are capped per card', () => {
  const first = { id: 'a', startDay: '2026-11-15', endDay: '2026-11-21', days: 7 };
  assert.match(
    checkAbsence({ ...base, active: [first], startDay: '2026-11-21', endDay: '2026-11-30' })!,
    /Trùng/,
  );
  assert.match(
    checkAbsence({ ...base, active: [first], startDay: '2026-11-22', endDay: '2026-11-28' })!,
    /tối đa 1 lần/,
  );
  assert.equal(
    checkAbsence({ ...base, validDays: 90, expires: NOW + 80 * DAY_MS, active: [first], startDay: '2026-11-22', endDay: '2026-11-28' }),
    null,
  );
});

test('an absence can be cancelled only before it starts', () => {
  assert.ok(canCancelAbsence(NOW, '2026-11-12'));
  assert.ok(!canCancelAbsence(NOW, '2026-11-11'));
});
