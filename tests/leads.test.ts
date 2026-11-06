import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import {
  SLA_MS,
  adsLeadSchema,
  fromAds,
  fromFacebookFields,
  fromWebsite,
  fromZaloEvent,
  leadInput,
  leadLink,
  needFromText,
  phoneInText,
  pickAgent,
  staffLeadMessage,
  managerMessage,
  websiteLeadSchema,
  type AgentRow,
} from '../lib/leads.ts';
import { facebookSignatureValid, zaloSignatureValid } from '../lib/signature.ts';

const NOW = Date.parse('2026-11-05T10:00:00+07:00');
const agent = (id: string, over: Partial<AgentRow> = {}): AgentRow => ({
  user_id: id,
  receives_leads: 1,
  on_duty: 1,
  duty_since: NOW - 3_600_000,
  last_assigned: null,
  ...over,
});

test('the call deadline is five minutes', () => {
  assert.equal(SLA_MS, 5 * 60_000);
});

test('phone numbers and needs are read from free text', () => {
  assert.equal(phoneInText('Gọi em số 0912 345 678 nhé'), '0912345678');
  assert.equal(phoneInText('+84 912-345-678'), '0912345678');
  assert.equal(phoneInText('không có số'), '');
  assert.equal(needFromText('Em muốn tập swing với HLV'), 'swing');
  assert.equal(needFromText('đặt chơi 18 hố cuối tuần'), '18');
  assert.equal(needFromText('chơi 9 hố'), '9');
  assert.equal(needFromText('team building công ty 30 người'), 'group');
  assert.equal(needFromText('xin chào'), '');
});

test('a website form becomes a lead with a normalised phone and a stable key', () => {
  const raw = websiteLeadSchema.parse({
    name: 'An',
    phone: '0912 345 678',
    message: 'tập swing',
    campaign: '3dgolf.vn',
    id: 'f-1',
  });
  const lead = fromWebsite(raw, NOW);
  assert.equal(lead.phone, '0912345678');
  assert.equal(lead.source, 'website');
  assert.equal(lead.need, 'swing');
  assert.equal(lead.extKey, 'website:f-1');
  // Without an id the same form posted within the same minute is the same event.
  const noId = websiteLeadSchema.parse({ name: 'An', phone: '0912345678' });
  assert.equal(fromWebsite(noId, NOW).extKey, fromWebsite(noId, NOW + 20_000).extKey);
  assert.notEqual(fromWebsite(noId, NOW).extKey, fromWebsite(noId, NOW + 120_000).extKey);
  // A phone typed only in the message is found; a bad number is dropped, not guessed.
  assert.equal(
    fromWebsite(websiteLeadSchema.parse({ message: 'SĐT 0987654321' }), NOW).phone,
    '0987654321',
  );
  assert.equal(fromWebsite(websiteLeadSchema.parse({ phone: '12345' }), NOW).phone, '');
  assert.ok(!websiteLeadSchema.safeParse({ website: 'bot' }).success, 'honeypot');
  assert.ok(!websiteLeadSchema.safeParse({ extra: 1 }).success);
});

test('ads payloads keep the platform as the campaign', () => {
  const lead = fromAds(
    adsLeadSchema.parse({ source: 'tiktok', phone: '0912345678', id: 'a1' }),
    NOW,
  );
  assert.equal(lead.source, 'ads');
  assert.equal(lead.campaign, 'tiktok');
  assert.equal(lead.extKey, 'ads:a1');
});

test('facebook lead form fields are mapped, including Vietnamese field names', () => {
  const lead = fromFacebookFields(
    [
      { name: 'full_name', values: ['Trần B'] },
      { name: 'phone_number', values: ['+84912345678'] },
      { name: 'email', values: ['b@example.com'] },
      { name: 'nhu_cau', values: ['Muốn chơi 18 hố'] },
    ],
    { leadgenId: '777', adId: 'ad9', formId: 'f1' },
    NOW,
  );
  assert.equal(lead.source, 'facebook');
  assert.equal(lead.phone, '0912345678');
  assert.equal(lead.name, 'Trần B');
  assert.equal(lead.need, '18');
  assert.equal(lead.campaign, 'ad9');
  assert.equal(lead.extKey, 'facebook:777');
  assert.equal(lead.channelRef, 'facebook-lead:777');
});

test('a zalo message becomes a lead without a phone, unless the text has one', () => {
  const event = {
    event_name: 'user_send_text',
    sender: { id: 'z1' },
    message: { text: 'Cho em hỏi giá tập swing', msg_id: 'm1' },
  };
  const lead = fromZaloEvent(event, NOW)!;
  assert.equal(lead.phone, '');
  assert.equal(lead.zaloId, 'z1');
  assert.equal(lead.channelRef, 'zalo:z1');
  assert.equal(lead.extKey, 'zalo:m1');
  assert.equal(
    fromZaloEvent({ ...event, message: { text: 'sđt 0912345678', msg_id: 'm2' } }, NOW)!.phone,
    '0912345678',
  );
  assert.equal(fromZaloEvent({ event_name: 'follow', sender: { id: 'z1' } }, NOW), null);
});

test('round robin gives the lead to whoever has waited longest, among those on duty', () => {
  const staff = [
    agent('a', { last_assigned: NOW - 10_000 }),
    agent('b', { last_assigned: NOW - 60_000 }),
    agent('c', { on_duty: 0 }),
    agent('d', { receives_leads: 0 }),
    agent('e', { last_assigned: null }),
  ];
  assert.equal(pickAgent(staff, { now: NOW })!.user_id, 'e', 'never assigned goes first');
  assert.equal(pickAgent(staff, { now: NOW, exclude: ['e'] })!.user_id, 'b');
  assert.equal(pickAgent(staff, { now: NOW, exclude: ['e', 'b'] })!.user_id, 'a');
  assert.equal(
    pickAgent(staff, { now: NOW, exclude: ['e', 'b', 'a'] }),
    null,
    'nobody left: the lead queues',
  );
  assert.equal(
    pickAgent(staff, { now: NOW, prefer: 'a' })!.user_id,
    'a',
    'the previous owner first',
  );
  assert.equal(
    pickAgent(staff, { now: NOW, prefer: 'c' })!.user_id,
    'e',
    'a previous owner who is off duty is skipped',
  );
  assert.equal(pickAgent([], { now: NOW }), null);
});

test('a forgotten duty switch stops counting after twelve hours', () => {
  const staff = [
    agent('a', { duty_since: NOW - 13 * 3_600_000 }),
    agent('b', { duty_since: NOW - 3_600_000 }),
  ];
  assert.equal(pickAgent(staff, { now: NOW })!.user_id, 'b');
  assert.equal(pickAgent([staff[0]], { now: NOW }), null);
});

test('staff alerts carry the customer, phone, need and a link to the file; reply channel when no phone', () => {
  const url = leadLink('https://club.example/', 'L1', 'C1');
  assert.equal(url, 'https://club.example/quan-ly?view=crm&customer=C1&lead=L1');
  const m = staffLeadMessage(
    {
      name: 'An',
      phone: '0912345678',
      need: 'Chơi 18 hố',
      message: 'cuối tuần',
      source: 'Facebook',
      campaign: 'Khai trương',
      guests: 4,
    },
    url,
    'new',
  );
  for (const text of ['An', '0912345678', 'Chơi 18 hố', 'Khai trương', url, '5 phút'])
    assert.ok(m.body.includes(text), text);
  const none = staffLeadMessage(
    { name: '', phone: '', need: '', message: '', source: 'Zalo OA', campaign: '', guests: 0 },
    url,
    'reassigned',
  );
  assert.ok(none.body.includes('trả lời qua Zalo OA'));
  assert.ok(none.body.includes('chuyển cho bạn'));
  const mgr = managerMessage(
    'overdue',
    {
      name: 'An',
      phone: '0912345678',
      need: '',
      message: '',
      source: 'x',
      campaign: '',
      guests: 0,
      agent: 'Lan',
    },
    url,
  );
  assert.ok(mgr.body.includes('Lan') && mgr.body.includes('Quá 5 phút'));
});

test('staff actions are validated', () => {
  assert.ok(
    leadInput.safeParse({ action: 'call', id: 'l1', result: 'answered', note: 'ok' }).success,
  );
  for (const bad of [
    { action: 'call', id: 'l1', result: 'maybe' },
    { action: 'lost', id: 'l1', reason: 'a' },
    { action: 'send-link', id: 'l1', service: '18', start: 1, guests: 0 },
    { action: 'create', phone: '1', extra: 1 },
  ])
    assert.ok(!leadInput.safeParse(bad).success, JSON.stringify(bad));
});

test('facebook and zalo signatures are checked against the app secret', async () => {
  const body = JSON.stringify({ entry: [{ id: '1' }] });
  const fb = 'sha256=' + createHmac('sha256', 'sec').update(body).digest('hex');
  assert.equal(await facebookSignatureValid(body, fb, 'sec'), true);
  assert.equal(await facebookSignatureValid(body + ' ', fb, 'sec'), false, 'changed body');
  assert.equal(await facebookSignatureValid(body, fb, 'other'), false, 'wrong secret');
  assert.equal(await facebookSignatureValid(body, null, 'sec'), false);
  assert.equal(await facebookSignatureValid(body, fb, ''), false, 'not configured never passes');
  const mac = createHash('sha256')
    .update('app' + body + '123' + 'sec')
    .digest('hex');
  assert.equal(await zaloSignatureValid(body, 'mac=' + mac, '123', 'app', 'sec'), true);
  assert.equal(
    await zaloSignatureValid(body, 'mac=' + mac, '124', 'app', 'sec'),
    false,
    'other timestamp',
  );
  assert.equal(
    await zaloSignatureValid(body, mac, '123', 'app', 'sec'),
    true,
    'header may omit the mac= prefix',
  );
});
