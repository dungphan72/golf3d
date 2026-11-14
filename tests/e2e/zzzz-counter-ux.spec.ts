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
    await page.getByRole('button', { name: /^Phòng/ }).last().click();
    await expect(page.locator('.pos-line button').first()).toBeVisible();
    const targets = [
      ...(await page.locator('.pos-line button:visible').all()),
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

test('bàn phím: liên kết "Bỏ qua đến nội dung" chuyển tiêu điểm vào vùng chính', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  const skip = page.getByRole('link', { name: 'Bỏ qua đến nội dung' });
  await skip.focus();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#noi-dung')).toBeFocused();
});

test('hộp thoại đặt lịch và bắt đầu nằm giữa màn hình, không tràn ra ngoài (máy tính)', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  const viewport = page.viewportSize()!;
  const check = async () => {
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(Math.abs(box.x - (viewport.width - box.width) / 2)).toBeLessThan(2);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  };
  await page.getByRole('button', { name: 'Đặt lịch', exact: true }).first().click();
  await check();
  // Earlier specs may leave every line busy, so only open "Bắt đầu" when a free line has the button.
  const start = page.getByRole('button', { name: /^Bắt đầu Line/ }).first();
  if (await start.count()) {
    await start.click();
    await check();
  }
});

test('form đặt lịch nhân viên giới hạn thời gian từ mốc 15 phút kế tiếp đến 90 ngày', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.getByRole('button', { name: 'Đặt lịch', exact: true }).first().click();
  const start = page.getByLabel(/Ngày, giờ bắt đầu/);
  await expect(start).toBeVisible();
  const min = Date.parse(`${await start.getAttribute('min')}:00+07:00`);
  const max = Date.parse(`${await start.getAttribute('max')}:00+07:00`);
  const now = Date.now();
  expect(min).toBeGreaterThan(now);
  expect(min).toBeLessThanOrEqual(now + 16 * 60_000);
  expect(min % (15 * 60_000)).toBe(0);
  expect(max).toBeGreaterThan(now + 89 * 24 * 60 * 60_000);
  expect(max).toBeLessThanOrEqual(now + 90 * 24 * 60 * 60_000);
  expect(max % (15 * 60_000)).toBe(0);
});

test.describe('điện thoại: hộp thoại là tấm trượt từ dưới lên, nằm gọn trong màn hình', () => {
  test.use({ ...phone, locale: 'vi-VN' });

  test('đặt lịch', async ({ page }) => {
    expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
    await page.goto('/quan-ly');
    await page.getByRole('button', { name: 'Đặt lịch', exact: true }).first().click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(600); // the sheet slides up first
    const box = (await dialog.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThan(2);
  });
});
