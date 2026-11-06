import { test, expect } from '@playwright/test';

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

test('Lịch đặt: bộ lọc trạng thái, tìm kiếm, tab Đặt online và Yêu cầu hỗ trợ; Hóa đơn; Thực đơn & kho', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  const nav = (name: RegExp) => page.locator('.ds-menubar').getByRole('button', { name });

  // One menu entry holds the booking list and the two request queues as tabs.
  await expect(nav(/Đặt online/)).toHaveCount(0);
  await expect(nav(/Yêu cầu hỗ trợ/)).toHaveCount(0);
  await nav(/Lịch đặt/).click();
  await expect(page.getByRole('tab', { name: /Đặt online/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Yêu cầu hỗ trợ/ })).toBeVisible();

  // Filter by status: every row of the "Đã thanh toán" filter shows that status.
  await page.getByRole('button', { name: /^Đã thanh toán/ }).click();
  const badges = page.locator('.ds-table tbody .badge');
  await expect(badges.first()).toBeVisible();
  for (const text of await badges.allTextContents()) expect(text).toBe('Đã thanh toán');

  // Search narrows the list; nothing matching shows the empty state.
  await page.getByLabel('Tìm lịch đặt').fill('khong-co-khach-nao-ten-vay');
  await expect(page.getByText('Không có lượt đặt phù hợp')).toBeVisible();
  await page.getByLabel('Tìm lịch đặt').fill('');

  await page.getByRole('tab', { name: /Yêu cầu hỗ trợ/ }).click();
  await expect(page.getByRole('button', { name: /^Đang chờ/ })).toBeVisible();

  // Invoices open on what is still to collect.
  await nav(/Hóa đơn/).click();
  await expect(page.getByRole('button', { name: /^Chờ thu/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: /^Đã thu/ }).click();
  await expect(page.locator('.ds-table tbody tr').first()).toBeVisible();

  // Stock is a tab of the menu & kitchen screen.
  await expect(nav(/^Kho$/)).toHaveCount(0);
  await nav(/Thực đơn & kho/).click();
  await page.getByRole('tab', { name: 'Kho' }).click();
  // The e2e menu is empty, so the table shows its empty state.
  await expect(page.getByText('Chưa có món để theo dõi kho')).toBeVisible();
});

test('Cài đặt cơ sở chia tab; Báo cáo, Nhân viên, Nhật ký dùng bảng chung', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  const nav = (name: RegExp) => page.locator('.ds-menubar').getByRole('button', { name });
  const admin = async (name: RegExp) => {
    await page.locator('.ds-menubar').getByRole('button', { name: 'Quản trị' }).click();
    await page.getByRole('menuitem', { name }).click();
  };
  await admin(/Cài đặt cơ sở/);
  for (const tab of ['Cơ sở', 'Giá', 'Khuyến mãi', 'Đặt lịch', 'Thanh toán'])
    await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible();
  await expect(page.getByLabel('Tên cơ sở')).toBeVisible();
  await page.getByRole('tab', { name: 'Giá', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Khung giá theo lịch' })).toBeVisible();
  await page.getByRole('tab', { name: 'Thanh toán' }).click();
  await expect(page.getByLabel(/Mã BIN ngân hàng/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nhận báo có từ ngân hàng' })).toBeVisible();

  await nav(/Báo cáo/).click();
  await page.getByRole('button', { name: '7 ngày' }).click();
  await expect(page.locator('.ds-tile-main').getByText('Tổng thu')).toBeVisible();

  await admin(/Nhân viên/);
  await expect(page.getByRole('columnheader', { name: 'Vai trò' })).toBeVisible();
  await admin(/Nhật ký/);
  await expect(page.getByRole('columnheader', { name: 'Hành động' })).toBeVisible();
});
