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

test('thanh đặt nhanh điền dịch vụ, phòng và khung giờ vào biểu mẫu', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const quickBooking = page.locator('.fw-quick-booking');
  await quickBooking.getByRole('button', { name: 'Ngày mai' }).click();
  await quickBooking.getByRole('button', { name: 'Tối (18h-22h)' }).click();
  await quickBooking.getByRole('button', { name: 'Game 18 hố' }).click();
  await quickBooking.getByRole('button', { name: 'Phòng VIP riêng' }).click();
  await quickBooking.getByRole('button', { name: 'Điền thông tin đặt lịch' }).click();

  const form = page.locator('#dat-cho');
  await expect(form.getByLabel('Dịch vụ')).toHaveValue('18');
  await expect(form.getByLabel('Phòng VIP riêng tư')).toBeChecked();
  await expect(form.getByLabel('Ngày, giờ bắt đầu (giờ Việt Nam)')).toHaveValue(
    `${vnDay(1)}T18:00`,
  );
  await expect(form.getByLabel('Họ và tên')).toBeEmpty();
  await expect(form.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  await quickBooking.getByRole('button', { name: 'Chọn ngày' }).click();
  await quickBooking.getByRole('button', { name: 'Điền thông tin đặt lịch' }).click();
  await expect(form.getByLabel('Ngày, giờ bắt đầu (giờ Việt Nam)')).toBeEmpty();
  await expect(form.getByText('Vui lòng chọn ngày và giờ trong biểu mẫu.')).toBeVisible();

  await quickBooking.getByRole('button', { name: 'Ngày mai' }).click();
  await quickBooking.getByRole('button', { name: 'Điền thông tin đặt lịch' }).click();
  await form.getByLabel('Họ và tên').fill('Khách Thanh Đặt Nhanh');
  await form.getByLabel('Số điện thoại').fill('0944555667');
  await form.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }).click();
  await expect(form.getByText('Đang chờ nhân viên xác nhận')).toBeVisible();
  await expect(form).toContainText('Game 18 hố · phòng VIP');
});

test('trang đặt lịch riêng nhận thông tin điền sẵn và gửi yêu cầu', async ({ page }) => {
  const start = `${vnDay(1)}T15:00`;
  await page.goto(
    `/book/e2e-golf?service=18&start=${encodeURIComponent(start)}&guests=2&vip=1`,
  );
  const form = page.locator('form');
  await expect(form.getByLabel('Dịch vụ')).toHaveValue('18');
  await expect(form.getByLabel('Ngày, giờ bắt đầu (giờ Việt Nam)')).toHaveValue(start);
  await expect(form.getByLabel('Số người')).toHaveValue('2');
  await expect(form.getByLabel('Phòng VIP riêng tư')).toBeChecked();
  await form.getByLabel('Họ và tên').fill('Khách Trang Đặt Riêng');
  await form.getByLabel('Số điện thoại').fill('0944555668');
  await form.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }).click();
  await expect(page.getByText('Đang chờ nhân viên xác nhận')).toBeVisible();
  await expect(page.locator('.auth-card')).toContainText('Game 18 hố · phòng VIP');
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

test('cổng đặt lịch vẫn nhận yêu cầu khi thiếu cấu hình và không giới hạn ngày đặt trước', async ({
  page,
}) => {
  const owner = page.request;
  expect(
    (await owner.post('/api/auth/login', {
      data: { email: 'owner@e2e.test', password: 'e2e-owner-password' },
    })).status(),
  ).toBe(200);
  const original = (await (await owner.get('/api/club')).json()).config as Record<string, unknown>;
  const save = async (target: Record<string, unknown>) => {
    const current = (await (await owner.get('/api/club')).json()).config as Record<string, unknown>;
    const response = await owner.post('/api/club', {
      data: {
        action: 'settings',
        value: { ...target, pricingRevision: current.pricingRevision },
      },
    });
    expect(response.status(), await response.text()).toBe(200);
  };
  try {
    await save({
      ...original,
      open: '',
      close: '',
      capacity: null,
      vipCapacity: null,
      vat: null,
      fee: null,
      days: 1,
      onlineEnabled: true,
      onlineSlug: 'e2e-golf',
    });
    await page.goto('/book/e2e-golf');
    const form = page.locator('form');
    await expect(form.getByLabel('Dịch vụ').locator('option')).toHaveCount(3);
    expect(await form.getByLabel(/Ngày, giờ bắt đầu/).getAttribute('max')).toBeNull();
    const farDay = new Date(Date.now() + 400 * 86_400_000 + 7 * 3_600_000)
      .toISOString()
      .slice(0, 10);
    await form.getByLabel(/Ngày, giờ bắt đầu/).fill(`${farDay}T09:00`);
    await form.getByLabel('Họ và tên').fill('Khách Chọn Ngày Xa');
    await form.getByLabel('Số điện thoại').fill('0944777888');
    await form.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }).click();
    await expect(page.getByText('Đang chờ nhân viên xác nhận')).toBeVisible();
    await expect(page.locator('.auth-card')).not.toContainText('Tạm tính:');
  } finally {
    await save(original);
  }
});
