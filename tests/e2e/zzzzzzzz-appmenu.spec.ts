import { test, expect } from '@playwright/test';

// On a phone the menu is an app launcher: a bottom sheet with a grid of icon tiles, opened from "Menu" in the tab bar.
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, locale: 'vi-VN' });
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

test('điện thoại: thanh dưới một hàng, Menu mở lưới biểu tượng, chạm mục thì chuyển màn và đóng', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  const bar = page.getByRole('navigation', { name: 'Thao tác nhanh' });
  await expect(bar.getByRole('button')).toHaveCount(5);
  const tops = await bar.getByRole('button').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1); // one row

  await bar.getByRole('button', { name: /Menu/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Menu ứng dụng' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Thực đơn & kho' })).toBeVisible();
  const boxes = await sheet.locator('.ds-app-tile').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  expect(boxes.length).toBeGreaterThanOrEqual(8);
  for (const b of boxes) {
    expect(b.right).toBeLessThanOrEqual(375);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  // Esc closes it; reopening and tapping a tile goes to that screen.
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await bar.getByRole('button', { name: /Menu/ }).click();
  await sheet.getByRole('button', { name: 'Báo cáo' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Báo cáo', level: 1 })).toBeVisible();
  await expect(bar.getByRole('button', { name: /Menu/ })).toHaveAttribute('class', /active/);
});
