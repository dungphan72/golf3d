import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createD1Database } from './d1-sqlite.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');

// Find the D1 sqlite database
let dbPath = null;
const d1Dir = path.join(projectRoot, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
if (fs.existsSync(d1Dir)) {
  for (const f of fs.readdirSync(d1Dir)) {
    if (f.endsWith('.sqlite') && f !== 'metadata.sqlite') {
      dbPath = path.join(d1Dir, f);
      break;
    }
  }
}

if (!dbPath) {
  throw new Error(`Could not find D1 SQLite database in ${d1Dir}`);
}

const DB = createD1Database(dbPath);

export const env = {
  DB,
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'https://golfhub.cloud',
  DISABLE_SITES_IDENTITY: '1',
  ...(process.env.TRUST_PROXY ? { TRUST_PROXY: process.env.TRUST_PROXY } : {}),
};
