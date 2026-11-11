import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLA_HOURS, canMove, canRate, isOpen, isOverdue, pickAssignee, slaDue, summarize, ticketCode, validateNew,
  type TicketLite,
} from '../modules/crm/core/tickets.ts';

const H = 3_600_000;
const t = (o: Partial<TicketLite> = {}): TicketLite => ({
  status: 'new', dueAt: 1000 * H, created: 0, resolvedAt: null, rating: null, assignee: null, ...o,
});

test('hạn SLA theo mức ưu tiên', () => {
  assert.equal(slaDue('urgent', 0), 2 * H);
  assert.equal(slaDue('high', 10 * H), 18 * H);
  assert.equal(slaDue('normal', 0), 24 * H);
  assert.equal(SLA_HOURS.low, 72);
});

test('quá hạn: chỉ khi CLB phải xử lý; chờ khách và đã giải quyết thì đồng hồ dừng', () => {
  assert.ok(isOverdue(t({ status: 'new', dueAt: 5 }), 6));
  assert.ok(isOverdue(t({ status: 'in_progress', dueAt: 5 }), 6));
  assert.ok(!isOverdue(t({ status: 'waiting', dueAt: 5 }), 6));
  assert.ok(!isOverdue(t({ status: 'resolved', dueAt: 5 }), 6));
  assert.ok(!isOverdue(t({ status: 'new', dueAt: 10 }), 6));
  assert.ok(isOpen('waiting') && !isOpen('resolved'));
});

test('chuyển trạng thái: không đứng yên; chỉ quản lý mở lại ticket đã đóng', () => {
  assert.ok(!canMove('new', 'new', true));
  assert.ok(canMove('new', 'in_progress', false));
  assert.ok(canMove('resolved', 'in_progress', false)); // reopen a resolved ticket
  assert.ok(!canMove('closed', 'in_progress', false));
  assert.ok(canMove('closed', 'in_progress', true));
  assert.ok(!canMove('closed', 'resolved', true));
  assert.ok(!canMove('new', 'bogus' as never, true));
});

test('chấm điểm chỉ sau khi giải quyết hoặc đóng', () => {
  assert.ok(canRate('resolved') && canRate('closed'));
  assert.ok(!canRate('new') && !canRate('waiting'));
});

test('phân công: người đang ít ticket mở nhất; hòa thì người đứng trước; không ai thì null', () => {
  const people = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(pickAssignee(people, { a: 3, b: 1, c: 2 }), 'b');
  assert.equal(pickAssignee(people, { a: 1, b: 1 }), 'c'); // c has none
  assert.equal(pickAssignee(people, {}), 'a');
  assert.equal(pickAssignee([], {}), null);
});

test('tổng hợp: mở, quá hạn, chờ khách, đã giải quyết, điểm hài lòng, giờ xử lý TB', () => {
  const now = 100 * H;
  const since = 50 * H;
  const s = summarize(
    [
      t({ status: 'new', dueAt: 90 * H }), // overdue
      t({ status: 'in_progress', dueAt: 200 * H }),
      t({ status: 'waiting', dueAt: 1 * H }), // waiting: not overdue
      t({ status: 'resolved', created: 60 * H, resolvedAt: 64 * H, rating: 5 }),
      t({ status: 'closed', created: 70 * H, resolvedAt: 80 * H, rating: 4 }),
      t({ status: 'resolved', created: 0, resolvedAt: 10 * H, rating: 1 }), // before the period
    ],
    now,
    since,
  );
  assert.equal(s.open, 3);
  assert.equal(s.overdue, 1);
  assert.equal(s.waiting, 1);
  assert.equal(s.resolvedInPeriod, 2);
  assert.equal(s.avgRating, 4.5);
  assert.equal(s.rated, 2);
  assert.equal(s.avgResolveHours, 7); // (4h + 10h) / 2
  const empty = summarize([], now, since);
  assert.deepEqual([empty.avgRating, empty.avgResolveHours], [null, null]);
});

test('mã ticket và kiểm tra đầu vào', () => {
  assert.equal(ticketCode(7), 'TK-0007');
  assert.equal(ticketCode(12345), 'TK-12345');
  const ok = { subject: 'Máy chiếu lỗi', description: '', category: 'equipment', priority: 'high' };
  assert.equal(validateNew(ok), null);
  assert.ok(validateNew({ ...ok, subject: ' a ' }));
  assert.ok(validateNew({ ...ok, category: 'x' }));
  assert.ok(validateNew({ ...ok, priority: 'x' }));
  assert.ok(validateNew({ ...ok, description: 'x'.repeat(4001) }));
});
