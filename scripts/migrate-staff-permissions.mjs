import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const sql = `CREATE TABLE IF NOT EXISTS staff_permissions (
  tenant text NOT NULL,
  user_id text NOT NULL,
  permissions text NOT NULL,
  updated_by text NOT NULL,
  updated_at integer NOT NULL,
  PRIMARY KEY (tenant, user_id)
);`;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...scanDir(full));
    else if (e.name.endsWith('.sqlite') && !e.name.includes('metadata') && !e.name.includes('bak')) files.push(full);
  }
  return files;
}

const allSqlite = [
  ...scanDir('.wrangler'),
  ...scanDir('.e2e-state'),
  ...scanDir('/var/www/app-golf3d/.wrangler'),
];

console.log('Found SQLite files:', allSqlite);
for (const p of allSqlite) {
  try {
    const db = new DatabaseSync(p);
    db.exec(sql);
    console.log('Successfully migrated staff_permissions in:', p);
  } catch (err) {
    console.error(`Failed on ${p}:`, err.message);
  }
}
