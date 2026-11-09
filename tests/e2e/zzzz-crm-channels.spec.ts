import { test, expect, type APIRequestContext } from '@playwright/test';

// CRM > Kênh & tích hợp: which channels are ready, the webhook addresses and tokens, the message queue. Managers only.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const SALE = { email: 'sale-channels@e2e.test', password: 'channels-sale-pass-2026' };
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let owner: APIRequestContext;
let sale: APIRequestContext;
let ipSeq = 0;
const visitor = () => ({ 'x-forwarded-for': `10.55.3.${++ipSeq}` });
const BASE = 'http://127.0.0.1:8787';

// A well-formed request with a field the strict schema refuses: 401 means the token was not accepted, 400 means it was.
const probe = (kind: 'website' | 'ads', token: string) =>
  owner.post(`/api/leads/${kind}`, {
    data: { campo_la: 1 },
    headers: { 'x-lead-token': token, ...visitor() },
  });

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: BASE });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const created = await owner.post('/api/staff', {
    data: { action: 'create', email: SALE.email, name: 'Sale Kênh', role: 'sale' },
  });
  expect([200, 409]).toContain(created.status());
  sale = await playwright.request.newContext({ baseURL: BASE });
  if (created.status() === 200) {
    const temp = ((await created.json()) as Json).temporaryPassword as string;
    expect(
      (
        await sale.post('/api/auth/login', { data: { email: SALE.email, password: temp } })
      ).status(),
    ).toBe(200);
    const changed = await sale.post('/api/auth/password', {
      data: { action: 'change', current: temp, next: SALE.password },
    });
    expect(changed.status(), await changed.text()).toBe(200);
  } else {
    expect((await sale.post('/api/auth/login', { data: SALE })).status()).toBe(200);
  }
});
test.afterAll(async () => {
  await owner.dispose();
  await sale.dispose();
});

test('quản lý xem được kênh, địa chỉ webhook và hàng gửi tin; không lộ bí mật', async () => {
  const r = await owner.get('/api/crm2/channels');
  expect(r.status()).toBe(200);
  const d = (await r.json()) as Json;
  const ids = d.channels.map((c: Json) => c.id);
  expect(ids).toEqual(
    expect.arrayContaining([
      'website-3dgolf',
      'ads-forms',
      'facebook-in',
      'zalo-in',
      'email-out',
      'zalo-out',
    ]),
  );
  expect(d.urls.website).toBe(`${BASE}/api/leads/website`);
  expect(d.urls.zalo).toBe(`${BASE}/api/leads/zalo`);
  expect(d.tokens).toEqual({ website: expect.any(Boolean), ads: expect.any(Boolean) });
  expect(Array.isArray(d.counts)).toBe(true);
  expect(Array.isArray(d.recent)).toBe(true);
  expect(JSON.stringify(d)).not.toMatch(/e2e-fb-secret|e2e-zalo-secret|e2e-cron-secret/);
});

test('tạo mã webhook: hiện một lần, dùng được, tạo lại thì mã cũ hết hiệu lực', async () => {
  for (const kind of ['website', 'ads'] as const) {
    const first = (await (
      await owner.post('/api/crm2/channels', { data: { action: 'rotate', kind } })
    ).json()) as Json;
    expect(first.token).toMatch(/^lk_/);
    expect((await probe(kind, first.token)).status()).toBe(400); // accepted, then refused for the stray field
    const second = (await (
      await owner.post('/api/crm2/channels', { data: { action: 'rotate', kind } })
    ).json()) as Json;
    expect(second.token).not.toBe(first.token);
    expect((await probe(kind, first.token)).status()).toBe(401); // the old one is dead
    expect((await probe(kind, second.token)).status()).toBe(400);
    expect(((await (await owner.get('/api/crm2/channels')).json()) as Json).tokens[kind]).toBe(
      true,
    );
  }
});

test('mã không nằm trong câu trả lời xem kênh (chỉ băm được lưu)', async () => {
  const made = (await (
    await owner.post('/api/crm2/channels', { data: { action: 'rotate', kind: 'website' } })
  ).json()) as Json;
  const view = await (await owner.get('/api/crm2/channels')).text();
  expect(view).not.toContain(made.token);
});

test('chỉ quản lý mới dùng được: nhân viên sale bị từ chối cả xem lẫn tạo mã', async () => {
  expect((await sale.get('/api/crm2/channels')).status()).toBe(403);
  expect(
    (
      await sale.post('/api/crm2/channels', { data: { action: 'rotate', kind: 'website' } })
    ).status(),
  ).toBe(403);
});

test('dữ liệu lạ bị từ chối', async () => {
  expect(
    (
      await owner.post('/api/crm2/channels', { data: { action: 'rotate', kind: 'facebook' } })
    ).status(),
  ).toBe(400);
  expect((await owner.post('/api/crm2/channels', { data: { action: 'khac' } })).status()).toBe(400);
});

test('màn hình: tab Kênh & tích hợp, tạo mã hiện một lần', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM', exact: true }).click();
  const crm = page.getByRole('region', { name: 'CRM' });
  await crm.getByRole('tab', { name: 'Cấu hình' }).click();
  await crm.getByRole('tab', { name: 'Kênh & tích hợp' }).click();
  await expect(crm.getByRole('heading', { name: 'Kênh nhận lead và gửi tin' })).toBeVisible();
  await expect(crm.getByRole('heading', { name: 'Địa chỉ webhook' })).toBeVisible();
  await expect(crm.getByText(`${BASE}/api/leads/zalo`)).toBeVisible();
  await expect(crm.getByRole('heading', { name: /Hàng gửi tin/ })).toBeVisible();
  await crm.getByRole('button', { name: /mã webhook Quảng cáo/ }).click();
  // a token already exists from the API test above, so the app asks before replacing it
  await page.getByRole('button', { name: 'Tạo mã mới' }).click();
  await expect(crm.getByText('chỉ hiện một lần', { exact: false })).toBeVisible();
  await expect(crm.locator('.crm-url')).toContainText('lk_');
});

test('nhân viên sale không thấy tab Kênh & tích hợp', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();
  expect((await page.request.post('/api/auth/login', { data: SALE })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM', exact: true }).click();
  const crm = page.getByRole('region', { name: 'CRM' });
  await expect(crm.getByRole('tab', { name: 'Bàn làm việc' })).toBeVisible();
  await expect(crm.getByRole('tab', { name: 'Kênh & tích hợp' })).toHaveCount(0);
  await ctx.close();
});
