import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_VIEWS, addView, sanitizeViews } from '../modules/crm/core/views.ts';

test('làm sạch: bỏ mục sai, cắt chữ dài, giai đoạn lạ về tất cả, không trùng id', () => {
  const v = sanitizeViews([
    { id: 'a', name: '  Lead mới  ', stage: 'NEW', q: '  swing ' },
    { id: 'a', name: 'trùng id', stage: 'WON', q: '' },
    { id: 'b', name: 'x'.repeat(80), stage: 'KHONGCO', q: 'y'.repeat(300) },
    { id: '', name: 'thiếu id', stage: '', q: '' },
    { id: 'c', name: '', stage: '', q: '' },
    'rác',
    null,
  ]);
  assert.equal(v.length, 2);
  assert.deepEqual(v[0], { id: 'a', name: 'Lead mới', stage: 'NEW', q: 'swing' });
  assert.equal(v[1].name.length, 40);
  assert.equal(v[1].stage, '');
  assert.equal(v[1].q.length, 100);
  assert.deepEqual(sanitizeViews('x'), []);
});

test('lưu lại cùng tên (không phân biệt hoa thường) thì cập nhật, không thêm mới', () => {
  const a = addView([], { name: 'Chốt', stage: 'WON', q: '' }, '1');
  const b = addView(a, { name: 'CHỐT', stage: 'LOST', q: 'abc' }, '2');
  assert.equal(b.length, 1);
  assert.deepEqual(b[0], { id: '2', name: 'CHỐT', stage: 'LOST', q: 'abc' });
});

test('tối đa 12 chế độ xem', () => {
  let v = sanitizeViews([]);
  for (let i = 0; i < 20; i++) v = addView(v, { name: 'v' + i, stage: '', q: '' }, 'id' + i);
  assert.equal(v.length, MAX_VIEWS);
});
