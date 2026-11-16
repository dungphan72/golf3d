import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeLegacy } from '../lib/report-merge.ts';

const day = (d: string, cash: number) => ({ day: d, cash, transfer: 0, card: 0, refunds: 0, packages: 0, expenses: 0, payments: 1 });

test('approved old bills are added to their own day and method', () => {
  const r = mergeLegacy(
    [day('2026-11-10', 100)],
    [{ service: 'gdr', rounds: 1, revenue: 100, food: 0 }],
    [
      { day: '2026-11-10', cash: 50, transfer: 30, card: 0, other: 5, bills: 2 },
      { day: '2026-01-05', cash: 0, transfer: 200, card: 0, other: 0, bills: 1 },
    ],
    [
      { service: 'gdr', rounds: 2, revenue: 85, food: 10 },
      { service: 'other', rounds: 1, revenue: 200, food: 0 },
    ],
  );
  assert.deepEqual(r.days.map((d) => d.day), ['2026-11-10', '2026-01-05']);
  const d = r.days[0];
  assert.equal(d.cash, 150);
  assert.equal(d.transfer, 30);
  assert.equal(d.legacy, 85);
  assert.equal(d.other, 5);
  assert.equal(d.payments, 3);
  assert.equal(r.days[1].transfer, 200);
  assert.equal(r.days[1].payments, 1);
  const gdr = r.services.find((s) => s.service === 'gdr')!;
  assert.deepEqual([gdr.rounds, gdr.revenue, gdr.food], [3, 185, 10]);
  assert.equal(r.services[0].service, 'other');
});

test('without old bills nothing changes', () => {
  const r = mergeLegacy([day('2026-11-10', 100)], [], [], []);
  assert.equal(r.days[0].cash, 100);
  assert.equal(r.days[0].legacy, 0);
});
