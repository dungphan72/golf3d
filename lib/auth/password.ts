// Password hashing with WebCrypto PBKDF2 (works in Node, Cloudflare Workers and Vercel).
// 100k iterations is the maximum Cloudflare Workers allows; the count is stored with the hash
// so it can be raised later without invalidating existing passwords.
const ITERATIONS = 100_000;
const MIN_LENGTH = 8;
/** Staff accounts can read and export every customer record, so they need a longer password than members. */
export const STAFF_MIN_LENGTH = 10;
const MAX_LENGTH = 200;
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'passw0rd',
  'qwerty123',
  'qwertyuiop',
  'iloveyou',
  '12345678',
  '123456789',
  '1234567890',
  '11111111',
  '00000000',
  'abc12345',
  'abcd1234',
  'admin123',
  'admin1234',
  'letmein1',
  'welcome1',
  'matkhau123',
  'matkhau1',
  'golf1234',
  'golf3d123',
  'saigongolf',
  'saigon123',
]);

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
export const validEmail = (email: string) =>
  email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Returns a Vietnamese error message, or null when the password is acceptable. */
export function passwordProblem(
  password: string,
  email = '',
  minLength = MIN_LENGTH,
): string | null {
  if (password.length < minLength) return `Mật khẩu cần ít nhất ${minLength} ký tự`;
  if (password.length > MAX_LENGTH) return 'Mật khẩu quá dài';
  if (email && password.toLowerCase() === email.toLowerCase())
    return 'Mật khẩu không được trùng email';
  if (/^(.)\1+$/.test(password)) return 'Mật khẩu quá đơn giản';
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(?:0?123456789?|abcdefgh?|qwertyui)/.test(lower))
    return 'Mật khẩu quá phổ biến, hãy chọn mật khẩu khác';
  // The email's name part with digits or symbols added is still easy to guess.
  const letters = (v: string) => v.toLowerCase().replace(/[^a-z]/g, '');
  const local = letters(email.split('@')[0] ?? '');
  if (local.length >= 4 && letters(password) === local)
    return 'Mật khẩu không được chỉ là phần tên trong email';
  return null;
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split('$');
  const rounds = Number(iterations);
  if (scheme !== 'pbkdf2' || !Number.isInteger(rounds) || rounds < 1 || !salt || !hash)
    return false;
  let actual: Uint8Array, expected: Uint8Array;
  try {
    actual = await derive(password, fromBase64(salt), rounds);
    expected = fromBase64(hash);
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function newToken() {
  return toBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
export async function tokenId(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toBase64(new Uint8Array(digest));
}
/** Throwaway initial password for newly created staff (shown once to the manager). */
export function temporaryPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
