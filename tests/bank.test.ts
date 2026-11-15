import test from 'node:test';
import assert from 'node:assert/strict';
import {
  paymentCode,
  extractCode,
  vietQrUrl,
  sepayQrUrl,
  sepayPayload,
  parseSepayTime,
  bankInput,
} from '../lib/bank.ts';

test('payment code is short, stable and found inside noisy bank notes', () => {
  const code = paymentCode('3f2a9c1e-8d44-4b6a-9a77-123456789abc');
  assert.equal(code, 'SGG3F2A9C1E');
  assert.equal(extractCode('NGUYEN VAN A chuyen tien ' + code + ' FT26312'), code);
  assert.equal(extractCode('sgg3f2a9c1e'), code); // lower-case after bank processing
  assert.equal(extractCode('khong co ma'), null);
  assert.equal(extractCode('SGG123'), null); // too short
});
test('VietQR URL carries bin, account, amount and note', () => {
  const url = vietQrUrl({
    bin: '970436',
    account: '0123456789',
    holder: 'SAIGON GOLF',
    amount: 650000,
    note: 'SGG3F2A9C1E',
  });
  assert.ok(url.startsWith('https://img.vietqr.io/image/970436-0123456789-compact2.png?'));
  assert.ok(url.includes('amount=650000'));
  assert.ok(url.includes('addInfo=SGG3F2A9C1E'));
  assert.ok(url.includes('accountName=SAIGON+GOLF'));
  const sepayUrl = sepayQrUrl({
    bin: '970422',
    account: '0877834888',
    holder: 'SAIGON GOLF',
    amount: 450000,
    note: 'SGG3F2A9C1E',
  });
  assert.ok(sepayUrl.startsWith('https://qr.sepay.vn/img?'));
  assert.ok(sepayUrl.includes('acc=0877834888'));
  assert.ok(sepayUrl.includes('bank=MBBank'));
  assert.ok(sepayUrl.includes('amount=450000'));
  assert.ok(sepayUrl.includes('des=SGG3F2A9C1E'));
});
test('SePay payload parsing accepts the documented fields', () => {
  const ok = sepayPayload.safeParse({
    id: 92704,
    gateway: 'Vietcombank',
    transactionDate: '2026-11-05 10:15:30',
    accountNumber: '0123456789',
    code: null,
    content: 'SGG3F2A9C1E thanh toan',
    transferType: 'in',
    transferAmount: 650000,
    accumulated: 19077000,
    subAccount: null,
    referenceCode: 'MBVCB.3278907687',
    description: '',
  });
  assert.ok(ok.success);
  assert.ok(!sepayPayload.safeParse({ id: 1, transferType: 'in' }).success); // amount missing
  assert.equal(parseSepayTime('2026-11-05 10:15:30', 0), Date.parse('2026-11-05T10:15:30+07:00'));
  assert.equal(parseSepayTime('garbage', 42), 42);
});
test('bank admin actions require a long key', () => {
  assert.ok(!bankInput.safeParse({ action: 'set-key', key: 'short' }).success);
  assert.ok(bankInput.safeParse({ action: 'set-key', key: 'k'.repeat(24) }).success);
  assert.ok(bankInput.safeParse({ action: 'ignore', id: 'x' }).success);
  assert.ok(!bankInput.safeParse({ action: 'ignore', id: 'x', tenant: 't' }).success);
  assert.ok(
    bankInput.safeParse({
      action: 'simulate-tx',
      amount: 450000,
      content: 'SGG3F2A9C1E test',
    }).success,
  );
});
