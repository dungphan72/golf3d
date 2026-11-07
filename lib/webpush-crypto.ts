// Web Push cryptography (VAPID RFC 8292, aes128gcm RFC 8188/8291) on WebCrypto only, so it runs in Workers and Node.
const enc = new TextEncoder();
export const b64u = (b: ArrayBuffer | Uint8Array) => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = '';
  for (const c of bytes) s += String.fromCharCode(c);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};
export const unb64u = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const concat = (...parts: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

export type PushSub = { endpoint: string; p256dh: string; auth: string };

/** Generates a VAPID key pair: base64url public key plus the private key as JWK. */
export async function generateVapid() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
  ])) as CryptoKeyPair;
  return {
    publicKey: b64u(await crypto.subtle.exportKey('raw', pair.publicKey)),
    privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
  };
}

/** Value of the Authorization header for a push to this endpoint. */
export async function vapidAuthorization(
  endpoint: string,
  keys: { publicKey: string; privateJwk: JsonWebKey },
) {
  const { publicKey, privateJwk } = keys;
  const key = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: 'mailto:noreply@golf3d.invalid',
      }),
    ),
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(`${head}.${claims}`),
  );
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${publicKey}`;
}

type Bytes = Uint8Array<ArrayBuffer>;
const hkdf = async (salt: Bytes, ikm: Bytes, info: Bytes, bytes: number) => {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bytes * 8),
  );
};

export async function encryptPayload(sub: PushSub, payload: string) {
  const ua = unb64u(sub.p256dh);
  const authSecret = unb64u(sub.auth);
  const eph = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey(
    'raw',
    ua,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const secret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256),
  );
  const ikm = await hkdf(
    authSecret,
    secret,
    concat(enc.encode('WebPush: info\0'), ua, asPublic),
    32,
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const body = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aes,
      concat(enc.encode(payload), new Uint8Array([2])),
    ),
  );
  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, body);
}
