import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBody, composeBody, tournamentStatus } from '../lib/tournament.ts';

test('nội dung giải đấu: tách và ghép lại các đoạn có nhãn mà không mất chữ', () => {
  const s = {
    other: 'Giải thường niên của câu lạc bộ.\nMở cho mọi golfer.',
    format: 'Stroke Play 18 hố',
    prizes: 'Nhất: cúp\nNhì: 10 giờ tập',
    rules: 'Handicap tối đa 36',
  };
  const body = composeBody(s);
  assert.deepEqual(parseBody(body), s);
  assert.equal(composeBody(parseBody(body)), body);
});

test('bài cũ không có nhãn: toàn bộ chữ nằm ở mục khác và giữ nguyên khi lưu lại', () => {
  const old = 'Đoạn một.\n\nĐoạn hai về giải.';
  const p = parseBody(old);
  assert.equal(p.format + p.prizes + p.rules, '');
  assert.equal(composeBody(p), old);
});

test('đoạn trống không sinh nhãn', () => {
  assert.equal(composeBody({ other: '', format: '', prizes: 'Cúp', rules: '' }), 'Giải thưởng: Cúp');
});

test('trạng thái giải đấu theo ngày thi đấu giờ Việt Nam', () => {
  const at = (s: string) => Date.parse(s + '+07:00');
  const now = at('2026-11-16T10:00:00');
  assert.equal(tournamentStatus({ status: 'draft', event_at: at('2026-11-20T08:00:00') }, now), 'draft');
  assert.equal(tournamentStatus({ status: 'published', event_at: at('2026-11-16T06:00:00') }, now), 'live');
  assert.equal(tournamentStatus({ status: 'published', event_at: at('2026-11-16T23:30:00') }, now), 'live');
  assert.equal(tournamentStatus({ status: 'published', event_at: at('2026-11-17T00:10:00') }, now), 'upcoming');
  assert.equal(tournamentStatus({ status: 'published', event_at: at('2026-11-15T20:00:00') }, now), 'ended');
});
