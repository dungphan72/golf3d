import { test, expect } from '@playwright/test';

// CRM home dashboard: /api/crm2/home returns the 5 grouped pipeline columns and the screen renders them.
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

test('crm home api returns kpis and five pipeline columns', async ({ playwright }) => {
  const owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const res = await owner.get('/api/crm2/home');
  expect(res.status()).toBe(200);
  const j = await res.json();
  expect(j.columns.map((c: { label: string }) => c.label)).toEqual([
    'Lead mới',
    'Đang tư vấn',
    'Hẹn trải nghiệm',
    'Chờ thanh toán',
    'Đã chốt',
  ]);
  expect(typeof j.kpi.customers).toBe('number');
  expect(j.weekly).toHaveLength(4);
  const anon = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await anon.get('/api/crm2/home')).status()).toBe(401);
});

test('crm overview screen shows the dashboard', async ({ page }) => {
  await page.goto('/quan-ly');
  await page.getByLabel('Email').fill(OWNER.email);
  await page.getByLabel('Mật khẩu').fill(OWNER.password);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await page.goto('/quan-ly?view=crm');
  await expect(page.getByRole('heading', { name: /Xin chào/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Pipeline bán hàng/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Công việc hôm nay/ })).toBeVisible();
});
