import { test, expect } from '@playwright/test';

// Saved lead-list filters: kept per person, replaced by name, deletable; usable from the lead list screen.
test.describe.configure({ mode: 'serial' });
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const origin = 'http://127.0.0.1:8787';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

test('API: lưu, đọc, ghi đè cùng tên, xóa; tên quá ngắn bị từ chối; chưa đăng nhập bị chặn', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get('/api/crm2/views')).status()).toBe(401);
  await anon.dispose();
  const owner = await playwright.request.newContext({ baseURL: origin });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const post = (data: Json) => owner.post('/api/crm2/views', { data, headers: { origin } });
  const list = async () => (((await (await owner.get('/api/crm2/views')).json()) as Json).views ?? []) as Json[];

  for (const v of await list()) await post({ action: 'delete', id: v.id });
  expect((await post({ action: 'save', name: 'a', stage: 'NEW', q: '' })).status()).toBe(400);
  expect((await post({ action: 'save', name: 'Lead mới', stage: 'NEW', q: 'swing' })).status()).toBe(200);
  expect((await post({ action: 'save', name: 'LEAD MỚI', stage: 'WON', q: '' })).status()).toBe(200);
  const views = await list();
  expect(views.length).toBe(1);
  expect(views[0]).toMatchObject({ name: 'LEAD MỚI', stage: 'WON' });
  expect((await post({ action: 'save', name: 'Bậy', stage: 'KHONGCO', q: '' })).status()).toBe(200);
  expect((await list()).find((v) => v.name === 'Bậy')?.stage).toBe('');
  for (const v of await list()) expect((await post({ action: 'delete', id: v.id })).status()).toBe(200);
  expect((await post({ action: 'delete', id: 'khongco' })).status()).toBe(404);
  await owner.dispose();
});

test('giao diện: lưu bộ lọc Chốt rồi bấm lại chế độ xem để lọc', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('nav[aria-label="Quản trị hệ thống"]').getByRole('button', { name: /CRM/ }).click();
  await page.getByRole('navigation', { name: 'Menu CRM' }).getByRole('button', { name: 'Danh sách lead', exact: true }).click();
  const crm = page.getByRole('region', { name: /CRM/ });
  await crm.getByRole('button', { name: 'Chốt', exact: true }).click();
  await crm.getByRole('button', { name: 'Lưu bộ lọc hiện tại' }).click();
  await crm.getByLabel('Tên chế độ xem').fill('Khách đã chốt');
  await crm.getByRole('button', { name: 'Lưu', exact: true }).click();
  const saved = crm.getByRole('group', { name: 'Chế độ xem đã lưu' }).getByRole('button', { name: 'Khách đã chốt', exact: true });
  await expect(saved).toBeVisible();

  await crm.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await saved.click();
  await expect(crm.getByRole('button', { name: 'Chốt', exact: true })).toBeVisible();
  await crm.getByRole('button', { name: 'Xóa chế độ xem Khách đã chốt' }).click();
  await expect(saved).toHaveCount(0);
});
