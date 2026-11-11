import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLayout, sanitizeLayout, visibleWidgets, widgetsFor } from '../modules/crm/core/dashboard.ts';

test('mặc định: đủ thẻ, 30 ngày, nhân viên không thấy thẻ của quản lý', () => {
  assert.equal(defaultLayout(true).days, 30);
  assert.ok(defaultLayout(true).order.includes('ranking'));
  assert.ok(!defaultLayout(false).order.includes('ranking'));
  assert.ok(widgetsFor(true).length > widgetsFor(false).length);
});

test('làm sạch: bỏ thẻ lạ, trùng, thẻ của quản lý với nhân viên; thêm thẻ còn thiếu', () => {
  const l = sanitizeLayout({ order: ['funnel', 'funnel', 'x', 'ranking', 'kpi_won'], hidden: ['sources', 'zzz'], days: 90 }, false);
  assert.deepEqual(l.order.slice(0, 2), ['funnel', 'kpi_won']);
  assert.ok(!l.order.includes('ranking'));
  assert.equal(l.order.length, defaultLayout(false).order.length);
  assert.deepEqual(l.hidden, ['sources']);
  assert.equal(l.days, 90);
});

test('khoảng ngày sai hoặc dữ liệu rác quay về mặc định', () => {
  assert.equal(sanitizeLayout({ days: 365 }, true).days, 30);
  assert.deepEqual(sanitizeLayout('rác', true), defaultLayout(true));
  assert.deepEqual(sanitizeLayout(null, true), defaultLayout(true));
});

test('ẩn thẻ thì không vẽ, thứ tự giữ nguyên', () => {
  const l = sanitizeLayout({ order: ['sources', 'funnel'], hidden: ['funnel'] }, true);
  assert.equal(visibleWidgets(l)[0], 'sources');
  assert.ok(!visibleWidgets(l).includes('funnel'));
});
