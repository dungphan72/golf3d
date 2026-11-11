import { test, expect, type APIRequestContext } from '@playwright/test';

// Support tickets: auto-assign, SLA deadline, status flow, who may do what, satisfaction score.
test.describe.configure({ mode: 'serial' });
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const SALE = { email: 'ticketsale@e2e.test', password: 'Ticket-Pass-2026-xK' };
const origin = 'http://127.0.0.1:8787';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let owner: APIRequestContext;
let sale: APIRequestContext;
let saleId = '';
const send = (r: APIRequestContext, data: Json) => r.post('/api/crm2/tickets', { data, headers: { origin } });
const detail = async (r: APIRequestContext, id: string) => (await (await r.get('/api/crm2/tickets?id=' + id)).json()) as Json;

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: origin });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  sale = await playwright.request.newContext({ baseURL: origin });
  const created = await owner.post('/api/staff', { data: { action: 'create', email: SALE.email, name: 'Sale Ticket', role: 'sale' }, headers: { origin } });
  expect([200, 409]).toContain(created.status());
  if (created.status() === 200) {
    const temp = ((await created.json()) as Json).temporaryPassword as string;
    expect((await sale.post('/api/auth/login', { data: { email: SALE.email, password: temp } })).status()).toBe(200);
    expect((await sale.post('/api/auth/password', { data: { action: 'change', current: temp, next: SALE.password }, headers: { origin } })).status()).toBe(200);
  } else {
    expect((await sale.post('/api/auth/login', { data: SALE })).status()).toBe(200);
  }
  const staff = (((await (await owner.get('/api/staff')).json()) as Json).staff ?? []) as Json[];
  saleId = staff.find((s) => s.email === SALE.email)!.id;
});
test.afterAll(async () => {
  await owner.dispose();
  await sale.dispose();
});

let id = '';

test('chưa đăng nhập bị chặn; dữ liệu sai bị từ chối', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get('/api/crm2/tickets')).status()).toBe(401);
  await anon.dispose();
  expect((await send(owner, { action: 'create', subject: 'a', category: 'support' })).status()).toBe(400);
  expect((await send(owner, { action: 'create', subject: 'Tiêu đề đủ dài', category: 'khac' })).status()).toBe(400);
  expect((await send(owner, { action: 'update', id: 'khongco', status: 'resolved' })).status()).toBe(404);
});

test('tạo ticket khẩn: mã TK-, hạn xử lý 2 giờ, tự giao người đang ít việc nhất', async () => {
  const r = await send(owner, { action: 'create', subject: 'Máy chiếu line 2 không lên hình', description: 'Khách đang chơi', category: 'equipment', priority: 'urgent', customerName: 'Khách Ticket', phone: '0955344001' });
  expect(r.status()).toBe(200);
  const made = (await r.json()) as Json;
  id = made.id;
  expect(made.code).toMatch(/^TK-\d{4,}$/);
  expect(made.assignee).toBeTruthy();
  const d = await detail(owner, id);
  expect(d.ticket.status).toBe('new');
  expect(d.ticket.dueAt - d.ticket.created).toBe(2 * 3_600_000);
  const list = (await (await owner.get('/api/crm2/tickets?filter=open')).json()) as Json;
  expect((list.tickets as Json[]).some((t) => t.id === id)).toBe(true);
  expect(list.summary.open).toBeGreaterThanOrEqual(1);
});

test('quản lý giao cho nhân viên, nhân viên không đổi được ưu tiên hay chia lại', async () => {
  expect((await send(owner, { action: 'update', id, assignee: saleId })).status()).toBe(200);
  expect((await detail(owner, id)).assigneeName).toBe('Sale Ticket');
  expect((await send(sale, { action: 'update', id, priority: 'low' })).status()).toBe(403);
  expect((await send(sale, { action: 'update', id, assignee: null })).status()).toBe(403);
  expect((await send(owner, { action: 'update', id, assignee: 'khongco' })).status()).toBe(404);
});

test('xử lý: nhận, ghi chú, chờ khách (dừng SLA), giải quyết, khách chấm điểm, đóng', async () => {
  expect((await send(sale, { action: 'update', id, status: 'in_progress', note: 'Đã đến kiểm tra' })).status()).toBe(200);
  expect((await send(sale, { action: 'update', id, status: 'waiting' })).status()).toBe(200);
  expect((await send(sale, { action: 'update', id, status: 'waiting' })).status()).toBe(200); // same status again changes nothing
  expect((await send(sale, { action: 'update', id, rating: 5 })).status()).toBe(400); // too early
  expect((await send(sale, { action: 'update', id, status: 'resolved' })).status()).toBe(200);
  expect((await send(sale, { action: 'update', id, rating: 9 })).status()).toBe(400);
  expect((await send(sale, { action: 'update', id, rating: 5 })).status()).toBe(200);
  expect((await send(sale, { action: 'update', id, status: 'closed' })).status()).toBe(200);
  const d = await detail(owner, id);
  expect(d.ticket.rating).toBe(5);
  expect(d.ticket.resolvedAt).toBeTruthy();
  expect((d.ticket.notes as Json[]).some((n) => n.text === 'Đã đến kiểm tra')).toBe(true);
  const list = (await (await owner.get('/api/crm2/tickets?filter=done')).json()) as Json;
  expect(list.summary.avgRating).not.toBeNull();
  expect(list.summary.resolvedInPeriod).toBeGreaterThanOrEqual(1);
});

test('ticket đã đóng: nhân viên không mở lại được, quản lý mở lại được', async () => {
  expect((await send(sale, { action: 'update', id, status: 'in_progress' })).status()).toBe(409);
  expect((await send(owner, { action: 'update', id, status: 'in_progress' })).status()).toBe(200);
  expect((await detail(owner, id)).ticket.status).toBe('in_progress');
});

test('giao diện: Ticket hỗ trợ tạo ticket, mở chi tiết và nhận xử lý', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menu CRM' }).getByRole('button', { name: 'Ticket hỗ trợ', exact: true }).click();
  await expect(page.getByText('Quá hạn SLA')).toBeVisible();
  await page.getByRole('button', { name: '+ Tạo ticket' }).click();
  await page.getByLabel('Tiêu đề ticket').fill('Khách hỏi hóa đơn VAT');
  await page.getByLabel('Loại ticket').selectOption('billing');
  await page.getByRole('button', { name: 'Tạo và tự giao người xử lý' }).click();
  await page.getByRole('row', { name: /Khách hỏi hóa đơn VAT/ }).click();
  await expect(page.getByRole('heading', { name: 'Khách hỏi hóa đơn VAT' })).toBeVisible();
  await page.getByRole('button', { name: 'Nhận xử lý' }).click();
  await page.getByLabel('Ghi chú xử lý').fill('Đã gọi lại cho khách');
  await page.getByRole('button', { name: 'Thêm ghi chú' }).click();
  await expect(page.getByRole('list', { name: 'Lịch sử xử lý' })).toContainText('Đã gọi lại cho khách');
});
