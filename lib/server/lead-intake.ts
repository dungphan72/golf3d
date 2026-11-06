import { db } from './common';
import { tokenId, newToken } from '../auth/password';
import { ingestLead } from './lead-service';
import type { LeadInput } from '../leads';

/** Webhook tokens: only a hash is stored, the token is shown once when created. */
const PROVIDERS = { website: 'lead_website', ads: 'lead_ads' } as const;
export type TokenKind = keyof typeof PROVIDERS;
const hash = (provider: string, token: string) => tokenId(provider + ':' + token);

export async function rotateToken(tenant: string, kind: TokenKind) {
  const provider = PROVIDERS[kind];
  const token = 'lk_' + newToken();
  await db()
    .prepare(
      'INSERT INTO integrations(tenant,provider,key_hash,updated) VALUES (?,?,?,?) ON CONFLICT(tenant,provider) DO UPDATE SET key_hash=excluded.key_hash,updated=excluded.updated',
    )
    .bind(tenant, provider, await hash(provider, token), Date.now())
    .run();
  return token;
}
export async function tokenStatus(tenant: string) {
  const rows = (
    await db()
      .prepare(
        "SELECT provider FROM integrations WHERE tenant=? AND provider IN ('lead_website','lead_ads')",
      )
      .bind(tenant)
      .all<{ provider: string }>()
  ).results;
  return {
    website: rows.some((r) => r.provider === 'lead_website'),
    ads: rows.some((r) => r.provider === 'lead_ads'),
  };
}
/** The club that owns a webhook token, or null. */
export async function tenantForToken(kind: TokenKind, token: string | null) {
  if (!token || token.length < 20 || token.length > 200) return null;
  const provider = PROVIDERS[kind];
  const row = await db()
    .prepare('SELECT tenant FROM integrations WHERE provider=? AND key_hash=?')
    .bind(provider, await hash(provider, token))
    .first<{ tenant: string }>();
  return row?.tenant ?? null;
}

export async function intake(tenant: string, input: LeadInput, base: string, now: number) {
  return ingestLead(tenant, input, base, now);
}
