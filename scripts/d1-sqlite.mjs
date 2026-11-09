import { DatabaseSync } from 'node:sqlite';

export function createD1Database(sqlitePath) {
  const db = new DatabaseSync(sqlitePath);

  function wrapStatement(sql, boundValues = []) {
    return {
      bind(...values) {
        return wrapStatement(sql, values);
      },
      async first(col) {
        const stmt = db.prepare(sql);
        const row = stmt.get(...boundValues);
        if (!row) return null;
        if (col && typeof col === 'string') return row[col];
        return row;
      },
      async all() {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...boundValues);
        return {
          results: rows,
          success: true,
          meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'node:sqlite' }
        };
      },
      async run() {
        const stmt = db.prepare(sql);
        const info = stmt.run(...boundValues);
        return {
          results: [],
          success: true,
          meta: {
            duration: 0,
            changes: info.changes,
            last_row_id: Number(info.lastInsertRowid),
            served_by: 'node:sqlite'
          }
        };
      },
      async raw() {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...boundValues);
        return rows.map(r => Object.values(r));
      }
    };
  }

  return {
    prepare(query) {
      return wrapStatement(query, []);
    },
    async batch(statements) {
      const results = [];
      db.exec('BEGIN TRANSACTION');
      try {
        for (const s of statements) {
          results.push(await s.run());
        }
        db.exec('COMMIT');
        return results;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    async exec(query) {
      db.exec(query);
      return { count: 0, duration: 0 };
    }
  };
}
