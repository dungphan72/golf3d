import fs from 'node:fs';
import path from 'node:path';
import { env } from './cf-mock.mjs';

async function migrate() {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS _d1_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    )
  `).run();

  const drizzleDir = path.resolve('drizzle');
  const files = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await env.DB.prepare('SELECT id FROM _d1_migrations WHERE name = ?')
      .bind(file)
      .first();

    if (applied) {
      continue;
    }

    console.log(`[Migration] Applying ${file}...`);
    const sql = fs.readFileSync(path.join(drizzleDir, file), 'utf8');
    const stmts = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of stmts) {
      try {
        await env.DB.prepare(stmt).run();
      } catch (err) {
        const msg = String(err?.message || '');
        if (msg.includes('already exists') || msg.includes('duplicate column')) {
          // Table/index/column already created previously
          continue;
        }
        throw err;
      }
    }

    await env.DB.prepare('INSERT INTO _d1_migrations (name, applied_at) VALUES (?, ?)')
      .bind(file, Date.now())
      .run();

    console.log(`[Migration] Applied ${file} (${stmts.length} statements).`);
  }

  console.log('[Migration] All migrations up to date.');
}

migrate().catch((err) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
