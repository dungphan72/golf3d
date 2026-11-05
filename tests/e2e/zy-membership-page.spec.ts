import { test, expect } from '@playwright/test';

// Runs after flow.spec.ts (which seeded the package catalogue).
test('trang thẻ hội viên hiện quyền lợi, thẻ và gói giờ từ danh mục gói', async ({ page }) => {
  await page.goto('/thanh-vien');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Chơi golf mỗi ngày');
  await expect(page.getByRole('heading', { name: 'Gửi gậy miễn phí' })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Bảo lưu một lần' })).toBeAttached();
  await expect(page.getByText('Thẻ VIP Platinum')).toBeAttached();
  await expect(page.getByRole('link', { name: 'Xem bảng giá' })).toHaveAttribute('href', '/bang-gia');
});
