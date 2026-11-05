import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs after flow.spec.ts (online booking enabled with the slug "e2e-golf" and prices).
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const promo = (over: Record<string, unknown> = {}) => ({
  id: 'km-e2e',
  name: 'Khuyến mãi thử nghiệm',
  description: 'Giảm một nửa để thử',
  kind: 'percent',
  value: 50,
  services: ['18'],
  rooms: [],
  weekdays: [],
  from: '00:00',
  to: '24:00',
  startDate: '',
  endDate: '',
  auto: true,
  enabled: true,
  ...over,
});

const postFrom = async (ip: string, request: APIRequestContext, data: unknown) => {
  const response = await request.post('/api/public/booking', {
    data,
    headers: { 'x-forwarded-for': ip, 'cf-connecting-ip': '203.0.113.9' },
  });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};

test('khuyến mãi nhập trong cài đặt: tự áp vào báo giá, hiện trên website, tắt/xóa thì hết', async ({
  page,
  browser,
}) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const setPromotions = async (promotions: unknown[], status = 200) => {
    const { config } = await (await owner.get('/api/club')).json();
    return post(
      owner,
      '/api/club',
      { action: 'settings', value: { ...config, promotions } },
      status,
    );
  };

  const guest = await browser.newContext();
  const day = new Date(Date.now() + 86_400_000 + 7 * 3_600_000).toISOString().slice(0, 10);
  let phone = 0;
  const quoteTotal = async () => {
    // A different address per request: the public form allows only a few requests per IP and hour.
    const r = await postFrom(`10.7.0.${phone + 1}`, guest.request, {
      slug: 'e2e-golf',
      name: 'Khách Khuyến Mãi',
      phone: `09440000${String(++phone).padStart(2, '0')}`,
      service: '18',
      vip: false,
      guests: 1,
      start: Date.parse(`${day}T10:00:00+07:00`),
      minutes: 0,
      note: '',
      website: '',
    });
    return r.total as number;
  };

  await setPromotions([]);
  const base = await quoteTotal();
  expect(base).toBeGreaterThan(10_000);

  // A bad promotion is refused by the server.
  await setPromotions([promo({ value: 99 })], 400);

  // The promotion lowers the quote by half (fee and VAT scale with it) and shows on the website.
  await setPromotions([promo()]);
  expect(Math.abs((await quoteTotal()) - base / 2)).toBeLessThanOrEqual(2);
  for (const path of ['/bang-gia', '/']) {
    await page.goto(path);
    await expect(page.getByText('Khuyến mãi thử nghiệm').first()).toBeAttached();
    await expect(page.getByText('Giảm 50%').first()).toBeAttached();
  }

  // Switched off: the price returns to the list price and the website no longer shows it.
  await setPromotions([promo({ enabled: false })]);
  expect(await quoteTotal()).toBe(base);
  await page.goto('/bang-gia');
  await expect(page.getByText('Khuyến mãi thử nghiệm')).toHaveCount(0);

  // A display-only promotion appears on the website but does not change the price.
  await setPromotions([promo({ auto: false, name: 'Ưu đãi xác nhận tại quầy' })]);
  expect(await quoteTotal()).toBe(base);
  await page.goto('/bang-gia');
  await expect(page.getByText('Ưu đãi xác nhận tại quầy').first()).toBeAttached();
  await expect(page.getByText('Áp dụng tại quầy').first()).toBeAttached();

  // An ended promotion is no longer shown.
  await setPromotions([promo({ endDate: '2020-01-01', name: 'Đã kết thúc' })]);
  await page.goto('/bang-gia');
  await expect(page.getByText('Đã kết thúc')).toHaveCount(0);

  await setPromotions([]);
  expect(await quoteTotal()).toBe(base);
});

test('thêm, sửa, tắt và xóa khuyến mãi ngay trong màn hình Cài đặt', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside').getByRole('button', { name: 'Quản lý khác' }).first().click();
  await page.locator('.nav-more-list .nav-item', { hasText: 'Cài đặt cơ sở' }).click();

  await page.getByRole('button', { name: 'Thêm khuyến mãi' }).click();
  await page.getByLabel('Tên chương trình').fill('Giờ vàng thứ Ba');
  await page.getByLabel(/Phần trăm giảm/).fill('15');
  await page.getByLabel('Thứ 3').check();
  await expect(page.getByText('Giảm 15%')).toBeVisible();
  await page.getByRole('button', { name: 'Lưu khuyến mãi' }).click();
  await expect(page.getByRole('button', { name: 'Sửa Giờ vàng thứ Ba' })).toBeVisible();

  // Edit, switch off, then delete.
  await page.getByRole('button', { name: 'Sửa Giờ vàng thứ Ba' }).click();
  await page.getByLabel(/Phần trăm giảm/).fill('20');
  await page.getByRole('button', { name: 'Lưu khuyến mãi' }).click();
  await expect(page.getByText('Giảm 20%')).toBeVisible();
  await page.locator('.promo-editor').getByRole('button', { name: 'Tắt', exact: true }).click();
  await expect(page.getByText('đang tắt')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Xóa Giờ vàng thứ Ba' }).click();
  await expect(page.getByText('Chưa có chương trình khuyến mãi nào.')).toBeVisible();
});
