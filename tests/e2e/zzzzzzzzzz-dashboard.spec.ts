import { test, expect } from '@playwright/test';

// Customisable CRM overview: layout is saved per person and survives a reload.
test.describe.configure({ mode: 'serial' });
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const origin = 'http://127.0.0.1:8787';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

test('API: bố cục mặc định, lưu, làm sạch dữ liệu sai, về mặc định; chưa đăng nhập bị chặn', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get('/api/crm2/overview')).status()).toBe(401);
  await anon.dispose();
  const owner = await playwright.request.newContext({ baseURL: origin });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const post = (data: Json) => owner.post('/api/crm2/overview', { data, headers: { origin } });
  const get = async () => (await (await owner.get('/api/crm2/overview')).json()) as Json;

  expect((await post({ action: 'layout', reset: true })).status()).toBe(200);
  const base = await get();
  expect(base.layout.days).toBe(30);
  expect(base.layout.hidden).toEqual([]);
  expect(base.layout.order).toContain('ranking'); // the owner is a manager

  expect((await post({ action: 'layout', order: ['sources', 'bogus'], hidden: ['funnel', 'bogus'], days: 7 })).status()).toBe(200);
  const saved = await get();
  expect(saved.days).toBe(7);
  expect(saved.layout.order[0]).toBe('sources');
  expect(saved.layout.order).not.toContain('bogus');
  expect(saved.layout.hidden).toEqual(['funnel']);

  expect((await post({ action: 'layout', days: 365 })).status()).toBe(200);
  expect((await get()).layout.days).toBe(30); // an invalid range falls back to the default
  expect((await post({ action: 'other' })).status()).toBe(400);
  expect((await post({ action: 'layout', reset: true })).status()).toBe(200);
  await owner.dispose();
});

test('giao diện: ẩn thẻ Phễu, lưu, tải lại vẫn ẩn; về mặc định hiện lại', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.request.post('/api/crm2/overview', { data: { action: 'layout', reset: true }, headers: { origin } });
  await page.goto('/quan-ly');
  await page.locator('nav[aria-label="Quản trị hệ thống"]').getByRole('button', { name: /CRM/ }).click();
  const crm = page.getByRole('region', { name: /CRM/ });
  await page.getByRole('navigation', { name: 'Menu CRM' }).getByRole('button', { name: 'Tổng quan', exact: true }).click();
  await page.getByText('Phễu, nguồn khách và xếp hạng nhân viên').click();
  await expect(crm.getByRole('heading', { name: /^Phễu [0-9]+ ngày$/ })).toBeVisible();

  await crm.getByRole('button', { name: 'Tùy biến' }).click();
  await crm.getByRole('list', { name: 'Các thẻ trên tổng quan' }).getByRole('checkbox', { name: 'Phễu tư vấn' }).uncheck();
  await crm.getByRole('button', { name: 'Lưu bố cục' }).click();
  await expect(crm.getByRole('heading', { name: /^Phễu [0-9]+ ngày$/ })).toHaveCount(0);

  await page.reload();
  await page.locator('nav[aria-label="Quản trị hệ thống"]').getByRole('button', { name: /CRM/ }).click();
  await page.getByRole('navigation', { name: 'Menu CRM' }).getByRole('button', { name: 'Tổng quan', exact: true }).click();
  await page.getByText('Phễu, nguồn khách và xếp hạng nhân viên').click();
  await expect(crm.getByRole('heading', { name: 'Nguồn khách' })).toBeVisible();
  await expect(crm.getByRole('heading', { name: /^Phễu [0-9]+ ngày$/ })).toHaveCount(0);

  await crm.getByRole('button', { name: 'Tùy biến' }).click();
  await crm.getByRole('button', { name: 'Về mặc định' }).click();
  await expect(crm.getByRole('heading', { name: /^Phễu [0-9]+ ngày$/ })).toBeVisible();
});
