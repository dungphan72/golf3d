import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

test('tin tức và sự kiện: nhân viên soạn, chỉ bài đã đăng hiện ở trang công khai', async ({ page, request }) => {
  // Not signed in: no access to the staff side.
  expect((await request.get('/api/content')).status()).toBe(401);

  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const post = (data: unknown, status = 200) =>
    owner.post('/api/content', { data }).then(async (r) => {
      expect(r.status(), await r.text()).toBe(status);
      return (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    });

  const when = Date.now() + 10 * 86_400_000;
  const event = await post({ action: 'save', post: { kind: 'event', title: 'Giải thử nghiệm E2E', summary: 'Giải nội bộ', body: 'Đoạn một.\n\nĐoạn hai.', eventAt: when, place: 'Tại câu lạc bộ', status: 'published' } });
  await post({ action: 'save', post: { kind: 'news', title: 'Tin đã đăng E2E', summary: 'Tóm tắt', status: 'published' } });
  await post({ action: 'save', post: { kind: 'news', title: 'Tin nháp E2E', status: 'draft' } });

  // Validation: an event needs a date; images must be local files or https.
  expect((await post({ action: 'save', post: { kind: 'event', title: 'Thiếu ngày giờ' } }, 400)).error).toContain('ngày giờ');
  expect((await post({ action: 'save', post: { kind: 'news', title: 'Ảnh không hợp lệ', image: 'javascript:alert(1)' } }, 400)).error).toContain('ảnh');

  // The public list shows the published pair and hides the draft.
  await page.goto('/tin-tuc');
  await expect(page.getByText('Giải thử nghiệm E2E')).toBeVisible();
  await expect(page.getByText('Tin đã đăng E2E')).toBeVisible();
  await expect(page.getByText('Tin nháp E2E')).toHaveCount(0);

  // The event page renders the body as plain paragraphs.
  await page.getByRole('link', { name: /Giải thử nghiệm E2E/ }).click();
  await page.waitForURL(/\/tin-tuc\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Giải thử nghiệm E2E' })).toBeVisible();
  await expect(page.getByText('Đoạn hai.')).toBeVisible();

  // A guest signs up for the event; the same phone number cannot sign up twice; the staff list shows it.
  const form = page.locator('#dang-ky');
  await form.getByLabel('Họ và tên').fill('Khách Đăng Ký');
  await form.getByLabel('Số điện thoại').fill('0912345670');
  await form.getByRole('button', { name: 'Gửi đăng ký' }).click();
  await expect(page.getByText('Đã nhận đăng ký của bạn')).toBeVisible();
  const again = await page.request.post('/api/events', { data: { postId: event.id, name: 'Khách Đăng Ký', phone: '+84 912 345 670' } });
  expect((await again.json()).already).toBe(true);
  const bad = await page.request.post('/api/events', { data: { postId: event.id, name: 'Sai số', phone: '123' } });
  expect(bad.status()).toBe(400);
  const list = await owner.post('/api/content', { data: { action: 'signups', id: event.id } });
  expect((await list.json()).signups).toEqual([expect.objectContaining({ name: 'Khách Đăng Ký', phone: '0912345670' })]);
  expect(((await (await owner.get('/api/content')).json()).signups as Record<string, number>)[event.id]).toBe(1);

  // Unpublish: the page disappears (404) and so does the list entry.
  await post({ action: 'save', post: { id: event.id, kind: 'event', title: 'Giải thử nghiệm E2E', eventAt: when, status: 'draft' } });
  const gone = await page.goto(`/tin-tuc/${event.id}`);
  expect(gone?.status()).toBe(404);
  await post({ action: 'delete', id: event.id });
});
