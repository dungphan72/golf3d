import { test, expect, type APIRequestContext } from '@playwright/test';

// The website form webhook (POST /api/leads/website) writes into the old "Chăm sóc KH" by default; the owner can send it
// to the CRM module instead (CRM > Cấu hình > "Lead từ form website"). Both directions are checked here, and the setting is
// put back at the end so no other spec sees a different club.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let owner: APIRequestContext;
let token = '';
let seq = 0;
const phone = () => `0944${String(300000 + ++seq)}`;

async function send(data: Json, status = 200) {
  const r = await owner.post('/api/leads/website', { data, headers: { 'x-lead-token': token } });
  expect(r.status(), await r.text()).toBe(status);
  return (await r.json()) as Json;
}
async function target(value: 'LEGACY' | 'CRM2') {
  const cfg = (await (await owner.get('/api/crm2/config')).json()) as Json;
  const r = await owner.post('/api/crm2/config', {
    data: { settings: { ...cfg.settings, websiteLeads: value } },
  });
  expect(r.status(), await r.text()).toBe(200);
  expect(((await r.json()) as Json).settings.websiteLeads).toBe(value);
}
const newLeads = async () =>
  ((await (await owner.get('/api/crm2/leads?limit=200&q=')).json()) as Json).leads as Json[];
const oldLeads = async () =>
  ((await (await owner.get('/api/crm/leads')).json()) as Json).leads as Json[];

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const rotated = await owner.post('/api/crm/channels', {
    data: { action: 'rotate', kind: 'website' },
  });
  token = ((await rotated.json()) as Json).token;
});
test.afterAll(async () => {
  await target('LEGACY');
  await owner.dispose();
});

test('mặc định lead từ form website vẫn vào CRM cũ', async () => {
  const cfg = (await (await owner.get('/api/crm2/config')).json()) as Json;
  expect(cfg.settings.websiteLeads).toBe('LEGACY');
  const p = phone();
  const r = await send({ name: 'Khách Cũ', phone: p, need: '9' });
  expect(r.ok).toBe(true);
  expect((await oldLeads()).some((l) => l.phone === p)).toBe(true);
  expect((await newLeads()).some((l) => l.phone === p)).toBe(false);
});

test('bật CRM mới: lead vào module mới, không vào bên cũ, giữ đủ thông tin', async () => {
  await target('CRM2');
  const p = phone();
  const r = await send({
    name: 'Khách Mới',
    phone: p,
    email: 'moi@example.vn',
    need: '18',
    guests: 4,
    message: 'Muốn đặt cuối tuần',
    campaign: 'thang-11',
    consent: true,
    preferredStart: Date.UTC(2027, 0, 15, 8, 0), // 15:00 in Vietnam
  });
  expect(r).toMatchObject({ ok: true, duplicate: false });
  expect(['assigned', 'queued']).toContain(r.status);
  expect(r.leadId).toBeTruthy();

  const detail = (await (await owner.get('/api/crm2/leads?id=' + r.leadId)).json()) as Json;
  expect(detail.lead).toMatchObject({
    id: r.leadId,
    fullName: 'Khách Mới',
    phone: p,
    email: 'moi@example.vn',
    source: 'Website',
    targetService: 'Game 18 hố',
    preferredDate: '2027-01-15',
    preferredTime: '15:00',
    stage: 'NEW',
  });
  for (const line of [
    'Muốn đặt cuối tuần',
    'Số khách: 4',
    'Chiến dịch: thang-11',
    'Khách đồng ý nhận tin ưu đãi',
  ])
    expect(detail.lead.notes).toContain(line);
  expect((await oldLeads()).some((l) => l.phone === p)).toBe(false);
});

test('gửi lại cùng số: cùng lead, tính thêm một lần hỏi', async () => {
  const p = phone();
  const first = await send({ name: 'Khách Hai Lần', phone: p, need: 'swing' });
  const again = await send({ name: 'Khách Hai Lần', phone: p, message: 'Gửi lại cho chắc' });
  expect(again.duplicate).toBe(true);
  expect(again.leadId).toBe(first.leadId);
  const lead = (await newLeads()).find((l) => l.id === first.leadId)!;
  expect(lead.inquiryCount).toBe(2);
  expect((await newLeads()).filter((l) => l.phone === p)).toHaveLength(1);
});

test('số điện thoại nằm trong lời nhắn thì vẫn nhận; không có số cũng không mất lead', async () => {
  const p = phone();
  const inText = await send({
    name: 'Khách Ghi Số',
    message: `Gọi em số ${p.slice(0, 4)} ${p.slice(4)} nhé, em muốn tập swing`,
  });
  const lead = (await newLeads()).find((l) => l.id === inText.leadId)!;
  expect(lead.phone).toBe(p);
  expect(lead.targetService).toBe('Luyện swing'); // guessed from the text

  const noPhone = await send({ name: 'Khách Không Số', email: 'khong-so@example.vn' });
  expect(noPhone.leadId).toBeTruthy();
  expect((await newLeads()).some((l) => l.id === noPhone.leadId)).toBe(true);
});

test('lead mới hiện ở số liệu tổng quan để trang chủ báo', async () => {
  const overview = (await (await owner.get('/api/crm2/overview')).json()) as Json;
  expect(overview.newUnhandled).toBeGreaterThan(0);
});

test('mã webhook sai vẫn bị từ chối, bật CRM mới cũng vậy', async () => {
  const r = await owner.post('/api/leads/website', {
    data: { name: 'X', phone: phone() },
    headers: { 'x-lead-token': 'lk_khong-dung-0000000000' },
  });
  expect(r.status()).toBe(401);
});

test('tắt lại: lead trở về CRM cũ', async () => {
  await target('LEGACY');
  const p = phone();
  await send({ name: 'Khách Lại Cũ', phone: p, need: '18' });
  expect((await oldLeads()).some((l) => l.phone === p)).toBe(true);
  expect((await newLeads()).some((l) => l.phone === p)).toBe(false);
});
