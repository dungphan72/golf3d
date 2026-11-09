import { createHmac, createHash } from 'node:crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';

// Lead to payment: inquiries from every channel, round-robin assignment, the 5-minute call deadline,
// consultation and booking messages, check-in, group payment and the receipt. The server runs with
// mocked message channels (E2E_MOCK_CHANNELS), and tests move the clock with `x-e2e-now`.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const MIN = 60_000;
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function post(
  request: APIRequestContext,
  url: string,
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  const response = await request.post(url, { data, headers });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Json;
}
const at = (t: number) => ({ 'x-e2e-now': String(t) });
const getJson = async (request: APIRequestContext, url: string, t?: number) =>
  (await (await request.get(url, { headers: t ? at(t) : {} })).json()) as Json;

let owner: APIRequestContext;
let agents: { userId: string; name: string }[] = [];
let websiteToken = '';
let adsToken = '';
let phoneSeq = 0;
const phone = () => `0961${String(100000 + ++phoneSeq)}`;

const leadsAt = async (t?: number) => (await getJson(owner, '/api/crm/leads', t)).leads as Json[];
const leadOf = async (id: string, t?: number) => (await leadsAt(t)).find((l) => l.id === id)!;
const eventsOf = async (customerId: string) =>
  (await getJson(owner, '/api/crm/leads?customer=' + customerId)).events as Json[];
const outbox = async (recipient = '', kind = '') =>
  (
    await getJson(
      owner,
      `/api/crm/channels?recipient=${encodeURIComponent(recipient)}&kind=${kind}`,
    )
  ).recent as Json[];
const website = (extra: Json, t = Date.now(), token = websiteToken) =>
  owner.post('/api/leads/website', { data: extra, headers: { 'x-lead-token': token, ...at(t) } });
const customerByPhone = async (p: string) =>
  ((await getJson(owner, '/api/members?q=' + p)).customers as Json[]).find((c) => c.phone === p)!;
async function setDuty(userId: string, onDuty: boolean) {
  await post(owner, '/api/crm/agents', { userId, onDuty });
}

// One signed-in context for the whole file (the per-test `page` fixture is closed after each test).
test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  // These tests cover the old lead pipeline; new installs route every channel to the CRM module.
  await routeChannels('LEGACY');
});
test.afterAll(async () => {
  await routeChannels('CRM2');
  await owner.dispose();
});
async function routeChannels(to: 'LEGACY' | 'CRM2') {
  const cfg = (await getJson(owner, '/api/crm2/config')) as Json;
  const r = await owner.post('/api/crm2/config', {
    data: {
      settings: {
        ...cfg.settings,
        websiteLeads: to,
        zaloLeads: to,
        facebookLeads: to,
        adsLeads: to,
      },
    },
  });
  expect(r.status(), await r.text()).toBe(200);
}

test('chuẩn bị: nhân viên nhận lead, mã webhook, kênh gửi tin sẵn sàng', async () => {
  for (const n of ['A', 'B']) {
    const r = await owner.post('/api/staff', {
      data: {
        action: 'create',
        email: `cskh${n.toLowerCase()}@e2e.test`,
        name: `CSKH ${n}`,
        role: 'cskh',
      },
    });
    expect([200, 409]).toContain(r.status());
  }
  const list = ((await getJson(owner, '/api/crm/agents')).agents as Json[]).filter((a) =>
    ['owner', 'cskh'].includes(a.role),
  );
  expect(list.length).toBeGreaterThanOrEqual(3);
  agents = list.slice(0, 3).map((a) => ({ userId: a.userId, name: a.name }));
  for (const a of agents) {
    await post(owner, '/api/crm/agents', {
      userId: a.userId,
      receivesLeads: true,
      email: `${a.userId}@alerts.test`,
      zaloId: `zalo-${a.userId}`,
    });
    await setDuty(a.userId, true);
  }
  // Everyone else (the first 3 are enough) stays off.
  for (const a of list.slice(3))
    await post(owner, '/api/crm/agents', { userId: a.userId, receivesLeads: false });
  websiteToken = (await post(owner, '/api/crm/channels', { action: 'rotate', kind: 'website' }))
    .token;
  adsToken = (await post(owner, '/api/crm/channels', { action: 'rotate', kind: 'ads' })).token;
  expect(websiteToken).toMatch(/^lk_/);
  const channels = (await getJson(owner, '/api/crm/channels')).channels as Json[];
  expect(channels.find((c) => c.id === 'website-3dgolf')?.configured).toBe(true);
  expect(channels.find((c) => c.id === 'email-out')?.configured).toBe(true); // mocked in the test server
});

test('lead từ website: nhận, gộp theo số điện thoại, không xử lý trùng, phân luân phiên', async () => {
  const t0 = Date.now();
  const p = phone();
  const first = await (
    await website(
      {
        id: 'w-1',
        name: 'Khách Web',
        phone: p,
        need: '18',
        guests: 2,
        message: 'Muốn đặt 18 hố',
        campaign: 'golfhub.cloud',
        consent: true,
      },
      t0,
    )
  ).json();
  expect(first).toMatchObject({ ok: true, duplicate: false, status: 'assigned' });
  const lead = await leadOf(first.leadId, t0);
  expect(lead).toMatchObject({
    source: 'website',
    campaign: 'golfhub.cloud',
    phone: p,
    need: '18',
    status: 'assigned',
    contacts: 1,
  });
  expect(lead.due_at).toBe(lead.received_at + 5 * MIN);
  expect(lead.assignee).toBeTruthy();

  // The assigned agent got an email and a Zalo message with name, phone, need and the file link.
  const mine = (await outbox('', 'lead_assigned')).filter(
    (m) => m.kind === 'lead_assigned' && m.recipient.includes(lead.assignee),
  );
  expect(mine.map((m) => m.channel).sort()).toEqual(['email', 'zalo']);
  expect(mine.every((m) => m.status === 'sent')).toBe(true);

  // The same webhook delivered again changes nothing.
  const sent = (await outbox('', 'lead_assigned')).length;
  const again = await (await website({ id: 'w-1', name: 'Khách Web', phone: p }, t0 + 1000)).json();
  expect(again).toMatchObject({ duplicate: true, leadId: first.leadId });
  expect((await outbox('', 'lead_assigned')).length).toBe(sent);

  // The customer writes again before anybody called: same lead, same agent, told once more.
  const second = await (
    await website(
      { id: 'w-2', phone: p, message: 'Cho em hỏi thêm giá', campaign: 'zalo-ads' },
      t0 + 30_000,
    )
  ).json();
  expect(second).toMatchObject({ duplicate: false, leadId: first.leadId, status: 'assigned' });
  const merged = await leadOf(first.leadId, t0 + 30_000);
  expect(merged.contacts).toBe(2);
  expect(merged.assignee).toBe(lead.assignee);
  expect(merged.due_at).toBe(lead.due_at);
  const customer = await customerByPhone(p);
  expect(customer.name).toBe('Khách Web');
  const history = await eventsOf(customer.id);
  expect(history.map((e) => e.kind)).toEqual(
    expect.arrayContaining(['received', 'assigned', 'contact']),
  );

  // Wrong token and bad payloads are refused.
  expect((await website({ phone: p }, t0, 'lk_wrong-token-0000000000000')).status()).toBe(401);
  const junk = await website({ phone: p, junk: true }, t0);
  expect(junk.status(), await junk.text()).toBe(400);

  // Three new leads go to three different agents (the one who waited longest each time).
  const owners = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const r = await (
      await website({ id: `rr-${t0}-${i}`, phone: phone(), name: `Khách RR ${i}` }, t0 + 40_000 + i)
    ).json();
    owners.add((await leadOf(r.leadId, t0 + 40_000 + i)).assignee);
  }
  expect(owners.size).toBe(3);
});

test('quá 5 phút chưa gọi: báo quản lý, chuyển người trực tiếp theo; có cuộc gọi thì dừng', async () => {
  const t0 = Date.now() + 30 * MIN;
  const p = phone();
  const r = await (await website({ id: `sla-${t0}`, name: 'Khách Quá Hạn', phone: p }, t0)).json();
  const lead = await leadOf(r.leadId, t0);
  const firstAgent = lead.assignee as string;

  // Four minutes in, still within the deadline: nothing moves.
  expect((await leadOf(r.leadId, t0 + 4 * MIN)).assignee).toBe(firstAgent);

  // Six minutes in: overdue. The managers are alerted and the lead goes to somebody else.
  const late = await leadOf(r.leadId, t0 + 6 * MIN);
  expect(late.assignee).not.toBe(firstAgent);
  expect(late.status).toBe('assigned');
  expect(late.due_at).toBe(t0 + 6 * MIN + 5 * MIN);
  await leadsAt(t0 + 6 * MIN); // sweeping again is harmless
  const customer = await customerByPhone(p);
  const kinds = (await eventsOf(customer.id)).map((e) => e.kind);
  expect(kinds.filter((k) => k === 'overdue')).toHaveLength(1);
  expect(kinds.filter((k) => k === 'assigned')).toHaveLength(2);
  const alerts = await outbox('', 'manager_overdue');
  expect(alerts.length).toBeGreaterThan(0);
  expect(alerts.every((m) => m.audience === 'staff')).toBe(true);
  const notified = (await outbox('', 'lead_assigned')).filter((m) =>
    m.recipient.includes(late.assignee),
  );
  expect(notified.length).toBeGreaterThan(0);

  // The new agent records the call in time: the deadline is met and nothing escalates any more.
  await post(
    owner,
    '/api/crm/leads',
    { action: 'call', id: r.leadId, result: 'answered', note: 'Tư vấn 18 hố, hẹn thứ 7' },
    200,
    at(t0 + 8 * MIN),
  );
  const called = await leadOf(r.leadId, t0 + 30 * MIN);
  expect(called.status).toBe('contacted');
  expect(called.first_call_at).toBe(t0 + 8 * MIN);
  const after = (await eventsOf(customer.id)).filter((e) => e.kind === 'overdue');
  expect(after).toHaveLength(1);
  const callEvent = (await eventsOf(customer.id)).find((e) => e.kind === 'call')!;
  expect(JSON.parse(callEvent.detail)).toMatchObject({ result: 'answered', withinSla: true });
});

test('hết người trực: vào hàng chờ, báo quản lý, có người vào ca thì tự nhận', async () => {
  const t0 = Date.now() + 60 * MIN;
  for (const a of agents) await setDuty(a.userId, false);
  const p = phone();
  const r = await (await website({ id: `q-${t0}`, name: 'Khách Hàng Chờ', phone: p }, t0)).json();
  expect(r.status).toBe('queued');
  const waiting = await leadOf(r.leadId, t0);
  expect(waiting).toMatchObject({ status: 'queued', assignee: null });
  const customer = await customerByPhone(p);
  expect((await eventsOf(customer.id)).map((e) => e.kind)).toContain('queued');
  expect((await outbox('', 'manager_queued')).length > 0).toBe(true);

  // Someone comes on duty: the queue is handed over at once.
  await setDuty(agents[0].userId, true);
  const taken = await leadOf(r.leadId);
  expect(taken.status).toBe('assigned');
  expect(taken.assignee).toBe(agents[0].userId);
  await setDuty(agents[1].userId, true);
  await setDuty(agents[2].userId, true);

  // Overdue with nobody left to take it (everyone else off duty): back to the queue, managers told.
  const t1 = Date.now() + 90 * MIN;
  const p2 = phone();
  const lone = await (
    await website({ id: `lone-${t1}`, name: 'Khách Một Mình', phone: p2 }, t1)
  ).json();
  const holder = (await leadOf(lone.leadId, t1)).assignee as string;
  for (const a of agents) if (a.userId !== holder) await setDuty(a.userId, false);
  const stuck = await leadOf(lone.leadId, t1 + 6 * MIN);
  expect(stuck).toMatchObject({ status: 'queued', assignee: null });
  const kinds = (await eventsOf((await customerByPhone(p2)).id)).map((e) => e.kind);
  expect(kinds).toEqual(expect.arrayContaining(['overdue', 'queued']));
  for (const a of agents) await setDuty(a.userId, true);
  expect((await leadOf(lone.leadId)).status).toBe('assigned');
});

test('lead qua Zalo (không có số), Facebook (chữ ký) và form quảng cáo', async () => {
  const t0 = Date.now() + 120 * MIN;
  // Zalo OA: signed with the app secret; a message without a phone is answered on the channel.
  const zalo = {
    event_name: 'user_send_text',
    timestamp: String(t0),
    sender: { id: 'zl-user-1' },
    message: { text: 'Cho em hỏi giá tập swing', msg_id: 'zm-1' },
  };
  const zraw = JSON.stringify(zalo);
  const mac = createHash('sha256')
    .update('e2e-zalo-app' + zraw + zalo.timestamp + 'e2e-zalo-secret')
    .digest('hex');
  const bad = await owner.post('/api/leads/zalo', {
    data: zraw,
    headers: { 'content-type': 'application/json', 'x-zevent-signature': 'mac=0000', ...at(t0) },
  });
  expect(bad.status()).toBe(401);
  const okZ = await owner.post('/api/leads/zalo', {
    data: zraw,
    headers: { 'content-type': 'application/json', 'x-zevent-signature': 'mac=' + mac, ...at(t0) },
  });
  expect(okZ.status()).toBe(200);
  const zl = await okZ.json();
  const zLead = await leadOf(zl.leadId, t0);
  expect(zLead).toMatchObject({ source: 'zalo', phone: '', status: 'assigned', need: 'swing' });
  expect(zLead.channel_ref).toBe('zalo:zl-user-1');
  const again = await (
    await owner.post('/api/leads/zalo', {
      data: zraw,
      headers: {
        'content-type': 'application/json',
        'x-zevent-signature': 'mac=' + mac,
        ...at(t0 + 1000),
      },
    })
  ).json();
  expect(again.duplicate).toBe(true);
  await post(
    owner,
    '/api/crm/leads',
    { action: 'replied', id: zl.leadId, channel: 'Zalo', note: 'Đã báo giá qua OA' },
    200,
    at(t0 + 2 * MIN),
  );
  expect((await leadOf(zl.leadId, t0 + 3 * MIN)).status).toBe('contacted');

  // Facebook Lead Ads: verification handshake and a signed lead with field data.
  const verify = await owner.get(
    '/api/leads/facebook?hub.mode=subscribe&hub.verify_token=e2e-fb-verify&hub.challenge=abc123',
  );
  expect(await verify.text()).toBe('abc123');
  expect(
    (
      await owner.get(
        '/api/leads/facebook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x',
      )
    ).status(),
  ).toBe(403);
  const fbPhone = phone();
  const fb = {
    entry: [
      {
        changes: [
          {
            field: 'leadgen',
            value: {
              leadgen_id: `fb-${t0}`,
              ad_id: 'ad-khai-truong',
              field_data: [
                { name: 'full_name', values: ['Khách Facebook'] },
                { name: 'phone_number', values: [fbPhone] },
                { name: 'nhu_cau', values: ['Chơi 9 hố cuối tuần'] },
              ],
            },
          },
        ],
      },
    ],
  };
  const fraw = JSON.stringify(fb);
  const sig = 'sha256=' + createHmac('sha256', 'e2e-fb-secret').update(fraw).digest('hex');
  expect(
    (
      await owner.post('/api/leads/facebook', {
        data: fraw,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=bad' },
      })
    ).status(),
  ).toBe(401);
  const fbRes = await owner.post('/api/leads/facebook', {
    data: fraw,
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig, ...at(t0) },
  });
  expect((await fbRes.json()).processed).toBe(1);
  const fbCustomer = await customerByPhone(fbPhone);
  expect(fbCustomer.name).toBe('Khách Facebook');
  const fbLead = (await leadsAt(t0)).find((l) => l.customer_id === fbCustomer.id)!;
  expect(fbLead).toMatchObject({
    source: 'facebook',
    campaign: 'ad-khai-truong',
    need: '9',
    status: 'assigned',
  });

  // Ad form (Google, TikTok, Zapier): own token, platform as campaign.
  const adsPhone = phone();
  const ads = await owner.post('/api/leads/ads', {
    data: {
      source: 'tiktok',
      id: `tk-${t0}`,
      name: 'Khách TikTok',
      phone: adsPhone,
      message: 'Quan tâm đăng ký thẻ tháng',
    },
    headers: { 'x-lead-token': adsToken, ...at(t0) },
  });
  expect(ads.status()).toBe(200);
  const adsLead = (await leadsAt(t0)).find((l) => l.phone === adsPhone)!;
  expect(adsLead).toMatchObject({ source: 'ads', campaign: 'tiktok' });
  expect(
    (
      await owner.post('/api/leads/ads', {
        data: { phone: adsPhone },
        headers: { 'x-lead-token': websiteToken },
      })
    ).status(),
  ).toBe(401);
});

test('tư vấn: lịch trống, báo giá, link đặt lịch, xác nhận, đổi lịch, hủy và nhắc giờ', async ({
  page,
  browser,
}) => {
  const t0 = Date.now() + 150 * MIN;
  const p = phone();
  const created = await post(
    owner,
    '/api/crm/leads',
    {
      action: 'create',
      name: 'Khách Tư Vấn',
      phone: p,
      need: '18',
      message: 'Muốn chơi 18 hố với bạn',
    },
    200,
    at(t0),
  );
  const customer = await customerByPhone(p);
  await post(owner, '/api/crm', {
    action: 'contact-set',
    customerId: customer.id,
    email: 'tuvan@example.com',
    zaloId: '',
  });
  const day = new Date(Date.now() + 86_400_000 + 7 * 3_600_000).toISOString().slice(0, 10);
  const start = Date.parse(`${day}T14:00:00+07:00`);

  const avail = await post(owner, '/api/crm/availability', {
    service: '18',
    start,
    guests: 2,
    vip: false,
  });
  expect(avail.freeRooms.length).toBeGreaterThan(0);
  expect(avail.enough).toBe(true);
  expect(avail.total).toBeGreaterThan(0);
  expect(avail.alternatives.length).toBeGreaterThan(0);
  const group = await post(owner, '/api/crm/availability', {
    service: '18',
    start,
    guests: 9,
    vip: false,
  });
  expect(group.lines).toBe(3);
  expect(group.total).toBeGreaterThan(avail.total);

  // The link carries the customer, the slot and the guests; a message with it is queued for the customer.
  const sent = await post(
    owner,
    '/api/crm/leads',
    { action: 'send-link', id: created.leadId, service: '18', start, guests: 2, vip: false },
    200,
    at(t0),
  );
  expect(sent.url).toContain('/book/e2e-golf?service=18');
  expect(sent.manual).toBe(false);
  const linkMsg = (await outbox('tuvan@example.com')).find((m) => m.kind === 'booking_link');
  expect(linkMsg?.status).toBe('sent');

  // The customer opens the link: the form is filled in; submitting it is one more contact of the same lead.
  const guest = await browser.newContext({
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    extraHTTPHeaders: { 'x-forwarded-for': '10.20.30.40' },
  });
  const form = await guest.newPage();
  await form.goto(sent.url);
  await expect(form.getByLabel('Họ và tên')).toHaveValue('Khách Tư Vấn');
  await expect(form.getByLabel('Số điện thoại')).toHaveValue(p);
  await expect(form.getByLabel('Số người')).toHaveValue('2');
  await expect(form.getByLabel(/Ngày, giờ bắt đầu/)).toHaveValue(`${day}T14:00`);
  await expect(form.getByLabel('Dịch vụ')).toHaveValue('18');
  await form.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }).click();
  await expect(form.getByText('Đang chờ nhân viên xác nhận')).toBeVisible();
  const lead = (await leadsAt()).find((l) => l.id === created.leadId)!;
  expect(lead.contacts).toBeGreaterThanOrEqual(2);

  // The receptionist confirms: booking details and reminders go to the customer, the lead is booked.
  const requests = (await getJson(owner, '/api/online')).requests as Json[];
  const request = requests.find((r) => r.phone === p && r.status === 'pending')!;
  const done = await post(owner, '/api/online', {
    action: 'confirm',
    id: request.id,
    room: request.freeRooms[0].id,
    extraRooms: [],
  });
  const bookingId = done.bookingId as string;
  const mails = await outbox('tuvan@example.com');
  expect(mails.some((m) => m.kind === 'booking_info' && m.status === 'sent')).toBe(true);
  const pending = mails.filter((m) => m.kind === 'reminder');
  expect(pending.length).toBeGreaterThan(0);
  expect(pending.every((m) => m.status === 'pending')).toBe(true); // due later: queued with their send time
  expect((await leadsAt()).find((l) => l.id === created.leadId)!.status).toBe('booked');

  // Reschedule: the old reminders stop, the customer gets the new details.
  const later = start + 30 * MIN;
  const moved = await post(owner, '/api/club', {
    action: 'reschedule',
    id: bookingId,
    start: later,
    room: request.freeRooms[1].id,
  });
  expect(moved.id).not.toBe(bookingId);
  const oldBooking = ((await getJson(owner, '/api/club')).bookings as Json[]).find(
    (b) => b.id === bookingId,
  )!;
  expect(oldBooking.status).toBe('cancelled');
  const afterMove = await outbox('tuvan@example.com');
  expect(afterMove.filter((m) => m.kind === 'booking_info')).toHaveLength(2);
  // Only the new booking's reminders remain (which ones are due depends on the time of day).
  const stillPending = afterMove.filter((m) => m.kind === 'reminder' && m.status === 'pending');
  expect(stillPending.every((m) => String(m.body).includes('14:30'))).toBe(true);
  expect(stillPending.some((m) => String(m.body).includes('14:00'))).toBe(false);

  // Cancel: the customer is told and the reminders of that booking are cancelled.
  await post(owner, '/api/club', { action: 'cancel', id: moved.id });
  const cancelled = await outbox('tuvan@example.com');
  expect(cancelled.some((m) => m.kind === 'booking_cancel')).toBe(true);
  expect(cancelled.filter((m) => m.kind === 'reminder' && m.status === 'pending')).toHaveLength(0);
  void page;
});

test('khách không đến: giải phóng line, báo khách, giao việc liên hệ lại', async () => {
  const p = phone();
  const lead = await post(
    owner,
    '/api/crm/leads',
    { action: 'create', name: 'Khách Không Đến', phone: p },
    200,
  );
  const customer = await customerByPhone(p);
  await post(owner, '/api/crm', {
    action: 'contact-set',
    customerId: customer.id,
    email: 'khongden@example.com',
    zaloId: '',
  });
  const { config } = await getJson(owner, '/api/club');
  const start = Math.ceil((Date.now() + 20 * MIN) / 900_000) * 900_000;
  const booked = await post(owner, '/api/club', {
    action: 'book',
    room: 'line-5',
    service: '18',
    start,
    people: 1,
    minutes: 0,
    customer: 'Khách Không Đến',
    phone: p,
    expectedRevision: config.pricingRevision,
  });
  // Too early: the customer may still arrive.
  await post(owner, '/api/club', { action: 'no-show', id: booked.id }, 400);
  await post(owner, '/api/club', { action: 'no-show', id: booked.id }, 200, at(start + 11 * MIN));
  const row = ((await getJson(owner, '/api/club')).bookings as Json[]).find(
    (b) => b.id === booked.id,
  )!;
  expect(row.status).toBe('cancelled');
  expect((await outbox('khongden@example.com')).some((m) => m.kind === 'no_show')).toBe(true);
  const tasks = (await getJson(owner, '/api/crm?view=tasks')).tasks as Json[];
  expect(tasks.some((t) => t.customer_id === customer.id && t.rule === 'noshow')).toBe(true);
  void lead;
});

test('check-in, gia hạn có kiểm tra lịch, thu gộp, biên nhận và cảm ơn một lần', async () => {
  const p = phone();
  await post(
    owner,
    '/api/crm/leads',
    { action: 'create', name: 'Khách Thanh Toán', phone: p },
    200,
  );
  const customer = await customerByPhone(p);
  await post(owner, '/api/crm', {
    action: 'contact-set',
    customerId: customer.id,
    email: 'thutien@example.com',
    zaloId: '',
  });
  const { config } = await getJson(owner, '/api/club');
  const start = Math.ceil(Date.now() / 900_000) * 900_000;
  const book = (room: string, s: number, minutes = 60) =>
    post(owner, '/api/club', {
      action: 'book',
      room,
      service: 'gdr',
      start: s,
      people: 1,
      minutes,
      customer: 'Khách Thanh Toán',
      phone: p,
      expectedRevision: config.pricingRevision,
    });
  // Two lines that are free right now (other specs already used some).
  const free = (
    await post(owner, '/api/crm/availability', { service: 'gdr', start, guests: 1, vip: false })
  ).freeRooms as { id: string }[];
  expect(free.length).toBeGreaterThanOrEqual(2);
  // Lines no other spec uses: a session another spec started a few minutes early leaves its line
  // "cleaning" past its own booking window, which would make this check depend on the time of day.
  const roomA = 'line-2';
  const roomB = 'line-8';
  expect(free.map((r) => r.id)).toEqual(expect.arrayContaining([roomA, roomB]));
  const a = await book(roomA, start);
  const b = await book(roomB, start);
  // A second customer takes line-6 right after: the first one cannot extend into it.
  // The next customer starts on the first 15-minute mark after this one's hour and the cleaning time.
  const cleaning = Math.ceil(((config.clean as number) * MIN) / 900_000) * 900_000;
  await book(roomA, start + 60 * MIN + cleaning);
  for (const x of [a, b]) {
    await post(owner, '/api/club', { action: 'start', id: x.id });
  }
  await post(owner, '/api/club', { action: 'extend', id: b.id, minutes: 30 });
  const blocked = await post(owner, '/api/club', { action: 'extend', id: a.id, minutes: 60 }, 409);
  expect(blocked.error).toContain('đã có khách đặt');
  await post(owner, '/api/club', { action: 'extend', id: a.id, minutes: 7 }, 400);
  for (const x of [a, b]) await post(owner, '/api/club', { action: 'finish', id: x.id });

  const bills = ((await getJson(owner, '/api/club')).bookings as Json[]).filter((x) =>
    [a.id, b.id].includes(x.id),
  );
  const total = bills.reduce((n, x) => n + x.amount, 0);
  const key = crypto.randomUUID().replaceAll('-', '') + 'gr';
  const pay = {
    action: 'pay-group',
    requestId: key,
    bookingIds: [a.id, b.id],
    method: 'cash',
    expectedTotal: total,
  };
  await post(owner, '/api/finance', { ...pay, expectedTotal: total + 1 }, 409);
  await post(owner, '/api/finance', pay);
  const retry = await post(owner, '/api/finance', pay);
  expect(retry.replayed).toBe(true);
  const paid = ((await getJson(owner, '/api/club')).bookings as Json[]).filter((x) =>
    [a.id, b.id].includes(x.id),
  );
  expect(paid.map((x) => x.status)).toEqual(['paid', 'paid']);

  // One receipt per booking, sent once even though the payment was retried; the thank-you waits a day.
  const mails = await outbox('thutien@example.com');
  expect(mails.filter((m) => m.kind === 'receipt')).toHaveLength(2);
  expect(mails.filter((m) => m.kind === 'receipt').every((m) => m.status === 'sent')).toBe(true);
  const thanks = mails.filter((m) => m.kind === 'thanks');
  expect(thanks).toHaveLength(2);
  expect(thanks.every((m) => m.status === 'pending')).toBe(true);
  expect(mails.find((m) => m.kind === 'receipt')!.subject).toContain('biên nhận');
  // The same bill cannot be collected twice.
  await post(
    owner,
    '/api/finance',
    { ...pay, requestId: crypto.randomUUID().replaceAll('-', '') + 'g2' },
    409,
  );

  // Feedback: a low score is a complaint for the managers; a good one is only noted.
  await post(owner, '/api/crm', {
    action: 'feedback',
    customerId: customer.id,
    rating: 5,
    comment: 'Rất tốt',
  });
  const bad = await post(owner, '/api/crm', {
    action: 'feedback',
    customerId: customer.id,
    rating: 2,
    comment: 'Máy chiếu bị mờ',
  });
  expect(bad.complaintTask).toBeTruthy();
  expect((await outbox('', 'complaint')).some((m) => m.body.includes('Máy chiếu bị mờ'))).toBe(
    true,
  );
  const tasks = (await getJson(owner, '/api/crm?view=tasks')).tasks as Json[];
  expect(tasks.some((t) => t.id === bad.complaintTask && t.rule === 'complaint')).toBe(true);

  // Marketing consent: the rebooking suggestion is only for customers who agreed.
  await post(owner, '/api/crm', { action: 'consent-set', customerId: customer.id, consent: true });
  const c2 = (await getJson(owner, '/api/crm?view=customer&id=' + customer.id)).customer;
  expect(c2.marketing_consent).toBe(1);
});

test('tư vấn dịch vụ: giai đoạn, hẹn trải nghiệm, gọi hụt, chốt cần giá trị, thất bại cần lý do', async () => {
  const t0 = Date.now() + 120 * MIN;
  for (const a of agents) await setDuty(a.userId, true);
  const mk = async (name: string) => {
    const p = phone();
    const r = await (await website({ id: `st-${name}-${t0}`, name, phone: p }, t0)).json();
    return r.leadId as string;
  };

  // Missed calls schedule the next try (2 hours, then 1 day) and the lead stays "new".
  const a = await mk('Khách Gọi Hụt');
  await post(
    owner,
    '/api/crm/leads',
    { action: 'call', id: a, result: 'no_answer' },
    200,
    at(t0 + MIN),
  );
  let l = await leadOf(a, t0 + MIN);
  expect([l.stage, l.missed, l.next_at]).toEqual(['new', 1, t0 + MIN + 2 * 3_600_000]);
  await post(
    owner,
    '/api/crm/leads',
    { action: 'call', id: a, result: 'busy' },
    200,
    at(t0 + 2 * MIN),
  );
  l = await leadOf(a, t0 + 2 * MIN);
  expect([l.missed, l.next_at]).toEqual([2, t0 + 2 * MIN + 24 * 3_600_000]);

  // The customer is reached and needs time: stage "qualified", missed count resets.
  await post(
    owner,
    '/api/crm/leads',
    { action: 'call', id: a, result: 'thinking' },
    200,
    at(t0 + 3 * MIN),
  );
  l = await leadOf(a, t0 + 3 * MIN);
  expect([l.stage, l.status, l.missed]).toEqual(['qualified', 'contacted', 0]);

  // A trial meeting needs a future time.
  await post(
    owner,
    '/api/crm/leads',
    { action: 'call', id: a, result: 'trial' },
    400,
    at(t0 + 4 * MIN),
  );
  const meeting = t0 + 3 * 24 * 60 * MIN;
  await post(
    owner,
    '/api/crm/leads',
    { action: 'call', id: a, result: 'trial', at: meeting },
    200,
    at(t0 + 4 * MIN),
  );
  l = await leadOf(a, t0 + 4 * MIN);
  expect([l.stage, l.next_at]).toEqual(['trial', meeting]);

  // Profile: interest, budget and tags are kept.
  await post(
    owner,
    '/api/crm/leads',
    {
      action: 'profile',
      id: a,
      interest: 'Học swing cùng HLV',
      budget: 3000000,
      tags: ['VIP', 'Cần HLV'],
      note: 'Đi cùng vợ',
    },
    200,
    at(t0 + 5 * MIN),
  );
  l = await leadOf(a, t0 + 5 * MIN);
  expect([l.interest, l.budget, JSON.parse(l.tags)]).toEqual([
    'Học swing cùng HLV',
    3000000,
    ['VIP', 'Cần HLV'],
  ]);

  // Won needs the value of the sale; then the lead is closed with it.
  await post(
    owner,
    '/api/crm/leads',
    { action: 'stage', id: a, stage: 'won' },
    400,
    at(t0 + 6 * MIN),
  );
  await post(
    owner,
    '/api/crm/leads',
    { action: 'stage', id: a, stage: 'won', dealValue: 2500000 },
    200,
    at(t0 + 6 * MIN),
  );
  l = await leadOf(a, t0 + 6 * MIN);
  expect([l.stage, l.status, l.deal_value]).toEqual(['won', 'booked', 2500000]);
  await post(
    owner,
    '/api/crm/leads',
    { action: 'stage', id: a, stage: 'qualified' },
    409,
    at(t0 + 7 * MIN),
  );

  // Lost needs a reason; "wrong number" closes by itself.
  const b = await mk('Khách Thất Bại');
  await post(owner, '/api/crm/leads', { action: 'stage', id: b, stage: 'lost' }, 400, at(t0 + MIN));
  await post(
    owner,
    '/api/crm/leads',
    { action: 'stage', id: b, stage: 'lost', reason: 'Giá cao hoặc ngân sách' },
    200,
    at(t0 + MIN),
  );
  l = await leadOf(b, t0 + MIN);
  expect([l.stage, l.status, l.lost_reason]).toEqual(['lost', 'lost', 'Giá cao hoặc ngân sách']);
  const c = await mk('Khách Sai Số');
  await post(
    owner,
    '/api/crm/leads',
    { action: 'call', id: c, result: 'wrong_number' },
    200,
    at(t0 + MIN),
  );
  l = await leadOf(c, t0 + MIN);
  expect([l.stage, l.status]).toEqual(['lost', 'lost']);

  // Manual move to "visited" and the report.
  const d = await mk('Khách Đã Trải Nghiệm');
  await post(
    owner,
    '/api/crm/leads',
    { action: 'stage', id: d, stage: 'visited' },
    200,
    at(t0 + MIN),
  );
  l = await leadOf(d, t0 + MIN);
  expect([l.stage, l.first_call_at != null]).toEqual(['visited', true]);
  const report = await getJson(owner, '/api/crm/leads?report=30', t0 + 10 * MIN);
  expect(report.total).toBeGreaterThanOrEqual(4);
  const count = (st: string) => report.stages.find((x: Json) => x.stage === st)?.n ?? 0;
  expect(count('won')).toBeGreaterThanOrEqual(1);
  expect(count('lost')).toBeGreaterThanOrEqual(2);
  expect(report.lost.map((x: Json) => x.reason)).toContain('Giá cao hoặc ngân sách');
  expect(report.sources.find((x: Json) => x.source === 'website').won).toBeGreaterThanOrEqual(1);
});

// Legacy CRM v1 UI was retired in favor of CRM v2 (tested in zzzz-crm-*.spec.ts and zzzzz-crm-*.spec.ts).
test.skip('màn hình Lead: đồng hồ 5 phút, ghi nhận cuộc gọi, kênh và hàng gửi tin', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const p = phone();
  const r = await (
    await website({
      id: `ui-${Date.now()}`,
      name: 'Khách Giao Diện Lead',
      phone: p,
      need: '9',
      message: 'Hỏi giá 9 hố',
    })
  ).json();
  expect(r.ok).toBe(true);
  await page.goto('/quan-ly');
  // A lead waiting for its first call shows up on the home board.
  await expect(
    page
      .getByRole('region', { name: 'Việc cần làm ngay' })
      .getByText(/lead .*(chờ gọi|chưa gọi)/),
  ).toBeVisible();
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM', exact: true }).click();
  await page.getByRole('tab', { name: 'Chăm sóc KH (cũ)' }).click();
  await expect(page.getByRole('tab', { name: 'Lead mới' })).toBeVisible();
  const card = page.locator('.crm-lead', { hasText: 'Khách Giao Diện Lead' });
  await expect(card).toBeVisible();
  await expect(card.getByText(/Cần gọi trong/)).toBeVisible();
  await expect(card.getByText('Website')).toBeVisible();
  await card.getByRole('button', { name: 'Ghi nhận cuộc gọi' }).click();
  await card.getByLabel('Ghi chú cuộc gọi').fill('Đã tư vấn 9 hố');
  await card.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(card.getByText('Đã liên hệ').first()).toBeVisible();
  await expect(card.getByText(/Cần gọi trong/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Pipeline', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Hẹn trải nghiệm' })).toBeVisible();
  await expect(page.locator('.crm-mini', { hasText: 'Khách Giao Diện Lead' })).toBeVisible();
  await page.getByRole('button', { name: 'Danh sách', exact: true }).click();
  await page.getByRole('tab', { name: 'Báo cáo tư vấn' }).click();
  await expect(page.getByRole('heading', { name: 'Phễu tư vấn' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hiệu quả theo nguồn' })).toBeVisible();
  await page.getByRole('tab', { name: 'Lead mới' }).click();
  await page.getByRole('tab', { name: 'Thiết lập' }).click();
  await page.getByRole('button', { name: 'Nhân sự nhận lead' }).click();
  await expect(page.getByLabel(/^Nhận lead /).first()).toBeVisible();
  await page.getByRole('button', { name: 'Kênh & tích hợp' }).click();
  await expect(page.getByText('Form website 3dgolf.vn')).toBeVisible();
  await expect(page.getByText('Facebook Lead Ads (webhook)')).toBeVisible();
  await expect(page.getByText('Hàng gửi tin')).toBeVisible();
  await page.getByRole('tab', { name: 'Lead mới' }).click();
  await card.getByRole('button', { name: 'Hồ sơ khách' }).click();
  await expect(page.getByRole('heading', { name: 'Người phụ trách và hạn gọi' })).toBeVisible();
  await page.getByRole('tab', { name: 'Lịch sử' }).click();
  await expect(page.getByRole('heading', { name: 'Lịch sử xử lý lead' })).toBeVisible();
});
