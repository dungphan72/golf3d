import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs after flow.spec.ts (online booking enabled with the slug "e2e-golf").
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const SLUG = 'e2e-golf';
const LINE = 'line-6';

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}
const get = async (request: APIRequestContext, url: string, status = 200) => {
  const response = await request.get(url);
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};

test('chuông gọi phục vụ: khách gọi từ line, nhân viên nhận và hoàn thành, khách thấy trạng thái', async ({
  page,
  browser,
}) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const guest = await browser.newContext();
  const pub = guest.request;

  // No session on the line yet: the page says so and ringing is refused.
  expect(await get(pub, `/api/public/call?slug=${SLUG}&room=${LINE}`)).toMatchObject({
    room: 'Line 06',
    active: false,
  });
  await post(pub, '/api/public/call', { slug: SLUG, room: LINE, kind: 'Gọi đồ uống' }, 409);

  // A walk-in session starts; now the line can ring.
  const walk = await post(owner, '/api/club', {
    action: 'walkin',
    room: LINE,
    service: 'gdr',
    people: 2,
  });
  expect((await get(pub, `/api/public/call?slug=${SLUG}&room=${LINE}`)).active).toBe(true);

  // Bad input and unknown places are refused.
  await post(pub, '/api/public/call', { slug: SLUG, room: LINE, kind: 'Khác' }, 400);
  await post(pub, '/api/public/call', { slug: SLUG, room: 'line-99', kind: 'Gọi đồ uống' }, 404);
  await post(pub, '/api/public/call', { slug: 'khong-co', room: LINE, kind: 'Gọi đồ uống' }, 404);

  // A push subscription that cannot be reached must not break ringing.
  await post(
    owner,
    '/api/push',
    {
      action: 'subscribe',
      endpoint: 'https://127.0.0.1:9/push/unreachable',
      p256dh: 'B'.repeat(87),
      auth: 'A'.repeat(22),
    },
    200,
  );

  const rung = await post(pub, '/api/public/call', { slug: SLUG, room: LINE, kind: 'Gọi đồ uống' });
  expect(typeof rung.id).toBe('string');
  // Ringing the same thing again merges into the open request.
  const again = await post(pub, '/api/public/call', {
    slug: SLUG,
    room: LINE,
    kind: 'Gọi đồ uống',
  });
  expect(again).toMatchObject({ id: rung.id, repeated: true });
  expect(await get(pub, `/api/public/call?slug=${SLUG}&id=${rung.id}`)).toMatchObject({
    status: 'new',
    kind: 'Gọi đồ uống',
  });

  // Staff see it in the support list tied to the session, accept, then finish it.
  const snap = await get(owner, '/api/club');
  expect(snap.requests.find((r: { id: string }) => r.id === rung.id)).toMatchObject({
    booking: walk.id,
    kind: 'Gọi đồ uống',
    status: 'new',
  });
  await post(owner, '/api/club', { action: 'request-update', id: rung.id, status: 'received' });
  expect((await get(pub, `/api/public/call?slug=${SLUG}&id=${rung.id}`)).status).toBe('received');
  await post(owner, '/api/club', { action: 'request-update', id: rung.id, status: 'done' });
  expect((await get(pub, `/api/public/call?slug=${SLUG}&id=${rung.id}`)).status).toBe('done');

  // After it is done the same kind can be requested again as a new request.
  const next = await post(pub, '/api/public/call', { slug: SLUG, room: LINE, kind: 'Gọi đồ uống' });
  expect(next.id).not.toBe(rung.id);
  await post(owner, '/api/club', { action: 'request-update', id: next.id, status: 'done' });

  // Push endpoints are for signed-in staff only.
  await get(pub, '/api/push', 401);
  expect(typeof (await get(owner, '/api/push')).publicKey).toBe('string');

  // The guest page behind the QR code.
  const guestPage = await guest.newPage();
  await guestPage.goto(`/goi/${SLUG}/${LINE}`);
  await expect(guestPage.getByRole('heading', { name: 'Line 06' })).toBeVisible();
  await guestPage.getByRole('button', { name: 'Nhân viên hỗ trợ' }).click();
  await expect(guestPage.getByRole('status')).toContainText('nhân viên sẽ đến ngay');
  const open = (await get(owner, '/api/club')).requests.find(
    (r: { kind: string; status: string }) => r.kind === 'Nhân viên hỗ trợ' && r.status === 'new',
  );
  expect(open).toBeTruthy();
  await post(owner, '/api/club', { action: 'request-update', id: open.id, status: 'received' });
  await expect(guestPage.getByRole('status')).toContainText('đã nhận', { timeout: 15_000 });
  await post(owner, '/api/club', { action: 'request-update', id: open.id, status: 'done' });
  await expect(guestPage.getByRole('status')).toContainText('Đã hoàn thành', { timeout: 15_000 });

  // The admin screens: bell controls on the support tab and the printable QR sheet in settings.
  const ring = await post(pub, '/api/public/call', {
    slug: SLUG,
    room: LINE,
    kind: 'Hỗ trợ thiết bị',
  });
  await page.goto('/quan-ly');
  // The menu entry is on the bar and flags a waiting guest.
  const bellNav = page.locator('nav[aria-label="Quản trị hệ thống"]').getByRole('button', { name: /Trợ giúp/ });
  await expect(bellNav.locator('.pos-count')).toHaveText('1');
  await bellNav.click();
  await expect(page.locator('.bell-summary')).toContainText('1 yêu cầu đang chờ');
  await post(owner, '/api/club', { action: 'request-update', id: ring.id, status: 'done' });
  await expect(page.getByRole('heading', { name: 'Trợ giúp', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /Âm chuông/ })).toBeVisible();
  await page.locator('nav[aria-label="Quản trị hệ thống"]').getByRole('button', { name: /Cài đặt/ }).click();
  await page.getByRole('tab', { name: 'Đặt lịch' }).click();
  await expect(page.getByRole('heading', { name: 'Chuông gọi phục vụ' })).toBeVisible();
  await expect(page.locator('.qr-grid figure')).toHaveCount(12);

  await post(owner, '/api/club', { action: 'finish', id: walk.id });
  await guest.close();
});
