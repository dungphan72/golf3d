import { test, expect } from '@playwright/test';

// Runs after flow.spec.ts (which seeded the package catalogue).
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

test('trang thẻ hội viên hiện quyền lợi, thẻ và gói giờ; quyền lợi sửa được trong cài đặt', async ({
  page,
}) => {
  await page.goto('/thanh-vien');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Chơi golf mỗi ngày');
  await expect(page.getByRole('heading', { name: 'Gửi gậy miễn phí' })).toBeAttached();
  await expect(page.getByText('Thẻ VIP Platinum')).toBeAttached();
  await expect(page.getByRole('link', { name: 'Xem bảng giá' })).toHaveAttribute(
    'href',
    '/bang-gia',
  );

  // The perks are edited in Settings and the page follows.
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const current = async () => (await (await owner.get('/api/club')).json()).config;
  const save = async (change: Record<string, unknown>, drop?: string) => {
    const value = { ...(await current()), ...change };
    if (drop) delete value[drop];
    const r = await owner.post('/api/club', { data: { action: 'settings', value } });
    expect(r.status(), await r.text()).toBe(200);
  };
  await save({ memberBenefits: ['Phòng chờ riêng | Dành cho hội viên'] });
  await page.goto('/thanh-vien');
  await expect(page.getByRole('heading', { name: 'Phòng chờ riêng' })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Gửi gậy miễn phí' })).toHaveCount(0);
  await save({ memberBenefits: [] });
  await page.goto('/thanh-vien');
  await expect(page.getByRole('heading', { name: 'Hội viên nhận được gì' })).toHaveCount(0);

  await save({}, 'memberBenefits');
});
