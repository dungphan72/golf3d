import assert from 'node:assert/strict';
import test from 'node:test';
import { createDecipheriv, createHmac, createPublicKey, verify, webcrypto } from 'node:crypto';
import {
  b64u,
  encryptPayload,
  generateVapid,
  unb64u,
  vapidAuthorization,
} from '../lib/webpush-crypto.ts';

const hmac = (key: Uint8Array, data: Uint8Array) => createHmac('sha256', key).update(data).digest();

// Plays the browser: derives the keys the way RFC 8291 section 3.4 describes (HMAC based, written
// separately from the sender's WebCrypto HKDF) and opens the message.
async function userAgent() {
  const pair = (await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const pub = new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey));
  const auth = webcrypto.getRandomValues(new Uint8Array(16));
  return {
    sub: { endpoint: 'https://push.example/x', p256dh: b64u(pub), auth: b64u(auth) },
    async open(body: Uint8Array) {
      const salt = body.slice(0, 16);
      assert.equal(new DataView(body.buffer, body.byteOffset).getUint32(16), 4096);
      const idLen = body[20];
      const asPub = body.slice(21, 21 + idLen);
      const cipher = body.slice(21 + idLen);
      const asKey = await webcrypto.subtle.importKey(
        'raw',
        asPub,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        [],
      );
      const secret = new Uint8Array(
        await webcrypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, pair.privateKey, 256),
      );
      const prkKey = hmac(auth, secret);
      const info = Buffer.concat([Buffer.from('WebPush: info\0'), pub, asPub, Buffer.from([1])]);
      const ikm = hmac(prkKey, info);
      const prk = hmac(salt, ikm);
      const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
      const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
      const d = createDecipheriv('aes-128-gcm', cek, nonce);
      d.setAuthTag(Buffer.from(cipher.slice(-16)));
      const plain = Buffer.concat([d.update(cipher.slice(0, -16)), d.final()]);
      assert.equal(plain.at(-1), 2, 'single record ends with the 0x02 delimiter');
      return plain.subarray(0, -1).toString('utf8');
    },
  };
}

test('a push payload opens only with the subscriber keys and round-trips', async () => {
  const ua = await userAgent();
  const message = JSON.stringify({ title: '🔔 Line 03 gọi phục vụ', body: 'Gọi đồ uống' });
  const body = await encryptPayload(ua.sub, message);
  assert.ok(body.length < 4096);
  assert.equal(await ua.open(body), message);
  // Fresh salt and ephemeral key every time.
  const other = await encryptPayload(ua.sub, message);
  assert.notDeepEqual(Buffer.from(body), Buffer.from(other));
  // Someone else cannot open it.
  const stranger = await userAgent();
  await assert.rejects(() => stranger.open(body));
});

test('VAPID Authorization carries an ES256 JWT for the push service origin', async () => {
  const keys = await generateVapid();
  const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', keys);
  const [, t, k] = /^vapid t=([^,]+), k=(.+)$/.exec(header) ?? [];
  assert.equal(k, keys.publicKey);
  const [h, c, sig] = t.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(unb64u(h)).toString()), { typ: 'JWT', alg: 'ES256' });
  const claims = JSON.parse(Buffer.from(unb64u(c)).toString());
  assert.equal(claims.aud, 'https://fcm.googleapis.com');
  assert.ok(claims.exp > Date.now() / 1000 && claims.exp <= Date.now() / 1000 + 24 * 3600);
  const pub = createPublicKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: b64u(unb64u(keys.publicKey).slice(1, 33)),
      y: b64u(unb64u(keys.publicKey).slice(33, 65)),
    },
    format: 'jwk',
  });
  assert.ok(
    verify(
      'sha256',
      Buffer.from(`${h}.${c}`),
      { key: pub, dsaEncoding: 'ieee-p1363' },
      Buffer.from(unb64u(sig)),
    ),
  );
});
