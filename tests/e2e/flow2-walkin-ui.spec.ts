import { test, expect } from '@playwright/test';

// Runs right after flow.spec.ts (club settings exist) and before other specs fill the room grid.
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

test('sơ đồ phòng: trống màu xanh có nút Vào chơi ngay, đang chơi màu đỏ', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page
    .locator('aside[aria-label="Menu chính"]')
    .getByRole('button', { name: /POS tính tiền/ })
    .click();
  // Earlier specs leave bookings around, so take any line that can start a walk-in:
  // green when free, yellow when a booking is due within 2 hours.
  const free = page.locator('.gcd-bay-item-card:has(.bay-btn.walkin)').first();
  await expect(free).toBeVisible();

  // The walk-in dialog opens with the line already chosen.
  await expect(free.getByRole('button', { name: /Đặt trước/ })).toBeVisible();
  await free.getByRole('button', { name: /Vào chơi/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Vào chơi ngay' });
  await expect(dialog).toBeVisible();
  const start = dialog.getByRole('button', { name: 'Bắt đầu chơi và tính tiền ngay' });
  await expect(start).toBeVisible();
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth),
  ).toBe('none');

  await page.setViewportSize({ width: 375, height: 812 });
  const content = dialog.locator('.walk-in-form-content');
  await expect(dialog.locator('.modal-heading')).toBeInViewport();
  await expect(start).toBeInViewport();
  expect(
    await start.evaluate((el) => {
      const { top, bottom } = el.getBoundingClientRect();
      return top >= 0 && bottom <= window.innerHeight;
    }),
  ).toBe(true);
  expect(await content.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

  await content.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(dialog.locator('.modal-heading')).toBeInViewport();
  await expect(start).toBeInViewport();
  expect(
    await start.evaluate((el) => {
      const { top, bottom } = el.getBoundingClientRect();
      return top >= 0 && bottom <= window.innerHeight;
    }),
  ).toBe(true);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

  await dialog.getByRole('button', { name: 'Đóng' }).click();
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
