import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaignKey, pickRecipients, renderCampaign, validateCampaign, type Contact } from '../modules/crm/core/campaigns.ts';

const c = (id: string, o: Partial<Contact> = {}): Contact => ({
  id, name: 'Khách ' + id, email: id + '@x.vn', zalo_id: 'z' + id, marketing_consent: 1, segments: [], ...o,
});

test('chọn người nhận: đúng nhóm, đã đồng ý nhận tin, có liên lạc trên kênh', () => {
  const list = [
    c('1', { segments: ['vip'] }),
    c('2', { segments: ['vip'], marketing_consent: 0 }),
    c('3', { segments: ['vip'], email: '' }),
    c('4', { segments: ['new'] }),
  ];
  const r = pickRecipients(list, 'vip', 'email');
  assert.deepEqual(r.recipients.map((x) => x.id), ['1']);
  assert.deepEqual(r.skipped, { noConsent: 1, noContact: 1 });
  assert.equal(pickRecipients(list, 'all', 'email').recipients.length, 2);
  assert.equal(pickRecipients(list, 'vip', 'zalo').recipients.length, 2); // zalo id present for 1 and 3
});

test('nội dung thay {ten}; khóa tin cố định theo chiến dịch, khách, kênh', () => {
  assert.equal(renderCampaign('Chào {ten}, {ten}!', { name: ' An ' }), 'Chào An, An!');
  assert.equal(renderCampaign('Chào {ten}', { name: '' }), 'Chào bạn');
  assert.equal(campaignKey('a1', 'c9', 'zalo'), 'camp:a1:c9:zalo');
});

test('kiểm tra chiến dịch', () => {
  const ok = { name: 'Tri ân', channel: 'email', segment: 'vip', subject: 'Ưu đãi', body: 'Nội dung đủ dài' };
  assert.equal(validateCampaign(ok), null);
  assert.ok(validateCampaign({ ...ok, name: ' ' }));
  assert.ok(validateCampaign({ ...ok, channel: 'sms' }));
  assert.ok(validateCampaign({ ...ok, segment: 'x' }));
  assert.ok(validateCampaign({ ...ok, subject: '' }));
  assert.equal(validateCampaign({ ...ok, channel: 'zalo', subject: '' }), null);
});
