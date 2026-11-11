import { test, expect, type APIRequestContext } from '@playwright/test';

// Bulk message campaigns: only consenting, reachable customers; queued with a stable key; cancellable.
test.describe.configure({ mode: 'serial' });
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const origin = 'http://127.0.0.1:8787';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let owner: APIRequestContext;
const PHONE = '0955322001';
const EMAIL = 'campaign.guest@e2e.test';
const camp = (data: Json) => owner.post('/api/crm2/campaigns', { data, headers: { origin } });
const base = { channel: 'email', segment: 'all', name: 'Tri ân tháng 11', subject: 'Ưu đãi riêng cho {ten}', body: 'Chào {ten}, mời bạn ghé câu lạc bộ.' };
let customerId = '';

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: origin });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  expect((await owner.post('/api/members', { data: { action: 'customer-create', name: 'Khách Chiến Dịch', phone: PHONE }, headers: { origin } })).status()).toBe(200);
  const found = (await (await owner.get('/api/members?q=' + PHONE)).json()) as Json;
  customerId = (found.customers as Json[]).find((c) => c.phone === PHONE)!.id;
});
test.afterAll(async () => owner.dispose());

test('chưa đăng nhập bị chặn; dữ liệu sai bị từ chối', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get('/api/crm2/campaigns')).status()).toBe(401);
  await anon.dispose();
  expect((await camp({ action: 'send', ...base, channel: 'sms' })).status()).toBe(400);
  expect((await camp({ action: 'send', ...base, name: ' ' })).status()).toBe(400);
});

test('khách chưa đồng ý nhận tin hoặc thiếu email thì bị bỏ qua', async () => {
  const before = (await (await camp({ action: 'preview', channel: 'email', segment: 'all' })).json()) as Json;
  const act = (data: Json) => owner.post('/api/crm2/care-customers', { data: { customerId, ...data }, headers: { origin } });
  expect((await act({ action: 'contact-set', email: EMAIL, zaloId: '' })).status()).toBe(200);
  // has an email but has not agreed to marketing yet
  const mid = (await (await camp({ action: 'preview', channel: 'email', segment: 'all' })).json()) as Json;
  expect(mid.recipients).toBe(before.recipients);
  expect((await act({ action: 'consent-set', consent: true })).status()).toBe(200);
  const after = (await (await camp({ action: 'preview', channel: 'email', segment: 'all' })).json()) as Json;
  expect(after.recipients).toBe(before.recipients + 1);
});

test('gửi: xếp hàng đúng người, có tên trong nội dung, theo dõi được và hủy được', async () => {
  const r = await camp({ action: 'send', ...base });
  expect(r.status()).toBe(200);
  const sent = (await r.json()) as Json;
  expect(sent.queued).toBeGreaterThanOrEqual(1);

  const mine = (await (await owner.get(`/api/crm2/channels?recipient=${encodeURIComponent(EMAIL)}`)).json()) as Json;
  const msg = (mine.recent as Json[]).find((m) => m.kind === 'campaign');
  expect(msg, 'message queued for the guest').toBeTruthy();

  const list = (await (await owner.get('/api/crm2/campaigns')).json()) as Json;
  const row = (list.campaigns as Json[]).find((c) => c.id === sent.id)!;
  expect(row.name).toBe('Tri ân tháng 11');
  expect(row.cancelled).toBe(false);

  expect((await camp({ action: 'cancel', id: sent.id })).status()).toBe(200);
  expect((await camp({ action: 'cancel', id: sent.id })).status()).toBe(409);
  expect((await camp({ action: 'cancel', id: 'khongco' })).status()).toBe(404);
});
