import { test, expect, type APIRequestContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

async function club(request: APIRequestContext, data: Record<string, unknown>, status = 200) {
  const response = await request.post('/api/club', { data });
  expect(response.status(), await response.text()).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

test('bảo trì line: không nhận khách, không đặt trước, bật lại được', async ({ page }) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);

  const on = await club(owner, { action: 'maintenance', room: 'line-9', value: { on: true, reason: 'Thay thảm đánh' } });
  expect(on.ok).toBe(true);
  const snapshot = await (await owner.get('/api/club')).json();
  expect(snapshot.maintenance).toEqual([expect.objectContaining({ room: 'line-9', reason: 'Thay thảm đánh' })]);

  // A line under maintenance takes neither a walk-in nor a booking.
  const walk = await club(owner, { action: 'walkin', room: 'line-9', service: 'gdr', people: 1 }, 409);
  expect(walk.error).toContain('bảo trì');
  const start = Date.now() + 2 * 3_600_000;
  const booked = await club(owner, { action: 'book', room: 'line-9', service: 'gdr', start, people: 1, customer: 'Khách thử', phone: '0911000222', expectedRevision: snapshot.config.pricingRevision }, 409);
  expect(booked.error).toContain('bảo trì');

  // The board shows it, and a click opens the maintenance dialog instead of starting a session.
  await page.goto('/quan-ly');
  const card = page.locator('.pos-line.maintenance', { hasText: 'Line 09' });
  await expect(card).toBeVisible();
  await expect(card.getByText('Bảo trì')).toBeVisible();
  await card.getByRole('button').click();
  const dialog = page.getByRole('dialog', { name: 'Bảo trì line' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Hoạt động trở lại' }).first().click();
  await expect(page.locator('.pos-line.maintenance')).toHaveCount(0);
  await page.keyboard.press('Escape');

  const after = await (await owner.get('/api/club')).json();
  expect(after.maintenance).toEqual([]);
  // Back in service: the walk-in may still be refused for other reasons (a booking nearby), never for maintenance.
  const again = await owner.post('/api/club', { data: { action: 'walkin', room: 'line-9', service: 'gdr', people: 1 } });
  if (!again.ok()) expect((await again.json()).error).not.toContain('bảo trì');
});

test('không chuyển line đang có khách sang bảo trì', async ({ page }) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  // Earlier specs leave some lines busy: start a session on the first line that accepts one.
  let room = '';
  for (const id of ['line-1', 'line-2', 'line-3', 'line-4', 'line-5', 'line-6', 'line-7', 'line-8', 'line-10']) {
    const r = await owner.post('/api/club', { data: { action: 'walkin', room: id, service: 'gdr', people: 1 } });
    if (r.ok()) {
      room = id;
      break;
    }
  }
  expect(room, 'no free line to start a walk-in on').not.toBe('');
  const refused = await club(owner, { action: 'maintenance', room, value: { on: true } }, 409);
  expect(refused.error).toContain('có khách');
  // An unknown line is rejected.
  await club(owner, { action: 'maintenance', room: 'line-99', value: { on: true } }, 400);
});
