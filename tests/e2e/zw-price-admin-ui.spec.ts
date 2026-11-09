import { test, expect, type Page } from '@playwright/test';

// Runs after flow.spec.ts (which seeded the price rules and package catalogue).
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const key = () => crypto.randomUUID().replaceAll('-', '') + 'xy';
const LABEL = 'E2E khung giá giao diện';

type Rule = { id: string; label: string; amount: number; day: string };
const rulesOf = async (page: Page) => {
  const { config } = await (await page.request.get('/api/club')).json();
  return (config.priceRules ?? []) as Rule[];
};

async function openPriceTab(page: Page) {
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label=\"Menu chính\"]').getByRole('button', { name: 'Cài đặt' }).click();
  await page.getByRole('tab', { name: 'Giá', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Khung giá theo lịch' })).toBeVisible();
}

async function save(page: Page) {
  const saved = page.waitForResponse(
    (r) => r.url().includes('/api/club') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
  expect((await saved).status()).toBe(200);
}

test('admin thêm, sửa, xóa khung giá trong bảng giá', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await openPriceTab(page);
  const before = (await rulesOf(page)).length;

  // Add: the seeded rules cover every slot all day, so the new one is saved switched off (skips the overlap check).
  await page.getByRole('button', { name: 'Thêm khung giá' }).click();
  const edit = page.locator('.pt-edit');
  await expect(edit).toBeVisible();
  await edit.getByLabel('Tên khung giá').fill(LABEL);
  await edit.getByLabel('Ngày áp dụng').selectOption('holiday');
  await edit.getByLabel('Từ giờ').fill('03:00');
  await edit.getByLabel(/Đến giờ/).fill('04:00');
  await edit.getByLabel(/Đơn giá/).fill('123000');
  await edit.getByLabel('Trạng thái').selectOption('off');
  await save(page);
  let rules = await rulesOf(page);
  expect(rules).toHaveLength(before + 1);
  expect(rules.find((r) => r.label === LABEL)).toMatchObject({ amount: 123000, day: 'holiday' });

  // Edit after a reload: the row shows in the table and the amount can change.
  await openPriceTab(page);
  const row = page.locator('.pt-table tbody tr', { hasText: LABEL }).first();
  await expect(row).toContainText('123.000');
  await page.getByRole('button', { name: `Sửa ${LABEL}` }).click();
  await page
    .locator('.pt-edit')
    .getByLabel(/Đơn giá/)
    .fill('150000');
  await save(page);
  rules = await rulesOf(page);
  expect(rules.find((r) => r.label === LABEL)?.amount).toBe(150000);

  // Delete needs a second click to confirm; cancelling keeps the rule.
  await openPriceTab(page);
  await page.getByRole('button', { name: `Xóa ${LABEL}` }).click();
  await page.getByRole('button', { name: 'Hủy' }).click();
  await expect(page.locator('.pt-table tbody tr', { hasText: LABEL })).toHaveCount(1);
  await page.getByRole('button', { name: `Xóa ${LABEL}` }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(page.locator('.pt-table tbody tr', { hasText: LABEL })).toHaveCount(0);
  await save(page);
  rules = await rulesOf(page);
  expect(rules).toHaveLength(before);
  expect(rules.some((r) => r.label === LABEL)).toBe(false);
});

test('admin ngừng bán gói (không xóa cứng) rồi bán lại', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const name = 'E2E gói ngừng bán';
  const created = await page.request.post('/api/members', {
    data: {
      action: 'type-save',
      requestId: key(),
      name,
      price: 99000,
      grants: [{ kind: 'gdr', qty: 1 }],
      validDays: 30,
      perks: '',
      section: '',
      room: 'any',
      active: true,
    },
  });
  expect(created.status(), await created.text()).toBe(200);
  const activeOf = async () => {
    const { types } = await (await page.request.get('/api/members')).json();
    return (types as { name: string; active: number }[]).find((t) => t.name === name)?.active;
  };
  expect(await activeOf()).toBe(1);

  await page.goto('/quan-ly');
  await page
    .locator('aside[aria-label="Menu chính"]')
    .getByRole('button', { name: /Khách hàng/ })
    .click();
  await page.getByRole('tab', { name: 'Danh mục gói' }).click();
  const row = page.locator('tr', { hasText: name });
  await expect(row).toContainText('Đang bán');
  await row.getByRole('button', { name: 'Ngừng bán' }).click();
  await expect.poll(activeOf).toBe(0);
  await expect(row).toContainText('Bán lại');
  await row.getByRole('button', { name: 'Bán lại' }).click();
  await expect.poll(activeOf).toBe(1);
  await expect(row).toContainText('Ngừng bán');
});

test('thu gọn và mở từng nhóm dịch vụ trong bảng khung giá', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await openPriceTab(page);
  const group = page.getByRole('button', { name: /^18 hố · trọn lượt/ }).first();
  const rows = page.locator('.pt-table tbody tr:not(.pt-sub):not([hidden])');
  const before = await rows.count();
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  expect(await rows.count()).toBeLessThan(before);
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  expect(await rows.count()).toBe(before);
});
