import { db } from './common';
import { encryptPayload, generateVapid, vapidAuthorization, type PushSub } from '../webpush-crypto';

/** The deployment's VAPID key pair; created the first time it is needed. */
export async function vapidKeys(): Promise<{ publicKey: string; privateJwk: JsonWebKey }> {
  const row = await db()
    .prepare("SELECT public_key,private_jwk FROM push_keys WHERE id='vapid'")
    .first<{ public_key: string; private_jwk: string }>();
  if (row)
    return { publicKey: row.public_key, privateJwk: JSON.parse(row.private_jwk) as JsonWebKey };
  const fresh = await generateVapid();
  // A concurrent first call may insert first; read back whichever row won.
  await db()
    .prepare("INSERT OR IGNORE INTO push_keys VALUES ('vapid',?,?,?)")
    .bind(fresh.publicKey, JSON.stringify(fresh.privateJwk), Date.now())
    .run();
  return vapidKeys();
}

/** Pushes to every subscription of the tenant; dead endpoints (404/410) are dropped. Never throws. */
export async function pushToTenant(
  tenant: string,
  message: { title: string; body: string; url: string },
) {
  try {
    const subs = (
      await db()
        .prepare('SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE tenant=? LIMIT 50')
        .bind(tenant)
        .all<PushSub>()
    ).results;
    const keys = await vapidKeys();
    await Promise.allSettled(
      subs.map(async (s) => {
        const res = await fetch(s.endpoint, {
          method: 'POST',
          headers: {
            Authorization: await vapidAuthorization(s.endpoint, keys),
            'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream',
            TTL: '300',
            Urgency: 'high',
          },
          body: await encryptPayload(s, JSON.stringify(message)),
        });
        if (res.status === 404 || res.status === 410)
          await db()
            .prepare('DELETE FROM push_subscriptions WHERE endpoint=?')
            .bind(s.endpoint)
            .run();
      }),
    );
  } catch (e) {
    console.error('push', e);
  }
}
