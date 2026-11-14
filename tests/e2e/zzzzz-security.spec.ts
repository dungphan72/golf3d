import { test, expect } from '@playwright/test';

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

test('mọi API quản lý từ chối người chưa đăng nhập, kể cả khi giả header danh tính nền tảng', async ({
  request,
}) => {
  const spoof = {
    'oai-authenticated-user-id': 'attacker',
    'oai-authenticated-user-email': 'attacker@example.com',
  };
  for (const path of [
    'club',
    'audit',
    'export',
    'reports',
    'staff',
    'members',
    'stock',
    'fnb',
    'billing',
    'finance',
    'crm2/leads',
    'crm2/overview',
    'crm2/blocked',
    'crm2/channels',
    'coaching',
    'online',
    'bank',
    'auth/me',
  ]) {
    expect((await request.get('/api/' + path)).status(), path).toBe(401);
    expect((await request.get('/api/' + path, { headers: spoof })).status(), 'spoof ' + path).toBe(
      401,
    );
  }
  for (const path of ['club', 'staff', 'finance', 'billing', 'members', 'fnb', 'crm2/leads']) {
    // No body: the local worker runtime restarts when a request body is left unread after an early reply.
    const r = await request.post('/api/' + path, { headers: spoof });
    expect(r.status(), 'POST ' + path).toBe(401);
  }
});

test('tiêu đề bảo mật trên trang và API', async ({ request }) => {
  const page = await request.get('/');
  const h = page.headers();
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).toContain("object-src 'none'");
  expect(h['permissions-policy']).toContain('camera=()');
  const api = await request.get('/api/club');
  expect(api.headers()['x-robots-tag']).toContain('noindex');
  expect(api.headers()['cache-control']).toBe('no-store');
});

test('chặn CSRF: yêu cầu ghi từ nguồn khác bị từ chối, kể cả khi đã đăng nhập', async ({
  page,
}) => {
  const evil = { Origin: 'https://evil.example' };
  const login = await page.request.post('/api/auth/login', { headers: evil });
  expect(login.status()).toBe(403);
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  for (const path of ['club', 'finance', 'billing', 'staff', 'members']) {
    const r = await page.request.post('/api/' + path, { headers: evil });
    expect(r.status(), 'POST ' + path).toBe(403);
  }
});

test('dò mật khẩu: một địa chỉ sai quá 20 lần thì bị chặn, địa chỉ khác vẫn đăng nhập được', async ({
  request,
}) => {
  const attacker = { 'x-forwarded-for': '203.0.113.77' };
  let last = 0;
  for (let i = 0; i < 22; i++) {
    const r = await request.post('/api/auth/login', {
      data: { email: `nobody${i}@example.com`, password: 'sai-mat-khau-' + i },
      headers: attacker,
    });
    last = r.status();
    if (last === 429) break;
  }
  expect(last).toBe(429);
  // Even the right password is refused from the blocked address ...
  expect((await request.post('/api/auth/login', { data: OWNER, headers: attacker })).status()).toBe(
    429,
  );
  // ... while an honest visitor elsewhere is unaffected.
  expect(
    (
      await request.post('/api/auth/login', {
        data: OWNER,
        headers: { 'x-forwarded-for': '198.51.100.20' },
      })
    ).status(),
  ).toBe(200);
});

test('mật khẩu yếu hoặc phổ biến bị từ chối khi đổi', async ({ page }) => {
  expect(
    (
      await page.request.post('/api/auth/login', {
        data: OWNER,
        headers: { 'x-forwarded-for': '198.51.100.21' },
      })
    ).status(),
  ).toBe(200);
  for (const next of ['12345678', 'password123', 'owner@e2e.test', 'aaaaaaaa', 'short']) {
    const r = await page.request.post('/api/auth/password', {
      data: { action: 'change', current: OWNER.password, next },
    });
    expect(r.status(), next).toBe(400);
  }
});

test('cron và webhook: sai khóa bị từ chối', async ({ request }) => {
  expect((await request.post('/api/cron/crm')).status()).toBe(401);
  expect(
    (await request.post('/api/cron/crm', { headers: { authorization: 'Bearer sai' } })).status(),
  ).toBe(401);
  expect(
    (
      await request.post('/api/webhooks/sepay', {
        data: { id: 1, transferType: 'in', transferAmount: 1000, content: 'x' },
        headers: { authorization: 'Apikey khong-dung-khoa-nay-1234567890' },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post('/api/leads/website', {
        data: { name: 'A', phone: '0900000001' },
        headers: { 'x-lead-token': 'khong-phai-ma-hop-le-1234567890' },
      })
    ).status(),
  ).toBe(401);
});

test('đoán mật khẩu chủ cơ sở chỉ khóa địa chỉ đó, chủ vẫn đăng nhập từ nơi khác', async ({
  request,
}) => {
  const attacker = { 'x-forwarded-for': '203.0.113.88' };
  for (let i = 0; i < 5; i++) {
    const r = await request.post('/api/auth/login', {
      data: { email: OWNER.email, password: 'doan-sai-' + i },
      headers: attacker,
    });
    expect(r.status()).toBe(401);
  }
  expect((await request.post('/api/auth/login', { data: OWNER, headers: attacker })).status()).toBe(
    429,
  );
  expect(
    (
      await request.post('/api/auth/login', {
        data: OWNER,
        headers: { 'x-forwarded-for': '198.51.100.30' },
      })
    ).status(),
  ).toBe(200);
});
