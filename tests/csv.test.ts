import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../lib/csv.ts';

test('csv quotes special characters, keeps numbers and neutralises formulas', () => {
  const out = toCsv([
    ['Ngày', 'Ghi chú', 'Số tiền'],
    ['05/11', 'a,"b"', -5000],
    ['x', '=1+1', 0],
  ]);
  assert.ok(out.startsWith('﻿Ngày,'));
  assert.ok(out.includes('"a,""b"""'));
  assert.ok(out.includes(',-5000\r\n')); // numbers are never prefixed
  assert.ok(out.includes("'=1+1"));
});
