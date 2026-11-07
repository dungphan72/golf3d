import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs last: earlier specs left paid bookings (customers and "thanks" tasks come from those).
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}
type Task = {
  id: string;
  rule: string;
  status: string;
  name: string;
  phone: string;
  message: string;
  due: number;
  customer_id: string;
  assignee: string | null;
};
const tasksOf = async (request: APIRequestContext) =>
  (await (await request.get('/api/crm?view=tasks')).json()) as {
    tasks: Task[];
    counts: Record<string, number>;
  };

test('chăm sóc khách hàng: việc tự sinh từ phiếu đã thu, không trùng, xử lý được và có lịch sử', async ({
  page,
}) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);

  // Paid bookings of earlier specs become customers and "thanks" tasks, without duplicates.
  const first = await tasksOf(owner);
  const thanks = first.tasks.filter((t) => t.rule === 'thanks' && t.status === 'open');
  expect(thanks.length).toBeGreaterThan(0);
  expect(thanks[0].message).toContain(thanks[0].name.split(' ')[0]);
  const second = await tasksOf(owner);
  expect(second.tasks.length).toBe(first.tasks.length);

  // A customer with today's birthday gets a birthday task.
  const phone = '0955123456';
  const customer = await post(owner, '/api/members', {
    action: 'customer-create',
    name: 'Khách Sinh Nhật',
    phone,
    note: '',
  });
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(5, 10);
  await post(owner, '/api/crm', {
    action: 'birthday-set',
    customerId: customer.id,
    birthday: `1990-${today}`,
  });
  await post(
    owner,
    '/api/crm',
    { action: 'birthday-set', customerId: customer.id, birthday: '17/05/1990' },
    400,
  );
  const withBirthday = (await tasksOf(owner)).tasks.filter((t) => t.customer_id === customer.id);
  expect(withBirthday.map((t) => t.rule).sort()).toEqual(['birthday', 'welcome']);

  // Work the birthday task: claim, snooze the welcome task, then record the contact.
  const birthday = withBirthday.find((t) => t.rule === 'birthday')!;
  const welcome = withBirthday.find((t) => t.rule === 'welcome')!;
  expect(birthday.message).toContain('sinh nhật');
  await post(owner, '/api/crm', { action: 'task-claim', id: birthday.id });
  await post(owner, '/api/crm', { action: 'task-snooze', id: welcome.id, days: 3 });
  await post(owner, '/api/crm', {
    action: 'task-done',
    id: birthday.id,
    channel: 'zalo',
    note: 'Đã nhắn chúc mừng, khách hẹn thứ 7',
  });
  await post(owner, '/api/crm', { action: 'task-done', id: birthday.id, channel: 'call' }, 409);
  await post(owner, '/api/crm', {
    action: 'task-skip',
    id: welcome.id,
    reason: 'Khách đã nhận quà',
  });
  const after = (await tasksOf(owner)).tasks.filter((t) => t.customer_id === customer.id);
  expect(after.every((t) => t.status !== 'open')).toBe(true);
  // Closed tasks do not come back on the next generation run.
  expect((await tasksOf(owner)).tasks.filter((t) => t.customer_id === customer.id)).toHaveLength(2);

  // Customer file: contact history, notes, manual task and statistics.
  await post(owner, '/api/crm', {
    action: 'note-add',
    customerId: customer.id,
    channel: 'visit',
    content: 'Ghé quầy hỏi về gói VIP',
  });
  await post(owner, '/api/crm', {
    action: 'task-create',
    customerId: customer.id,
    title: 'Gọi báo giá gói VIP',
    days: 1,
  });
  const detail = await (await owner.get('/api/crm?view=customer&id=' + customer.id)).json();
  expect(detail.interactions.map((i: { content: string }) => i.content)).toEqual(
    expect.arrayContaining(['Ghé quầy hỏi về gói VIP', 'Đã nhắn chúc mừng, khách hẹn thứ 7']),
  );
  expect(detail.tasks.some((t: { title: string }) => t.title === 'Gọi báo giá gói VIP')).toBe(true);
  expect(detail.customer.birthday).toBe(`1990-${today}`);
  const list = await (await owner.get('/api/crm?view=customers&q=0955123')).json();
  expect(list.customers).toHaveLength(1);
  expect(list.customers[0].segments).toContain('idle');

  // Switching a flow off stops new tasks of that flow; the settings are validated.
  const current = (await tasksOf(owner)) as unknown as { settings?: never };
  expect(current).toBeTruthy();
  const settings = (await (await owner.get('/api/crm?view=tasks')).json()).settings;
  await post(owner, '/api/crm', {
    action: 'settings-save',
    settings: { ...settings, rules: { ...settings.rules, welcome: { enabled: false, value: 0 } } },
  });
  const other = await post(owner, '/api/members', {
    action: 'customer-create',
    name: 'Khách Không Chào',
    phone: '0955123457',
    note: '',
  });
  expect((await tasksOf(owner)).tasks.filter((t) => t.customer_id === other.id)).toHaveLength(0);
  await post(
    owner,
    '/api/crm',
    {
      action: 'settings-save',
      settings: {
        ...settings,
        rules: { ...settings.rules, comeback: { enabled: true, value: 1 } },
      },
    },
    400,
  );
  await post(owner, '/api/crm', {
    action: 'settings-save',
    settings: { ...settings, rules: { ...settings.rules, welcome: { enabled: true, value: 0 } } },
  });
});

// Legacy CRM v1 UI was retired in favor of CRM v2 (tested in zzzz-crm-*.spec.ts and zzzzz-crm-*.spec.ts).
test.skip('màn hình Chăm sóc KH: việc cần làm, hồ sơ khách và quy trình tự động', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('.ds-menubar').getByRole('button', { name: 'CRM', exact: true }).click();
  await page.getByRole('tab', { name: 'Chăm sóc KH (cũ)' }).click();
  await page.getByRole('tab', { name: 'Việc cần làm' }).click();
  await expect(page.getByRole('tab', { name: 'Việc cần làm' })).toBeVisible();

  // A task: record the contact.
  const card = page.locator('.crm-task').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.crm-message')).toBeVisible();
  await card.getByRole('button', { name: 'Đã liên hệ' }).click();
  await card.getByLabel('Kết quả liên hệ').fill('Đã gọi, khách hẹn tuần sau');
  await card.getByRole('button', { name: 'Lưu kết quả' }).click();
  await expect(page.getByText('Đã xử lý gần đây')).toBeVisible();

  // Customer file from the customers tab.
  // The CRM module has its own "Hồ sơ khách" tab; this one is inside the old screen.
  await page.locator('.crm-panel .crm-panel').getByRole('tab', { name: 'Hồ sơ khách' }).click();
  await page.locator('tbody tr', { hasText: 'Khách Sinh Nhật' }).click();
  await expect(page.getByRole('heading', { name: 'Khách Sinh Nhật' })).toBeVisible();
  await page.getByRole('tab', { name: 'Chăm sóc', exact: true }).click();
  await page.getByLabel('Nội dung ghi chú').fill('Quan tâm thẻ tháng');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByRole('tab', { name: 'Lịch sử' }).click();
  await expect(page.getByText('Quan tâm thẻ tháng')).toBeVisible();

  // The automatic flows and their message templates.
  await page.getByRole('tab', { name: 'Thiết lập' }).click();
  await page.getByRole('button', { name: 'Quy trình tự động' }).click();
  await expect(page.getByText('Chúc mừng sinh nhật').first()).toBeVisible();
  await page.getByLabel('Chi tiêu từ (đồng) thì gắn nhóm VIP').fill('8000000');
  await page.getByRole('button', { name: 'Lưu quy trình' }).click();
  await expect(page.getByText('Đã lưu quy trình chăm sóc')).toBeVisible();
});
