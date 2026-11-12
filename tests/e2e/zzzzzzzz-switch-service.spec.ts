import { test, expect } from '@playwright/test';

// Runs after flow.spec.ts "cấu hình cơ sở" (club settings and prices exist).
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

test('chuyển phiên giữa tập theo giờ và chơi game, tính lại giá', async ({ request }) => {
  expect((await request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const club = async () => (await request.get('/api/club')).json();
  const { config } = await club();
  const post = async (data: Record<string, unknown>, status = 200) => {
    const r = await request.post('/api/club', { data });
    expect(r.status(), await r.text()).toBe(status);
    return (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  const booked = await post({
    action: 'book',
    room: 'line-7',
    service: 'gdr',
    start: Math.ceil(Date.now() / 900_000) * 900_000,
    people: 1,
    minutes: 60,
    customer: 'Khách Đổi Hình Thức',
    phone: '0911222333',
    expectedRevision: config.pricingRevision,
  });
  const id = booked.id as string;
  const row = async () => (await club()).bookings.find((b: { id: string }) => b.id === id);
  await post({ action: 'start', id });

  await post({ action: 'switch-service', id, service: '9' });
  let b = await row();
  const snap9 = JSON.parse(b.price);
  expect(b.service).toBe('9');
  expect(snap9.base).toBeGreaterThan(0);

  await post({ action: 'switch-service', id, service: '18' });
  b = await row();
  expect(b.service).toBe('18');
  expect(JSON.parse(b.price).base).toBeGreaterThanOrEqual(snap9.base);

  await post({ action: 'switch-service', id, service: 'gdr' });
  b = await row();
  expect(b.service).toBe('gdr');
  expect(JSON.parse(b.price).base).toBe(0);

  // Finish as a game round: the amount is the whole-round price, not minutes.
  await post({ action: 'switch-service', id, service: '9' });
  await post({ action: 'finish', id });
  b = await row();
  expect(b.amount).toBeGreaterThan(0);
  // Finished sessions can no longer switch.
  await post({ action: 'switch-service', id, service: 'gdr' }, 400);
});
