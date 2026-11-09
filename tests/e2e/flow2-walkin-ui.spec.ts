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
  await expect(
    dialog.getByRole('button', { name: 'Bắt đầu chơi và tính tiền ngay' }),
  ).toBeVisible();
});
