// After deploying: confirm clients cannot dodge rate limits by forging CF-Connecting-IP.
// Usage: node scripts/verify-ratelimit.mjs https://golfhub.cloud
// Sends 25 wrong logins with a different forged CF-Connecting-IP each time. PASS = a 429 appears.
const base = process.argv[2];
if (!base) throw new Error('usage: node scripts/verify-ratelimit.mjs <base-url>');
let blocked = false;
for (let i = 0; i < 25; i++) {
  const r = await fetch(new URL('/api/auth/login', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': `203.0.113.${i + 1}` },
    body: JSON.stringify({ email: `probe${i}@example.com`, password: 'wrong-password-' + i }),
  });
  if (r.status === 429) {
    blocked = true;
    console.log(`429 after ${i + 1} attempts`);
    break;
  }
}
console.log(blocked ? 'PASS: forged CF-Connecting-IP does not bypass the limit' : 'FAIL: rate limit bypassed');
process.exit(blocked ? 0 : 1);
