// Deploys the built app to the owner's own Cloudflare account (Workers + D1), outside OpenAI Sites.
//
//   pnpm build
//   D1_DATABASE_ID=<uuid from `wrangler d1 create golf3d`> node scripts/deploy-cloudflare.mjs [--dry-run]
//
// It derives dist/server/wrangler.deploy.json from the generated wrangler.json: real D1 id, the
// DISABLE_SITES_IDENTITY switch (mandatory off-Sites, see docs/DEPLOY-CLOUDFLARE.md) and an optional
// custom domain. Nothing secret is written to the repository.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const generated = resolve(root, 'dist/server/wrangler.json');
if (!existsSync(generated))
  throw new Error('Run `pnpm build` first (dist/server/wrangler.json is missing).');

const dryRun = process.argv.includes('--dry-run');
const databaseId = process.env.D1_DATABASE_ID;
if (!databaseId && !dryRun)
  throw new Error('Set D1_DATABASE_ID (from `wrangler d1 create golf3d`).');
if (
  databaseId &&
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseId)
)
  throw new Error('D1_DATABASE_ID must be a UUID.');

const config = JSON.parse(readFileSync(generated, 'utf8'));
config.name = process.env.WORKER_NAME || 'golf3d';
config.d1_databases = [
  {
    binding: 'DB',
    database_name: process.env.D1_DATABASE_NAME || 'golf3d',
    database_id: databaseId || '00000000-0000-4000-8000-000000000000',
    migrations_dir: resolve(root, 'drizzle'),
  },
];
config.vars = {
  ...(config.vars ?? {}),
  DISABLE_SITES_IDENTITY: '1',
  ...(process.env.PUBLIC_BASE_URL ? { PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL } : {}),
  ...(process.env.TURNSTILE_SITE_KEY ? { TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY } : {}),
};
// Background work (reminders, task alerts) runs from Cloudflare itself, so no outside scheduler or secret is needed.
config.triggers = { crons: ['*/5 * * * *'] };
config.workers_dev = process.env.CUSTOM_DOMAIN ? false : true;
if (process.env.CUSTOM_DOMAIN)
  config.routes = [{ pattern: process.env.CUSTOM_DOMAIN, custom_domain: true }];

const out = resolve(root, 'dist/server/wrangler.deploy.json');
writeFileSync(out, JSON.stringify(config, null, 2));
console.log('Wrote', out);

const args = [
  'exec',
  'wrangler',
  'deploy',
  '--config',
  out,
  ...(dryRun ? ['--dry-run', '--outdir', resolve(root, 'dist/dry-run')] : []),
];
const result = spawnSync('pnpm', args, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
