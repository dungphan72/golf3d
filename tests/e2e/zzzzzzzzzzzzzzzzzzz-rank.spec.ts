import { test, expect, type APIRequestContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const key = () => crypto.randomUUID();

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

test('hạng hội viên tính theo tổng chi tiêu và mốc sửa được trong cài đặt', async ({ page }) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);

  // Default marks: 50 / 80 / 100 million.
  let { config, activeShift } = await (await owner.get('/api/club')).json();
  const cashier = { open: async () => post(owner, '/api/finance', { action: 'open', requestId: key(), name: 'Ca hạng', openingCash: 0 }) };
  if (!activeShift) await cashier.open();

  // Low marks so the test can reach every rank with two small sales.
  await post(owner, '/api/club', {
    action: 'settings',
    value: { ...config, tierThresholds: { gold: 1_000_000, platinum: 3_000_000, diamond: 6_000_000 } },
  });
  // Marks must rise: Gold < Platinum < Diamond.
  ({ config } = await (await owner.get('/api/club')).json());
  const bad = await post(owner, '/api/club', {
    action: 'settings',
    value: { ...config, tierThresholds: { gold: 5, platinum: 4, diamond: 3 } },
  }, 400);
  expect(bad.error).toContain('tăng dần');

  const customer = await post(owner, '/api/members', { action: 'customer-create', name: 'Khách Hạng', phone: '0912999888', note: '' });
  const rank = async () =>
    (await (await owner.get(`/api/members?customer=${customer.id}`)).json()).detail.rank as {
      tier: string;
      spent: number;
      next: { tier: string; need: number } | null;
    };
  expect(await rank()).toMatchObject({ tier: 'guest', spent: 0 });

  await post(owner, '/api/members', {
    action: 'type-save', requestId: key(), name: 'Gói hạng 2 triệu', price: 2_000_000,
    grants: [{ kind: 'gdr', qty: 5 }], validDays: 30, perks: '', section: '', room: 'any', active: true,
  });
  const types = (await (await owner.get('/api/members')).json()).types as { id: string; name: string }[];
  const type = types.find((t) => t.name === 'Gói hạng 2 triệu')!;
  const sell = () => post(owner, '/api/members', { action: 'sell', requestId: key(), customerId: customer.id, typeId: type.id, method: 'cash' });

  await sell();
  expect(await rank()).toMatchObject({ tier: 'gold', spent: 2_000_000, next: { tier: 'platinum', need: 1_000_000 } });
  await sell();
  expect(await rank()).toMatchObject({ tier: 'platinum', spent: 4_000_000, next: { tier: 'diamond', need: 2_000_000 } });

  // The member's own page shows the same rank.
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: /Khách hàng/ }).click();
  await page.getByRole('button', { name: /Khách Hạng/ }).click();
  await expect(page.getByText('Platinum').first()).toBeVisible();

  // Put the default marks back.
  ({ config } = await (await owner.get('/api/club')).json());
  await post(owner, '/api/club', { action: 'settings', value: { ...config, tierThresholds: { gold: 50_000_000, platinum: 80_000_000, diamond: 100_000_000 } } });
});
