import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARE_RULES,
  MARKETING_RULES,
  careMessage,
  careRuleName,
  careSettings,
  renderTemplate,
} from '../modules/crm/core/care.ts';

test('settings fall back to defaults and clamp what is stored', () => {
  const d = careSettings(undefined);
  assert.equal(d.rules.comeback.value, 30);
  assert.equal(d.rules.welcome.enabled, true);
  assert.equal(d.vipSpend, 10_000_000);
  const s = careSettings({
    rules: { comeback: { enabled: false, value: 9999 }, welcome: { value: -5 } },
    templates: { thanks: 'ngắn', welcome: 'Xin chào {ten}, mời anh/chị ghé {cs}' },
    vipSpend: -1,
  });
  assert.deepEqual(s.rules.comeback, { enabled: false, value: 365 }); // clamped to the rule's maximum
  assert.equal(s.rules.welcome.value, 0); // clamped to the minimum
  assert.equal(s.templates.thanks, CARE_RULES[1].template); // too short: default kept
  assert.equal(s.templates.welcome, 'Xin chào {ten}, mời anh/chị ghé {cs}');
  assert.equal(s.vipSpend, 10_000_000);
});

test('templates fill known placeholders and leave typos visible', () => {
  assert.equal(renderTemplate('Chào {ten}, {abc}', { ten: 'An' }), 'Chào An, {abc}');
});

test('the message uses the task facts, the club name and the package balances', () => {
  const s = careSettings(undefined);
  const msg = careMessage(
    {
      rule: 'pkg_expiring',
      name: 'Bình',
      data: JSON.stringify({
        ten: 'Bình',
        goi: 'Combo 9 hố',
        han: '30/11/2026',
        balances: [{ kind: 'holes9', remaining: 4 }],
      }),
    },
    s,
    'Saigon Golf',
  );
  assert.match(msg, /Chào Bình/);
  assert.match(msg, /Combo 9 hố/);
  assert.match(msg, /30\/11\/2026/);
  assert.match(msg, /4 /);
  assert.doesNotMatch(msg, /\{/);
  // Damaged data never throws: the placeholders just come out empty.
  assert.doesNotThrow(() =>
    careMessage({ rule: 'welcome', name: 'An', data: 'không phải json' }, s, 'CLB'),
  );
});

test('rule names and which rules are promotions', () => {
  assert.equal(careRuleName('welcome'), 'Chào mừng khách mới');
  assert.equal(careRuleName('complaint'), 'Xử lý phản ánh');
  assert.equal(careRuleName('lạ'), 'lạ');
  assert.ok(MARKETING_RULES.has('comeback'));
  assert.ok(!MARKETING_RULES.has('welcome'));
  assert.ok(!MARKETING_RULES.has('thanks'));
});

test('segments follow the visit history and the VIP spend', async () => {
  const { segmentsOf } = await import('../modules/crm/core/care.ts');
  const DAY = 86_400_000;
  const now = 100 * DAY;
  const base = {
    created: now - 200 * DAY,
    visits: 3,
    lastVisit: now - DAY,
    spend: 0,
    recentVisits: 1,
  };
  assert.deepEqual(segmentsOf({ ...base, visits: 0, lastVisit: null }, { vipSpend: 0 }, now), [
    'idle',
  ]);
  assert.deepEqual(
    segmentsOf({ ...base, visits: 1, created: now - 5 * DAY }, { vipSpend: 0 }, now),
    ['new'],
  );
  assert.ok(segmentsOf({ ...base, recentVisits: 5 }, { vipSpend: 0 }, now).includes('loyal'));
  assert.ok(
    segmentsOf({ ...base, spend: 10_000_000 }, { vipSpend: 10_000_000 }, now).includes('vip'),
  );
  assert.ok(!segmentsOf({ ...base, spend: 99 }, { vipSpend: 0 }, now).includes('vip')); // 0 = never tag VIP
  assert.ok(
    segmentsOf({ ...base, lastVisit: now - 40 * DAY }, { vipSpend: 0 }, now).includes('lapsing'),
  );
  assert.ok(
    segmentsOf({ ...base, lastVisit: now - 70 * DAY }, { vipSpend: 0 }, now).includes('dormant'),
  );
});
