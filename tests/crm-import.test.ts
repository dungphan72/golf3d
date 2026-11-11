import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRows, parseImportText } from '../modules/crm/core/import.ts';

test('không có dòng tiêu đề: thứ tự mặc định, cột chiến dịch trước ghi chú', () => {
  const [r] = parseImportText('Nguyễn A, 0901234567, a@x.vn, Gói 18 hố, Facebook, thang-11, muốn tập, cuối tuần');
  assert.equal(r.fullName, 'Nguyễn A');
  assert.equal(r.source, 'Facebook');
  assert.equal(r.campaign, 'thang-11');
  assert.equal(r.notes, 'muốn tập, cuối tuần'); // commas in the last column stay in the note
});

test('có tiêu đề: cột đổi chỗ, thiếu cột nguồn thì dùng Excel/CSV', () => {
  const rows = parseImportText('Số điện thoại\tHọ tên\tChiến dịch\n0912345678\tTrần B\tkhai-truong\n\n0988000111\tLê C\t');
  assert.equal(rows.length, 2);
  assert.deepEqual([rows[0].fullName, rows[0].phone, rows[0].campaign, rows[0].source], ['Trần B', '0912345678', 'khai-truong', 'Excel/CSV']);
  assert.equal(rows[1].campaign, '');
});

test('dòng không có tên bị bỏ; văn bản rỗng cho danh sách rỗng', () => {
  assert.deepEqual(parseImportText('  \n\n'), []);
  assert.equal(parseImportText(', 0901234567').length, 0);
});

test('xem trước: mới, đã có, trùng trong file, bị chặn, sai số', () => {
  const rows = [
    { fullName: 'A', phone: '0901234567' },
    { fullName: 'B', phone: '+84 901 234 567' }, // same number as A in another format
    { fullName: 'C', phone: '0912000111' },
    { fullName: 'D', phone: '0955777881' },
    { fullName: 'E', phone: '12' },
    { fullName: 'F', phone: '0977000222' },
  ];
  const r = classifyRows(rows, new Set(['0912000111']), new Set(['0955777881']));
  assert.deepEqual(r.rows.map((x) => x.verdict), ['new', 'repeat', 'existing', 'blocked', 'invalid', 'new']);
  assert.deepEqual(r.counts, { new: 2, existing: 1, repeat: 1, blocked: 1, invalid: 1 });
});
