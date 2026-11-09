import { test, expect, type APIRequestContext } from '@playwright/test';

// Regressions found by the pre-launch audit (docs/PRE_LAUNCH_AUDIT.md).
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const origin = 'http://127.0.0.1:8787';

async function login(request: APIRequestContext) {
  const r = await request.post('/api/auth/login', { data: OWNER });
  expect(r.status()).toBe(200);
}

test('dọn dẹp dữ liệu thử: cần đăng nhập, cần chủ cơ sở và cụm từ xác nhận', async ({ request }) => {
  const anon = await request.post('/api/club', {
    data: { action: 'clean-test-data', value: { confirm: 'XACNHAN' } },
    headers: { origin },
  });
  expect([401, 403, 503]).toContain(anon.status());
  await login(request);
  const noConfirm = await request.post('/api/club', {
    data: { action: 'clean-test-data' },
    headers: { origin },
  });
  expect(noConfirm.status()).toBe(400);
  const wrong = await request.post('/api/club', {
    data: { action: 'clean-test-data', value: { confirm: 'xacnhan' } },
    headers: { origin },
  });
  expect(wrong.status()).toBe(400);
});

test('CRM: thêm nhân sự bán hàng chạy được, mật khẩu yếu bị từ chối, email trùng bị từ chối', async ({
  request,
}) => {
  await login(request);
  const post = (data: unknown) => request.post('/api/crm2/config', { data, headers: { origin } });
  const weak = await post({
    action: 'create_sale',
    name: 'Sale Yeu',
    email: 'sale.weak@e2e.test',
    role: 'sale',
    password: '12345678',
  });
  expect(weak.status()).toBe(400);
  const created = await post({
    action: 'create_sale',
    name: 'Sale Kiem Thu',
    email: 'sale.audit@e2e.test',
    role: 'sale',
  });
  expect(created.status(), await created.text()).toBe(200);
  const body = (await created.json()) as { id: string; temporaryPassword: string };
  expect(body.id).toBeTruthy();
  expect(body.temporaryPassword.length).toBeGreaterThanOrEqual(8);
  const dup = await post({
    action: 'create_sale',
    name: 'Sale Kiem Thu',
    email: 'sale.audit@e2e.test',
    role: 'sale',
  });
  expect(dup.status()).toBe(409);
  const reset = await post({ action: 'reset_password', userId: body.id });
  expect(reset.status()).toBe(200);
  const removed = await post({ action: 'delete_sale', userId: body.id });
  expect(removed.status()).toBe(200);
  const again = await post({ action: 'delete_sale', userId: body.id });
  expect(again.status()).toBe(404);
});

test('tải ảnh: chỉ nhận JPG/PNG/WebP thật, không nhận SVG hay tệp đổi đuôi', async ({ request }) => {
  await login(request);
  const fake = await request.post('/api/upload', {
    headers: { origin },
    multipart: {
      file: { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('<svg onload=alert(1)>') },
    },
  });
  expect(fake.status()).toBe(415);
});

test('lưu cài đặt cơ sở không làm mất nội dung trang chủ (landing)', async ({ request }) => {
  await login(request);
  const snap = (await (await request.get('/api/club')).json()) as {
    config: Record<string, unknown>;
  };
  const landing = { heroTitle: 'Kiểm thử giữ landing' };
  const saved = await request.post('/api/landing', { data: landing, headers: { origin } });
  expect(saved.status()).toBe(200);
  const res = await request.post('/api/club', {
    data: { action: 'settings', value: snap.config },
    headers: { origin },
  });
  expect(res.status(), await res.text()).toBe(200);
  const after = (await (await request.get('/api/landing')).json()) as {
    data: { heroTitle?: string };
  };
  expect(after.data.heroTitle).toBe('Kiểm thử giữ landing');
});
