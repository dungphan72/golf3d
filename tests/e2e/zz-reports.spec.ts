import { test, expect } from '@playwright/test';

// Runs last (alphabetical) and relies on the payments recorded by the earlier specs.
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const vnDate = (ms: number) => new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);

test('báo cáo doanh thu: cần đăng nhập, kiểm tra khoảng ngày, có số liệu hôm nay', async ({
  page,
}) => {
  const today = vnDate(Date.now());
  expect((await page.request.get(`/api/reports?from=${today}&to=${today}`)).status()).toBe(401);
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  expect((await page.request.get('/api/reports?from=abc&to=2026-01-01')).status()).toBe(400);
  expect((await page.request.get('/api/reports?from=2020-01-01&to=2026-01-01')).status()).toBe(400);

  const r = await page.request.get(`/api/reports?from=${today}&to=${today}`);
  expect(r.status()).toBe(200);
  const report = await r.json();
  const total = report.days.reduce(
    (n: number, d: { cash: number; transfer: number; card: number }) =>
      n + d.cash + d.transfer + d.card,
    0,
  );
  expect(total).toBeGreaterThan(0);
  expect(report.services.length).toBeGreaterThan(0);

  await page.goto('/');
  await page
    .locator('aside')
    .getByRole('button', { name: /Báo cáo/ })
    .click();
  await expect(page.getByText('Doanh thu theo ngày')).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Tổng thu' })).toBeVisible();
});
