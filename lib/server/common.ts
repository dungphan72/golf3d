import { env } from 'cloudflare:workers';
import { defaults, type Config } from '../club';
import { upgradeConfig } from '../pricing';

export type ServiceResult = { status: number; body: Record<string, unknown> };
export const ok = (extra: Record<string, unknown> = {}): ServiceResult => ({
  status: 200,
  body: { ok: true, ...extra },
});
export const fail = (message: string, status = 400): ServiceResult => ({
  status,
  body: { error: message },
});
export function db() {
  if (!env.DB) throw new Error('Cơ sở dữ liệu chưa kết nối');
  return env.DB;
}
export async function loadConfig(tenant: string): Promise<Config> {
  const row = await db()
    .prepare('SELECT value FROM settings WHERE tenant=?')
    .bind(tenant)
    .first<{ value: string }>();
  return upgradeConfig(row ? JSON.parse(row.value) : {}, defaults);
}
export async function audit(tenant: string, action: string, detail: string) {
  await db()
    .prepare('INSERT INTO audit VALUES (?,?,?,?,?)')
    .bind(crypto.randomUUID(), tenant, action, detail, Date.now())
    .run();
}
