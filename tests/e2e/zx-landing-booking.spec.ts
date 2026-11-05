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
