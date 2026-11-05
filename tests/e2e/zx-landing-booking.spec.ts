import { test, expect } from '@playwright/test';

// Runs after flow.spec.ts, which enabled online booking with the slug "e2e-golf".
const vnDay = (offset: number) =>
  new Date(Date.now() + 7 * 3600_000 + offset * 86_400_000).toISOString().slice(0, 10);

test('khách đặt chỗ ngay trên trang chủ', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Đặt chỗ/ }).first()).toBeVisible();
  const form = page.locator('#dat-cho');
  await expect(form.getByRole('heading', { name: /Chọn giờ, nhân viên xác nhận/ })).toBeVisible();
  await form.getByLabel('Dịch vụ').selectOption('9');
  await form.getByLabel(/Ngày, giờ bắt đầu/).fill(`${vnDay(1)}T15:00`);
  await form.getByLabel('Họ và tên').fill('Khách Trang Chủ');
  await form.getByLabel('Số điện thoại').fill('0944555666');
  await form.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }).click();
  await expect(form.getByText('Đang chờ nhân viên xác nhận')).toBeVisible();
});

test('form đặt chỗ: 3 hình thức, không có ô phút, số người tự điền, tên và số điện thoại bắt buộc', async ({
  page,
}) => {
  await page.goto('/');
  const form = page.locator('#dat-cho');
  const service = form.getByLabel('Dịch vụ');
  await expect(service.locator('option')).toHaveText(['Luyện tập', 'Game 9 hố', 'Game 18 hố']);
  await expect(form.getByLabel('Thời lượng')).toHaveCount(0);
  await expect(form.getByLabel('Họ và tên')).toHaveAttribute('required', '');
  await expect(form.getByLabel('Số điện thoại')).toHaveAttribute('required', '');
  // Blank name and phone: the browser blocks the submit.
  await form.getByLabel(/Ngày, giờ bắt đầu/).fill(`${vnDay(1)}T16:00`);
  await form.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }).click();
  await expect(form.getByText('Đang chờ nhân viên xác nhận')).toHaveCount(0);

  // A tournament-size group is accepted and shown as typed.
  await form.getByLabel('Số người').fill('30');
  await form.getByLabel('Họ và tên').fill('Đoàn Giải Đấu');
  await form.getByLabel('Số điện thoại').fill('0955666777');
  await form.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }).click();
  await expect(form.getByText('Đang chờ nhân viên xác nhận')).toBeVisible();
  await expect(form.getByText(/30 người/)).toBeVisible();
});
