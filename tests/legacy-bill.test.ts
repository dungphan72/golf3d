import test from 'node:test';
import assert from 'node:assert/strict';
import { billMoment, momentProblem, linesProblem, linesTotal, linesFood } from '../lib/legacy-bill.ts';

test('billMoment reads a Vietnam local date and time', () => {
  assert.equal(billMoment('2026-11-02', '14:00'), Date.parse('2026-11-02T14:00:00+07:00'));
  assert.equal(billMoment('2026-02-31', '10:00'), null);
  assert.equal(billMoment('2026-11-02', '25:00'), null);
  assert.equal(billMoment('11/02/2026', '10:00'), null);
});
test('a bill cannot be in the future or older than ten years', () => {
  const now = Date.parse('2026-11-16T12:00:00+07:00');
  assert.equal(momentProblem(now - 86_400_000, now), null);
  assert.match(momentProblem(now + 3_600_000, now)!, /tương lai/);
  assert.match(momentProblem(now - 11 * 365 * 86_400_000, now)!, /quá cũ/);
});
test('lines are added up and checked', () => {
  const lines = [
    { name: 'Giờ tập', qty: 1, price: 150_000 },
    { name: 'Nước suối', qty: 2, price: 15_000, fnb: true },
  ];
  assert.equal(linesTotal(lines), 180_000);
  assert.equal(linesFood(lines), 30_000);
  assert.equal(linesProblem(lines), null);
  assert.match(linesProblem([])!, /ít nhất/);
  assert.match(linesProblem([{ name: ' ', qty: 1, price: 1 }])!, /tên/);
  assert.match(linesProblem([{ name: 'x', qty: 0, price: 1 }])!, /Số lượng/);
  assert.match(linesProblem([{ name: 'x', qty: 1, price: 1.5 }])!, /Đơn giá/);
  assert.match(linesProblem([{ name: 'x', qty: 1, price: 0 }])!, /lớn hơn 0/);
});
