import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
for (const major of [1, 5]) {
  const version = pkg.overrides['brace-expansion@' + major];
  const expansion = require(
    path.resolve('node_modules/.pnpm/brace-expansion@' + version + '/node_modules/brace-expansion'),
  );
  const expand = typeof expansion === 'function' ? expansion : expansion.expand;
  test(`brace expansion ${major} preserves normal patterns and bounds deep nesting`, () => {
    assert.deepEqual(expand('room-{1..3}'), ['room-1', 'room-2', 'room-3']);
    assert.deepEqual(expand('{vip,line}-{a,b}'), ['vip-a', 'vip-b', 'line-a', 'line-b']);
    const deep = '{'.repeat(4000) + 'a,b' + '}'.repeat(4000);
    assert.deepEqual(expand(deep), [deep]);
  });
}
const eslintRequire = createRequire(require.resolve('eslint'));
const configRequire = createRequire(eslintRequire.resolve('@eslint/eslintrc'));
const yaml = configRequire('js-yaml');
test('ESLint YAML parser preserves config and counts empty merge sources', () => {
  assert.deepEqual(yaml.load('rules:\n  no-console: warn\n'), { rules: { 'no-console': 'warn' } });
  assert.throws(
    () => yaml.load('a: &a [{}, {}, {}]\nb:\n  <<: *a', { maxTotalMergeKeys: 1 }),
    /maxTotalMergeKeys/,
  );
});
