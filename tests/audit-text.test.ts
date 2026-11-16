import test from 'node:test';
import assert from 'node:assert/strict';
import { auditDetailText } from '../lib/audit-text.ts';

test('a payment entry reads as a sentence, without internal ids', () => {
  const d = JSON.stringify({ shift: 'abc', entry: 'x', kind: 'payment', method: 'cash', amount: 266000, booking: '2a6982cd-437b-41a5-808b-7b3a2736d081', actor: 'u' });
  const t = auditDetailText(d);
  assert.match(t, /Thu tiền tiền mặt/);
  assert.match(t, /266\.000/);
  assert.match(t, /phiếu #3A2736D081|phiếu #[0-9A-F]{6}/);
  assert.doesNotMatch(t, /shift|actor|2a6982cd/);
});
test('shift opening shows the name and the opening cash', () => {
  const t = auditDetailText(JSON.stringify({ shift: 's', name: 'Ca sáng', openingCash: 1000000, actor: 'u' }));
  assert.equal(t, 'Ca sáng · Tiền đầu ca: 1.000.000 ₫');
});
test('bare booking ids become the short bill code', () => {
  assert.equal(auditDetailText('2a6982cd-437b-41a5-808b-7b3a2736d081'), '#36D081');
  assert.equal(auditDetailText('2a6982cd-437b-41a5-808b-7b3a2736d081 +30 phút'), '#36D081 +30 phút');
});
test('plain text is left alone', () => {
  assert.equal(auditDetailText('Line 01 · Khách thử POS'), 'Line 01 · Khách thử POS');
});
