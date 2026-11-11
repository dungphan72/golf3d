import { test } from 'node:test';
import assert from 'node:assert/strict';
import { durationText, groupStats, median, statsOf, type ResponseRow } from '../modules/crm/core/response.ts';

const r = (minutes: number | null, o: Partial<ResponseRow> = {}): ResponseRow => ({
  owner: 'u1', ownerName: 'An', team: 'A', source: 'Website', minutes, workMinutes: minutes == null ? null : Math.round(minutes / 2), ...o,
});

test('thống kê: trung bình, trung vị, đúng hạn SLA; lead chưa liên hệ không tính vào thời gian', () => {
  const s = statsOf([r(2), r(4), r(30), r(null)], 5);
  assert.equal(s.leads, 4);
  assert.equal(s.responded, 3);
  assert.equal(s.avgMin, 12);
  assert.equal(s.medianMin, 4);
  assert.equal(s.avgWorkMin, 6);
  assert.equal(s.withinSlaPct, 67); // 2 of 3 contacted within 5 minutes
});

test('không có lead nào được liên hệ: các số là null, không phải 0', () => {
  const s = statsOf([r(null)], 5);
  assert.deepEqual([s.avgMin, s.medianMin, s.avgWorkMin, s.withinSlaPct], [null, null, null, null]);
  assert.equal(statsOf([], 5).leads, 0);
});

test('trung vị số chẵn và lẻ', () => {
  assert.equal(median([1, 9, 5]), 5);
  assert.equal(median([2, 4]), 3);
  assert.equal(median([]), null);
});

test('theo nhân viên: người chậm nhất xếp đầu', () => {
  const g = groupStats([r(3, { ownerName: 'An' }), r(50, { ownerName: 'Bình' }), r(60, { ownerName: 'Bình' })], (x) => x.ownerName, 5);
  assert.deepEqual(g.map((x) => x.name), ['Bình', 'An']);
  assert.equal(g[0].avgMin, 55);
  assert.equal(groupStats([r(1, { team: '' })], (x) => x.team, 5)[0].name, 'Không rõ');
});

test('hiển thị khoảng thời gian', () => {
  assert.equal(durationText(null), '—');
  assert.equal(durationText(5), '5 phút');
  assert.equal(durationText(80), '1 giờ 20 phút');
  assert.equal(durationText(120), '2 giờ');
  assert.equal(durationText(1500), '1 ngày 1 giờ');
  assert.equal(durationText(2880), '2 ngày');
});
