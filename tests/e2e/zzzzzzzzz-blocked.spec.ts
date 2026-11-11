import { test, expect, type APIRequestContext } from '@playwright/test';

// Blocked numbers: managers list/add/remove; intake drops a blocked number without telling the sender.
test.describe.configure({ mode: 'serial' });
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const origin = 'http://127.0.0.1:8787';
let owner: APIRequestContext;
const PHONE = '0955777881';
const post = (data: Record<string, unknown>) =>
  owner.post('/api/crm2/blocked', { data, headers: { origin } });

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: origin });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
});
test.afterAll(async () => owner.dispose());

test('chưa đăng nhập bị chặn; số sai bị từ chối', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get('/api/crm2/blocked')).status()).toBe(401);
  await anon.dispose();
  expect((await post({ action: 'add', phone: '12' })).status()).toBe(400);
});

test('chặn, trùng, form công khai bị bỏ qua, bỏ chặn', async () => {
  expect((await post({ action: 'add', phone: PHONE, reason: 'Số rác' })).status()).toBe(200);
  expect((await post({ action: 'add', phone: '+84955777881' })).status()).toBe(409); // same number, other format
  const list = (await (await owner.get('/api/crm2/blocked')).json()) as { rows: { phone: string; reason: string }[] };
  expect(list.rows.find((r) => r.phone === PHONE)?.reason).toBe('Số rác');

  const intake = await owner.post('/api/crm2/intake', {
    data: { fullName: 'Khách Bị Chặn', phone: PHONE, consent: true },
    headers: { origin, 'x-forwarded-for': '10.88.0.1' },
  });
  expect(intake.status()).toBe(200); // the sender is not told
  const leads = (await (await owner.get('/api/crm2/leads?q=' + PHONE)).json()) as { rows?: unknown[]; leads?: unknown[] };
  expect((leads.rows ?? leads.leads ?? []).length).toBe(0);

  expect((await post({ action: 'remove', phone: PHONE })).status()).toBe(200);
  expect((await post({ action: 'remove', phone: PHONE })).status()).toBe(404);
});
