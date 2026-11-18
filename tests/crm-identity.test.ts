import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  formatCustomerCode,
  normalizeCustomerCode,
  isMatchingPhone,
  isMatchingEmail,
  calculateMatchConfidence,
} from '../modules/crm/core/identity.ts';

test('normalizeEmail chuẩn hóa email và xử lý alias gmail', () => {
  assert.equal(normalizeEmail('  Nam.Nguyen+golf@Gmail.COM  '), 'namnguyen@gmail.com');
  assert.equal(normalizeEmail('john.doe@company.vn'), 'john.doe@company.vn');
  assert.equal(normalizeEmail('Invalid-Email'), '');
  assert.equal(normalizeEmail('user.test+news@googlemail.com'), 'usertest@gmail.com');
});

test('formatCustomerCode và normalizeCustomerCode', () => {
  assert.equal(formatCustomerCode(1), 'KH000001');
  assert.equal(formatCustomerCode(168), 'KH000168');
  assert.equal(formatCustomerCode(999999), 'KH999999');

  assert.equal(normalizeCustomerCode('kh-000168'), 'KH000168');
  assert.equal(normalizeCustomerCode('KH000168'), 'KH000168');
  assert.equal(normalizeCustomerCode('KH-168'), 'KH000168');
  assert.equal(normalizeCustomerCode('   KH 000168   '), 'KH000168');
});

test('isMatchingPhone và isMatchingEmail', () => {
  assert.equal(isMatchingPhone('+84 902 030 185', '0902030185'), true);
  assert.equal(isMatchingPhone('84902030185', '0902-030-185'), true);
  assert.equal(isMatchingPhone('0902030185', '0902030999'), false);
  assert.equal(isMatchingPhone('123', '123'), false); // Too short to dedup safely

  assert.equal(isMatchingEmail('nam.nguyen@gmail.com', 'namnguyen+sg@gmail.com'), true);
  assert.equal(isMatchingEmail('nam@sigolf.vn', 'nam@sigolf.vn'), true);
  assert.equal(isMatchingEmail('nam1@sigolf.vn', 'nam2@sigolf.vn'), false);
});

test('calculateMatchConfidence tính mức độ tin cậy trùng lặp', () => {
  assert.deepEqual(
    calculateMatchConfidence({ phoneMatched: true, emailMatched: true, nameSimilar: true }),
    {
      confidence: 'HIGH',
      reason: 'Trùng khớp cả số điện thoại và địa chỉ email',
    },
  );
  assert.deepEqual(
    calculateMatchConfidence({ phoneMatched: true, emailMatched: false, nameSimilar: false }),
    {
      confidence: 'EXACT_PHONE',
      reason: 'Trùng khớp số điện thoại đăng ký',
    },
  );
  assert.deepEqual(
    calculateMatchConfidence({ phoneMatched: false, emailMatched: true, nameSimilar: false }),
    {
      confidence: 'EXACT_EMAIL',
      reason: 'Trùng khớp địa chỉ email liên hệ',
    },
  );
  assert.deepEqual(
    calculateMatchConfidence({ phoneMatched: false, emailMatched: false, nameSimilar: true }),
    {
      confidence: 'MEDIUM',
      reason: 'Tên khách hàng tương đồng cao, cần nhân viên đối soát',
    },
  );
  assert.deepEqual(
    calculateMatchConfidence({ phoneMatched: false, emailMatched: false, nameSimilar: false }),
    {
      confidence: 'NONE',
      reason: 'Không phát hiện trùng lặp',
    },
  );
});
