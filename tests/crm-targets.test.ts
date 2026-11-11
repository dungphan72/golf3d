import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthKey, monthRange, progress, sanitizeTargets, validMonth } from '../modules/crm/core/targets.ts';

// 2026-11-11 21:00 Vietnam time
const NOV_11 = Date.UTC(2026, 10, 11, 14, 0, 0);

test('tháng theo giờ Việt Nam: 0h ngày 1 đã sang tháng mới', () => {
  assert.equal(monthKey(NOV_11), '2026-11');
  assert.equal(monthKey(Date.UTC(2026, 9, 31, 17, 0, 0)), '2026-11'); // 00:00 on 1 Nov in Vietnam
  assert.equal(monthKey(Date.UTC(2026, 9, 31, 16, 59, 0)), '2026-10');
  assert.ok(validMonth('2026-02'));
  assert.ok(!validMonth('2026-13') && !validMonth('26-11') && !validMonth(5));
});

test('khoảng tháng: số ngày đúng, kể cả tháng 2 năm nhuận', () => {
  assert.equal(monthRange('2026-11').days, 30);
  assert.equal(monthRange('2028-02').days, 29);
  assert.equal(monthRange('2026-12').days, 31);
  const r = monthRange('2026-11');
  assert.equal(monthKey(r.start), '2026-11');
  assert.equal(monthKey(r.end - 1), '2026-11');
  assert.equal(monthKey(r.end), '2026-12');
});

test('tiến độ giữa tháng: còn thiếu, dự báo theo nhịp hiện tại, phân loại', () => {
  // day 11 of 30; target 30tr => expected by now 11tr
  const ahead = progress(30_000_000, 15_000_000, '2026-11', NOV_11);
  assert.equal(ahead.expected, 11_000_000);
  assert.equal(ahead.remaining, 15_000_000);
  assert.equal(ahead.pct, 50);
  assert.equal(ahead.state, 'ahead');
  assert.equal(ahead.forecast, Math.round((15_000_000 / 11) * 30));
  assert.equal(progress(30_000_000, 11_000_000, '2026-11', NOV_11).state, 'on-track');
  assert.equal(progress(30_000_000, 5_000_000, '2026-11', NOV_11).state, 'behind');
});

test('đã đạt thì còn thiếu bằng 0, phần trăm có thể trên 100', () => {
  const p = progress(10_000_000, 12_000_000, '2026-11', NOV_11);
  assert.equal(p.state, 'reached');
  assert.equal(p.remaining, 0);
  assert.equal(p.pct, 120);
});

test('chưa đặt mục tiêu: không có phần trăm; tháng đã qua: dự báo là kết quả thật; tháng tới: chưa thu gì', () => {
  const none = progress(0, 5_000_000, '2026-11', NOV_11);
  assert.equal(none.state, 'none');
  assert.equal(none.pct, null);
  const past = progress(20_000_000, 18_000_000, '2026-10', NOV_11);
  assert.equal(past.forecast, 18_000_000);
  assert.equal(past.expected, 20_000_000);
  assert.equal(past.state, 'behind');
  const future = progress(20_000_000, 0, '2026-12', NOV_11);
  assert.equal(future.forecast, 0);
  assert.equal(future.expected, 0);
});

test('làm sạch mục tiêu: số âm, chữ, quá lớn, id lạ', () => {
  const t = sanitizeTargets({ club: '50000000', staff: { a: 10_000_000, b: -5, c: 'x', d: 99_999_999_999, '': 5 } });
  assert.equal(t.club, 50_000_000);
  assert.deepEqual(t.staff, { a: 10_000_000, d: 10_000_000_000 });
  assert.deepEqual(sanitizeTargets('rác'), { club: 0, staff: {} });
  assert.deepEqual(sanitizeTargets({ club: -1 }), { club: 0, staff: {} });
});
