import { test, expect } from '@playwright/test';

// Response-time report: managers only; numbers are consistent; the screen opens from the Báo cáo group.
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const origin = 'http://127.0.0.1:8787';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

test('API: chưa đăng nhập bị chặn; số liệu nhất quán; khoảng ngày sai về mặc định', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get('/api/crm2/response')).status()).toBe(401);
  await anon.dispose();
  const owner = await playwright.request.newContext({ baseURL: origin });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const r = (await (await owner.get('/api/crm2/response?days=30')).json()) as Json;
  expect(r.days).toBe(30);
  expect(r.slaMinutes).toBeGreaterThan(0);
  expect(r.overall.responded).toBeLessThanOrEqual(r.overall.leads);
  const staffLeads = (r.byStaff as Json[]).reduce((n, x) => n + x.leads, 0);
  expect(staffLeads).toBe(r.overall.leads); // every owned lead belongs to exactly one staff row
  expect((r.bySource as Json[]).reduce((n, x) => n + x.leads, 0)).toBe(r.overall.leads);
  expect(Array.isArray(r.waiting)).toBe(true);
  expect(((await (await owner.get('/api/crm2/response?days=abc')).json()) as Json).days).toBe(30);
  expect(((await (await owner.get('/api/crm2/response?days=9999')).json()) as Json).days).toBe(365);
  await owner.dispose();
});

test('giao diện: Báo cáo > Phản hồi hiện các bảng', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('nav[aria-label="Quản trị hệ thống"]').getByRole('button', { name: /CRM/ }).click();
  await page.getByRole('navigation', { name: 'Menu CRM' }).getByRole('button', { name: 'Phản hồi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Theo nhân viên' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Theo nguồn' })).toBeVisible();
  await expect(page.getByText(/Lead đang chờ quá \d+ phút/)).toBeVisible();
});
