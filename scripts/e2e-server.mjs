// Starts the built Worker against a brand-new local D1 for end-to-end tests.
// Requires `pnpm build` first. State lives in .e2e-state (ignored by git).
import { spawn, spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const state = resolve(root, '.e2e-state');
const config = 'dist/server/wrangler.deploy.json';
const shell = process.platform === 'win32';
const run = (args, options = {}) =>
  spawnSync('pnpm', ['exec', ...args], { cwd: root, shell, encoding: 'utf8', ...options });

rmSync(state, { recursive: true, force: true });
let result = spawnSync('node', ['scripts/deploy-cloudflare.mjs', '--dry-run'], {
  cwd: root,
  stdio: 'ignore',
});
if (result.status !== 0)
  throw new Error('Could not derive the deploy config (did you run pnpm build?)');
result = run([
  'wrangler',
  'd1',
  'migrations',
  'apply',
  'DB',
  '--local',
  '--config',
  config,
  '--persist-to',
  state,
]);
if (result.status !== 0) throw new Error('Migrations failed:\n' + result.stdout + result.stderr);

// Known owner for the tests (never used outside this throwaway database).
const owner = spawnSync(
  'node',
  [
    'scripts/create-owner.mjs',
    '--tenant',
    'e2e-tenant',
    '--email',
    'owner@e2e.test',
    '--name',
    'Chủ E2E',
  ],
  { cwd: root, encoding: 'utf8', env: { ...process.env, OWNER_PASSWORD: 'e2e-owner-password' } },
);
if (owner.status !== 0) throw new Error(owner.stderr);
const sqlFile = resolve(state, 'owner.sql');
writeFileSync(sqlFile, owner.stdout);
result = run([
  'wrangler',
  'd1',
  'execute',
  'DB',
  '--local',
  '--config',
  config,
  '--persist-to',
  state,
  '--file',
  sqlFile,
]);
if (result.status !== 0) throw new Error('Owner seed failed:\n' + result.stdout + result.stderr);

const server = spawn(
  'pnpm',
  [
    'exec',
    'wrangler',
    'dev',
    '--config',
    config,
    '--local',
    '--persist-to',
    state,
    '--port',
    '8787',
    '--ip',
    '127.0.0.1',
    // Lets tests act as different visitors for per-IP limits (never set in production).
    '--var',
    'TRUST_FORWARDED_IP:1',
  ],
  { cwd: root, shell, stdio: 'inherit' },
);
const stop = () => server.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => process.exit(code ?? 0));
