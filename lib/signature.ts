/** Webhook signature checks (pure, so they can be tested without the Worker runtime). */
export async function hmacHex(secretKey: string, data: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function sha256Hex(data: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}
const same = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};
/** Facebook signs the raw body: `X-Hub-Signature-256: sha256=<hmac>` with the app secret. */
export async function facebookSignatureValid(
  rawBody: string,
  header: string | null,
  appSecret: string,
) {
  if (!appSecret || !header) return false;
  return same(header.replace(/^sha256=/, ''), await hmacHex(appSecret, rawBody));
}
/** Zalo OA signs: `X-ZEvent-Signature: mac=sha256(appId + body + timestamp + secret)`. */
export async function zaloSignatureValid(
  rawBody: string,
  header: string | null,
  timestamp: string,
  appId: string,
  appSecret: string,
) {
  if (!appId || !appSecret || !header) return false;
  return same(
    header.replace(/^mac=/, ''),
    await sha256Hex(appId + rawBody + timestamp + appSecret),
  );
}
