import { test, expect } from '@playwright/test';

test('trang giới thiệu công khai: giá, gói, liên hệ và lối vào quản lý', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('cú đánh');
  await expect(page.getByRole('link', { name: 'Cổng khách hàng' }).first()).toHaveAttribute(
    'href',
    '/tai-khoan',
  );
  await expect(page.getByText('10 + 2 VIP')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Cổng khách hàng', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Một buổi chơi' })).toBeAttached();
  // Prices come from the official list (the price rail is wider than the viewport, so check the DOM).
  await expect(page.getByText('450.000đ / VND').first()).toBeAttached();
  await expect(page.getByText('Thẻ tháng · 6 tháng')).toBeAttached();
  await expect(page.getByText('250 Lương Định Của').first()).toBeAttached();
  await expect(page.getByText('Đặt chỗ qua hotline')).toBeAttached(); // online booking not enabled yet
  // Before online booking is enabled the call-to-action falls back to the hotline.
  await expect(page.getByRole('link', { name: /0877834888/ }).first()).toBeVisible();
  // Structured data for search engines.
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(ld!)['@type']).toBe('SportsActivityLocation');
  await page.getByRole('link', { name: 'Vào cổng khách hàng' }).click();
  await expect(page).toHaveURL(/\/tai-khoan$/);
  await expect(page.getByRole('tab', { name: 'Đăng Nhập' })).toBeVisible();
  await page.goto('/');
  // Staff entrance and unknown pages.
  await page
    .getByRole('link', { name: 'Dành cho nhân viên' })
    .evaluate((a) => (a as HTMLAnchorElement).click());
  await expect(page).toHaveURL(/\/quan-ly$/);
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.hm-portal-top')).toBeVisible();
  await expect(page.locator('.app-mobile-nav').getByRole('link', { name: 'Khách hàng' })).toHaveAttribute(
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
