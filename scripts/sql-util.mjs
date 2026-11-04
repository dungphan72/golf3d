// Small helpers for generating SQL text for `wrangler d1 execute --file`.
export function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite number in backup');
    return String(value);
  }
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  throw new Error('Unsupported value in backup: ' + typeof value);
}
export function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error('Unsafe identifier: ' + name);
  return '"' + name + '"';
}
