import { test, expect, devices } from '@playwright/test';

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
// A describe group may not switch the browser type, so keep the phone profile minus that field.
const phone: Partial<(typeof devices)[string]> = { ...devices['iPhone 13'] };
delete phone.defaultBrowserType;

test('máy tính: phím / vào ô tìm kiếm, phím N mở form đặt lịch, gõ chữ trong ô thì không kích hoạt', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  const search = page.getByLabel('Tìm khách hoặc phiếu');
  await expect(search).toBeVisible();
  await page.keyboard.press('/');
  await expect(search).toBeFocused();
  // Typing "n" inside the search box must not open the booking form.
  await page.keyboard.type('nam');
  await expect(search).toHaveValue('nam');
  await expect(page.getByRole('heading', { name: 'Tạo lịch đặt' })).toBeHidden();
  await search.blur();
  await page.keyboard.press('n');
  await expect(page.getByRole('heading', { name: 'Tạo lịch đặt' })).toBeVisible();
});

test.describe('điện thoại', () => {
  test.use({ ...phone, locale: 'vi-VN' });

  test('nút thao tác chính ở quầy cao tối thiểu 44 px', async ({ page }) => {
    expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
    await page.goto('/quan-ly');
    // Earlier specs leave some lines busy, so check whatever actions the line cards offer now.
    await expect(page.locator('.room-card button').first()).toBeVisible();
    const targets = [
      ...(await page.locator('.room-card button:visible').all()),
      page.getByRole('button', { name: 'Đặt lịch', exact: true }),
      page.getByRole('button', { name: 'Tải lại' }),
      page.getByRole('button', { name: 'Mở menu' }),
    ];
    for (const t of targets) {
      await expect(t).toBeVisible();
      const box = await t.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });
});
