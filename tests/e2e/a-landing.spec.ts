import { test, expect } from '@playwright/test';

test('trang giới thiệu công khai: giá, gói, liên hệ và lối vào quản lý', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Golf 3D đẳng cấp');
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Tài khoản' }),
  ).toHaveAttribute('href', '/tai-khoan');
  // Counts of lines and rooms come from the room list, not from text in the page.
  await expect(page.getByText('10 line', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2 phòng VIP', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Một buổi chơi' }).or(page.getByText('Một buổi chơi').first())).toBeAttached();
  // Prices come from the official list.
  await expect(page.locator('#bang-gia')).toBeAttached();
  await expect(page.getByText('250 Lương Định Của').first()).toBeAttached();
  // Before online booking is enabled the call-to-action falls back to the hotline.
  await expect(page.getByText('Đặt chỗ qua hotline')).toBeAttached();
  await expect(page.getByRole('link', { name: /0877834888/ }).first()).toBeVisible();
  // Structured data for search engines.
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(ld!)['@type']).toBe('SportsActivityLocation');
  await page.getByRole('banner').getByRole('link', { name: 'Tài khoản' }).click();
  await expect(page).toHaveURL(/\/tai-khoan$/);
  await expect(page.getByRole('tab', { name: 'Đăng Nhập' })).toBeVisible();
  await page.goto('/');
  // Staff entrance and unknown pages.
  await page
    .getByRole('link', { name: 'Nhân viên' })
    .evaluate((a) => (a as HTMLAnchorElement).click());
  await expect(page).toHaveURL(/\/quan-ly$/);
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mnav').getByRole('link', { name: 'Tài khoản' })).toHaveAttribute(
    'href',
    '/tai-khoan',
  );
  const missing = await page.goto('/khong-co-trang-nay');
  expect(missing?.status()).toBe(404);
});

test('robots.txt chặn khu vực quản lý và API', async ({ request }) => {
  const text = await (await request.get('/robots.txt')).text();
  expect(text).toContain('Disallow: /quan-ly');
  expect(text).toContain('Disallow: /api/');
});
