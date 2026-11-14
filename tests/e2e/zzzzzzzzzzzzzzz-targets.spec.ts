import { test, expect, type APIRequestContext } from '@playwright/test';

// Monthly revenue targets: managers set them, progress follows real payments on CRM orders.
test.describe.configure({ mode: 'serial' });
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const origin = 'http://127.0.0.1:8787';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let owner: APIRequestContext;
let ownerId = '';
const month = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 7);
const post = (url: string, data: Json) => owner.post(url, { data, headers: { origin, 'x-forwarded-for': '10.66.0.1' } });
const report = async (m = month) => (await (await owner.get('/api/crm2/targets?month=' + m)).json()) as Json;

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: origin });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  ownerId = ((await (await owner.get('/api/crm2/config')).json()) as Json).me;
});
test.afterAll(async () => owner.dispose());

test('chưa đăng nhập bị chặn; tháng sai về tháng hiện tại; chưa đặt thì chưa có phần trăm', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get('/api/crm2/targets')).status()).toBe(401);
  await anon.dispose();
  const r = await report('abc');
  expect(r.month).toBe(month);
  expect(r.editable).toBe(true);
  expect(r.club.state === 'none' || r.club.target > 0).toBe(true);
  expect((await post('/api/crm2/targets', { action: 'other' })).status()).toBe(400);
  expect((await post('/api/crm2/targets', { action: 'set', month: '2026-13', club: 1 })).status()).toBe(400);
});

test('đặt mục tiêu: lưu cho CLB và nhân viên, bỏ số âm và nhân viên lạ', async () => {
  const set = await post('/api/crm2/targets', { action: 'set', month, club: 50_000_000, staff: { [ownerId]: 20_000_000, khongco: 5, } });
  expect(set.status()).toBe(200);
  const r = await report();
  expect(r.club.target).toBe(50_000_000);
  expect(r.club.state).not.toBe('none');
  const mine = (r.staff as Json[]).find((s) => s.id === ownerId)!;
  expect(mine.target).toBe(20_000_000);
  expect((r.staff as Json[]).some((s) => s.id === 'khongco')).toBe(false);
  expect(r.club.remaining).toBe(50_000_000 - r.club.actual);
});

test('tiền thu thật từ đơn bán trong CRM được tính vào tiến độ, ghi cho nhân viên phụ trách', async () => {
  const before = await report();
  expect((await post('/api/crm2/sales', { action: 'product', code: 'TGT-PKG', name: 'Gói mục tiêu', listPrice: 400_000, limited: false, active: true })).status()).toBe(200);
  const phone = '0955333' + String(Date.now()).slice(-3);
  expect((await post('/api/crm2/intake', { fullName: 'Khách Mục Tiêu', phone, consent: true })).status()).toBe(200);
  const lead = (((await (await owner.get('/api/crm2/leads?q=' + phone)).json()) as Json).leads as Json[])[0];
  expect((await post('/api/crm2/leads', { action: 'assign', ids: [lead.id], userId: ownerId })).status()).toBe(200);
  const order = (await (await post('/api/crm2/sales', { action: 'order', leadId: lead.id, productCode: 'TGT-PKG' })).json()) as Json;
  const orderId = (order.id ?? order.orderId) as string;
  expect(orderId).toBeTruthy();
  const act = (a: Json) => post('/api/crm2/sales', { action: 'order-action', id: orderId, ...a });
  expect((await act({ op: 'schedule', installments: 1, firstDue: '2030-01-01', intervalDays: 30 })).status()).toBe(200);
  const detail = (await (await owner.get('/api/crm2/sales?view=order&id=' + orderId)).json()) as Json;
  const row = (detail.payments as Json[]).find((p) => p.kind !== 'DEPOSIT' && p.status !== 'CANCELLED')!;
  expect((await act({ op: 'pay', paymentId: row.id, amount: 400_000, method: 'Tiền mặt' })).status()).toBe(200);

  const after = await report();
  expect(after.club.actual - before.club.actual).toBe(400_000);
  const mineBefore = (before.staff as Json[]).find((s) => s.id === ownerId)?.actual ?? 0;
  const mineAfter = (after.staff as Json[]).find((s) => s.id === ownerId)!.actual;
  expect(mineAfter - mineBefore).toBe(400_000);
  // another month is not affected
  const other = await report('2020-01');
  expect(other.club.actual).toBe(0);
});

test('giao diện: thẻ Mục tiêu doanh thu hiện trên Tổng quan và đặt được mục tiêu', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menu CRM' }).getByRole('button', { name: 'Tổng quan', exact: true }).click();
  await page.getByText('Phễu, nguồn khách và xếp hạng nhân viên').click();
  await expect(page.getByRole('heading', { name: 'Mục tiêu doanh thu' })).toBeVisible();
  await page.getByRole('button', { name: 'Đặt mục tiêu' }).click();
  await page.getByLabel('Mục tiêu câu lạc bộ').fill('80000000');
  await page.getByRole('button', { name: 'Lưu mục tiêu' }).click();
  await expect(page.getByRole('progressbar', { name: 'Tiến độ so với mục tiêu' })).toBeVisible();
  await expect(page.getByText('Dự báo cuối tháng')).toBeVisible();
});
