// Generates SQL that creates the first owner login for a cabinet (needed once after leaving
// OpenAI Sites, where the owner was identified by the platform).
//
//   OWNER_PASSWORD='...' node scripts/create-owner.mjs --tenant <tenant-id> --email me@x.vn --name "Chủ" > owner.sql
//   pnpm exec wrangler d1 execute golf3d --remote --file owner.sql
//
// The tenant id must equal the existing data's tenant (see the `tenant` column in the backup).
import {
  hashPassword,
  normalizeEmail,
  validEmail,
  passwordProblem,
  temporaryPassword,
} from '../lib/auth/password.ts';
import { literal } from './sql-util.mjs';

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const tenant = arg('tenant');
const email = normalizeEmail(arg('email') ?? '');
const name = (arg('name') ?? '').trim();
// --generate: random temporary password (printed to stderr once) that must be changed at first login.
const generate = process.argv.includes('--generate');
const password = generate ? temporaryPassword() : (process.env.OWNER_PASSWORD ?? '');
if (!tenant || !/^[\w.:-]{1,100}$/.test(tenant)) throw new Error('--tenant is required');
if (!validEmail(email)) throw new Error('--email is invalid');
if (name.length < 2) throw new Error('--name is required');
const problem = generate ? null : passwordProblem(password, email);
if (problem) throw new Error('OWNER_PASSWORD: ' + problem);

const id = crypto.randomUUID();
const now = Date.now();
process.stdout.write(
  [
    `INSERT INTO users(id,email,name,password_hash,must_change,created) VALUES (${literal(id)},${literal(email)},${literal(name)},${literal(await hashPassword(password))},${generate ? 1 : 0},${now});`,
    `INSERT INTO memberships(user_id,tenant,role,created) VALUES (${literal(id)},${literal(tenant)},'owner',${now});`,
    '',
  ].join('\n'),
);
if (generate)
  console.error('Temporary password (shown once, must be changed at first login): ' + password);
