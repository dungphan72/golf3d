import { test, expect, type APIRequestContext } from '@playwright/test';

// Customer messages around a booking, now owned by lib/server/booking-messages.ts and sent by the CRM module's cron:
// booking details and reminders, no-show notice and follow-up task. A booking closes the customer's open CRM lead.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const MIN = 60_000;
const DAY = 86_400_000;
const AUTH = { authorization: 'Bearer e2e-cron-secret-0123456789' };
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let owner: APIRequestContext;
let seq = 0;
const run = Date.now() % 100000;
const phone = () => `0944${String(100000 + run + ++seq).slice(-6)}`;
const at = (t: number) => ({ 'x-e2e-now': String(t) });
const get = async (url: string) => (await (await owner.get(url)).json()) as Json;
async function post(
  url: string,
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  const r = await owner.post(url, { data, headers });
  expect(r.status(), `${url} -> ${await r.text()}`).toBe(status);
  return (await r.json()) as Json;
}
const outbox = async (recipient: string) =>
  ((await get(`/api/crm2/channels?recipient=${encodeURIComponent(recipient)}`)).recent ??
    []) as Json[];

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
});
test.afterAll(async () => {
  await owner.dispose();
});

test('đổi lịch: lead CRM mới của khách chuyển Chốt; nhắc lịch do cron CRM mới gửi', async () => {
  const p = phone();
  const email = `nhac-${run}-${seq}@example.com`;
  // The lead comes from the CRM module; the customer record carries the e-mail the messages go to.
  // (The e-mail is set through the customer contact action, which still lives in the old CRM API.)
  const made = await post('/api/crm2/leads', {
    action: 'create',
    fullName: 'Khách Nhắc Lịch',
    phone: p,
  });
  const leadId = made.id as string;
  const lead0 = (await get('/api/crm2/leads?id=' + leadId)).lead as Json;
  expect(lead0.stage).toBe('NEW');
  await post('/api/members', { action: 'customer-create', name: 'Khách Nhắc Lịch', phone: p });
  const customers = (await get('/api/members?q=' + p)).customers as Json[];
  const customer = customers.find((c) => c.phone === p);
  expect(customer, 'customer exists').toBeTruthy();
  await post('/api/crm', { action: 'contact-set', customerId: customer!.id, email, zaloId: '' });

  const { config } = await get('/api/club');
  const day = new Date(Date.now() + 3 * DAY + 7 * 3_600_000).toISOString().slice(0, 10);
  const start = Date.parse(`${day}T14:00:00+07:00`);
  const booked = await post('/api/club', {
    action: 'book',
    room: 'line-6',
    service: '18',
    start,
    people: 1,
    minutes: 0,
    customer: 'Khách Nhắc Lịch',
    phone: p,
    expectedRevision: config.pricingRevision,
  });
  const moved = await post('/api/club', {
    action: 'reschedule',
    id: booked.id,
    start: start + 30 * MIN,
    room: 'line-7',
  });
  expect(moved.id).toBeTruthy();

  // The new booking closes the CRM lead, with a note in its history.
  const after = await get('/api/crm2/leads?id=' + leadId);
  expect(after.lead.stage).toBe('WON');
  expect(after.activities.some((a: Json) => a.type === 'STAGE' && /đặt lịch/.test(a.content))).toBe(
    true,
  );

  // Details went out now; the reminders wait for their time and carry the new hour.
  const first = await outbox(email);
  expect(first.some((m) => m.kind === 'booking_info' && m.status === 'sent')).toBe(true);
  const waiting = first.filter((m) => m.kind === 'reminder' && m.status === 'pending');
  expect(waiting.length).toBe(2);

  // Before the first reminder is due the CRM cron sends nothing; once due, it sends them.
  await post('/api/crm2/cron', {}, 200, { ...AUTH, ...at(start - 2 * DAY) });
  expect(
    (await outbox(email)).filter((m) => m.kind === 'reminder' && m.status === 'sent'),
  ).toHaveLength(0);
  await post('/api/crm2/cron', {}, 200, { ...AUTH, ...at(start - 60 * MIN) });
  const sent = (await outbox(email)).filter((m) => m.kind === 'reminder' && m.status === 'sent');
  expect(sent).toHaveLength(2);
});

test('khách không đến: báo khách và tạo việc liên hệ lại trong CRM mới', async () => {
  const p = phone();
  const email = `khongden-${run}-${seq}@example.com`;
  await post('/api/crm2/leads', { action: 'create', fullName: 'Khách Vắng', phone: p });
  await post('/api/members', { action: 'customer-create', name: 'Khách Vắng', phone: p });
  const customer = ((await get('/api/members?q=' + p)).customers as Json[]).find(
    (c) => c.phone === p,
  )!;
  await post('/api/crm', { action: 'contact-set', customerId: customer.id, email, zaloId: '' });
  const { config } = await get('/api/club');
  const start = Math.ceil((Date.now() + 20 * MIN) / 900_000) * 900_000;
  const booked = await post('/api/club', {
    action: 'book',
    room: 'line-8',
    service: '18',
    start,
    people: 1,
    minutes: 0,
    customer: 'Khách Vắng',
    phone: p,
    expectedRevision: config.pricingRevision,
  });
  await post('/api/club', { action: 'no-show', id: booked.id }, 200, at(start + 11 * MIN));
  expect((await outbox(email)).some((m) => m.kind === 'no_show')).toBe(true);
  const tasks = (await get('/api/crm2/tasks?scope=all')).tasks as Json[];
  expect(tasks.some((t) => String(t.title).includes('Khách Vắng') && t.type === 'CALL')).toBe(true);
});
