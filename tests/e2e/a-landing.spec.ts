import { test, expect } from '@playwright/test';

test('trang giới thiệu công khai: giá, gói, liên hệ và lối vào quản lý', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Play. Connect.');
  await expect(page.getByRole('heading', { name: 'Bảng giá' })).toBeVisible();
  // Prices come from the official list.
  await expect(page.getByRole('cell', { name: '650.000 ₫' }).first()).toBeVisible();
  await expect(page.getByText('Thẻ VIP Diamond')).toBeVisible();
  await expect(page.getByText('250 Lương Đình Của').first()).toBeVisible();
  // Before online booking is enabled the call-to-action falls back to the hotline.
  await expect(page.getByRole('link', { name: /0902030185/ }).first()).toBeVisible();
  // Structured data for search engines.
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(ld!)['@type']).toBe('SportsActivityLocation');
  // Staff entrance and unknown pages.
  await page.getByRole('link', { name: 'Dành cho nhân viên' }).click();
  await expect(page).toHaveURL(/\/quan-ly$/);
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  const missing = await page.goto('/khong-co-trang-nay');
  expect(missing?.status()).toBe(404);
});

test('robots.txt chặn khu vực quản lý và API', async ({ request }) => {
  const text = await (await request.get('/robots.txt')).text();
  expect(text).toContain('Disallow: /quan-ly');
  expect(text).toContain('Disallow: /api/');
});
