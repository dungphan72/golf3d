import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRM_RULES,
  crmInput,
  crmSettings,
  renderTemplate,
  segmentsOf,
  ruleName,
} from '../lib/crm.ts';
import { can } from '../lib/auth/permissions.ts';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-05T10:00:00+07:00');

test('every flow has a template with only known placeholders and a sane default parameter', () => {
  const known = new Set(['ten', 'cs', 'ngay', 'goi', 'han', 'con', 'so_ngay', 'diem', 'dich_vu']);
  for (const r of CRM_RULES) {
    for (const m of r.template.matchAll(/\{([a-z_]+)\}/g))
      assert.ok(known.has(m[1]), `${r.id} {${m[1]}}`);
    if (r.param) assert.ok(r.def.value >= r.param.min && r.def.value <= r.param.max, r.id);
    assert.ok(r.template.length >= 20 && r.template.length <= 500);
  }
});

test('templates fill known placeholders and leave unknown ones visible', () => {
  assert.equal(
    renderTemplate('Chào {ten}, {goi} hết hạn {han} {sai}', {
      ten: 'An',
      goi: 'Gói 10 giờ',
      han: '12/11/2026',
    }),
    'Chào An, Gói 10 giờ hết hạn 12/11/2026 {sai}',
  );
});

test('stored settings are merged over the defaults', () => {
  const s = crmSettings({
    rules: { thanks: { enabled: false, value: 48 } } as never,
    templates: {} as never,
  });
  assert.equal(s.rules.thanks.enabled, false);
  assert.equal(s.rules.thanks.value, 48);
  assert.equal(s.rules.comeback.enabled, true);
  assert.equal(s.rules.comeback.value, 30);
  assert.ok(s.templates.welcome.includes('{ten}'));
  assert.equal(crmSettings(null).vipSpend, 10_000_000);
});

test('customer segments follow the visit history', () => {
  const s = crmSettings();
  const seg = (o: Partial<Parameters<typeof segmentsOf>[0]>) =>
    segmentsOf(
      {
        created: NOW - 200 * DAY,
        visits: 3,
        lastVisit: NOW - DAY,
        spend: 1_000_000,
        recentVisits: 2,
        ...o,
      },
      s,
      NOW,
    );
  assert.deepEqual(seg({}), []);
  assert.ok(seg({ visits: 0, lastVisit: null }).includes('idle'));
  assert.ok(seg({ visits: 1, created: NOW - 5 * DAY }).includes('new'));
  assert.ok(seg({ recentVisits: 5 }).includes('loyal'));
  assert.ok(seg({ spend: 12_000_000 }).includes('vip'));
  assert.ok(seg({ lastVisit: NOW - 40 * DAY }).includes('lapsing'));
  assert.ok(seg({ lastVisit: NOW - 70 * DAY }).includes('dormant'));
  assert.ok(!seg({ lastVisit: NOW - 70 * DAY }).includes('lapsing'));
});

test('crm input needs a channel, a reason and a valid birthday', () => {
  assert.ok(
    crmInput.safeParse({ action: 'task-done', id: 't1', channel: 'call', note: 'Đã hẹn' }).success,
  );
  for (const bad of [
    { action: 'task-done', id: 't1', channel: 'pigeon' },
    { action: 'task-skip', id: 't1', reason: 'a' },
    { action: 'task-snooze', id: 't1', days: 0 },
    { action: 'birthday-set', customerId: 'c1', birthday: '17/05/1990' },
    { action: 'note-add', customerId: 'c1', channel: 'call', content: '' },
    { action: 'task-done', id: 't1', channel: 'call', extra: 1 },
  ])
    assert.ok(!crmInput.safeParse(bad).success, JSON.stringify(bad));
  for (const ok of ['1990-05-17', '05-17', ''])
    assert.ok(
      crmInput.safeParse({ action: 'birthday-set', customerId: 'c1', birthday: ok }).success,
      ok,
    );
  assert.equal(ruleName('pkg_low'), 'Gói sắp hết giờ');
  assert.equal(ruleName('manual'), 'Việc thêm tay');
});

test('care staff can work the CRM but only managers change the flows', () => {
  for (const role of ['owner', 'manager', 'cskh', 'sale', 'cashier'] as const) {
    assert.ok(can(role, 'crm.view') && can(role, 'crm.work'), role);
  }
  assert.ok(!can('coach', 'crm.view'));
  assert.ok(can('owner', 'crm.manage') && can('manager', 'crm.manage'));
  for (const role of ['cskh', 'sale', 'cashier', 'coach'] as const)
    assert.ok(!can(role, 'crm.manage'), role);
});
