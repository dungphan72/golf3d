import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs after flow.spec.ts (which seeded the package catalogue and the price rules).
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const key = () => crypto.randomUUID().replaceAll('-', '') + 'xy';

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

test('trang bảng giá hiện giá từ admin và đổi ngay khi admin sửa', async ({ page }) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);

  await page.goto('/bang-gia');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Giá rõ ràng');
  await expect(page.getByText('Giờ vàng').first()).toBeVisible();
  await expect(page.getByText('Thẻ tháng · 6 tháng')).toBeAttached();
  // The test club has all-day rules: GDR 100.000, 9 holes 300.000, 18 holes 400.000.
  await expect(page.getByText('100.000 ₫').first()).toBeAttached();
  await expect(page.getByText('400.000 ₫').first()).toBeAttached();

  // 1) a package price and a new package edited through the admin API
  const list = await (await owner.get('/api/members')).json();
  const combo = list.types.find((t: { name: string }) => t.name.startsWith('Thẻ giờ · mua 10'));
  await post(owner, '/api/members', {
    action: 'type-save',
    id: combo.id,
    requestId: key(),
    name: combo.name,
    price: 3_333_000,
    grants: JSON.parse(combo.grants),
    validDays: combo.valid_days,
    perks: combo.perks,
    active: true,
  });
  await post(owner, '/api/members', {
    action: 'type-save',
    requestId: key(),
    name: 'Gói thử nghiệm giá',
    price: 777_000,
    grants: [{ kind: 'holes9', qty: 2 }],
    validDays: 30,
    perks: 'Quyền lợi thử',
    section: 'Nhóm thử nghiệm',
    active: true,
  });
  await page.reload();
  await expect(page.getByText('3.333.000 ₫')).toBeAttached();
  await expect(page.getByText('Gói thử nghiệm giá')).toBeAttached();
  await expect(page.getByText('Quyền lợi thử')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Nhóm thử nghiệm' })).toBeAttached();

  // 2) a retired package disappears
  const created = (await (await owner.get('/api/members')).json()).types.find(
    (t: { name: string }) => t.name === 'Gói thử nghiệm giá',
  );
  await post(owner, '/api/members', {
    action: 'type-save',
    id: created.id,
    requestId: key(),
    name: created.name,
    price: created.price,
    grants: JSON.parse(created.grants),
    validDays: created.valid_days,
    perks: created.perks,
    section: created.section,
    active: false,
  });
  await page.reload();
  await expect(page.getByText('Gói thử nghiệm giá')).toHaveCount(0);

  // 3) an hourly price rule edited in the settings shows on the page and on the home page
  const { config } = await (await owner.get('/api/club')).json();
  const edited = {
    ...config,
    priceRules: config.priceRules.map((r: { room: string; service: string }) =>
      r.room === 'standard' && r.service === 'gdr' ? { ...r, amount: 123_000 } : r,
    ),
  };
  await post(owner, '/api/club', { action: 'settings', value: edited });
  await page.goto('/bang-gia');
  await expect(page.getByText('123.000 ₫').first()).toBeAttached();
  await page.goto('/');
  await expect(page.getByText('123.000 ₫').first()).toBeAttached();
  // The VIP room now has its own (unchanged) prices, so a separate VIP list appears.
  await page.goto('/bang-gia');
  await expect(page.getByRole('heading', { name: 'Bảng giá phòng VIP' })).toBeAttached();

  // restore
  const fresh = (await (await owner.get('/api/club')).json()).config;
  await post(owner, '/api/club', {
    action: 'settings',
    value: { ...fresh, priceRules: config.priceRules },
  });
});
