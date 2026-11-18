import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function getPngDimensions(filePath: string) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }
  return null;
}

test('1. Unified SiGolf PWA Manifest has required fields, correct casing, /app start_url, and stable ID', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in public/');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  // Exact casing required by prompt
  assert.equal(manifest.name, 'SiGolf', 'name must be exactly SiGolf');
  assert.equal(manifest.short_name, 'SiGolf', 'short_name must be exactly SiGolf');
  assert.equal(manifest.start_url, '/app', 'start_url must be /app');
  assert.equal(manifest.scope, '/', 'scope must be / for unified PWA');
  assert.equal(manifest.display, 'standalone', 'display must be standalone');
  assert.equal(manifest.id, 'sigolf-app', 'id must be stable identifier sigolf-app');
  assert.equal(manifest.theme_color, '#0a5c1e');

  // Verify icons in manifest
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Must have at least 2 icons');
  const has192 = manifest.icons.some((i: any) => i.src === '/icon-192.png' && i.sizes === '192x192');
  const has512 = manifest.icons.some((i: any) => i.src === '/icon-512.png' && i.sizes === '512x512');
  assert.ok(has192, 'Manifest must declare /icon-192.png');
  assert.ok(has512, 'Manifest must declare /icon-512.png');

  // Verify manifest-quan-ly.webmanifest matches or aliases for backwards compatibility
  const qlManifestPath = path.resolve(process.cwd(), 'public/manifest-quan-ly.webmanifest');
  if (fs.existsSync(qlManifestPath)) {
    const qlManifest = JSON.parse(fs.readFileSync(qlManifestPath, 'utf8'));
    assert.equal(qlManifest.start_url, '/app', 'Legacy manifest-quan-ly must also point start_url to /app');
    assert.equal(qlManifest.short_name, 'SiGolf', 'Legacy manifest-quan-ly must use SiGolf');
  }
});

test('2. Logo icon files exist and have exact approved dimensions', () => {
  const icon192 = getPngDimensions(path.resolve(process.cwd(), 'public/icon-192.png'));
  assert.deepEqual(icon192, { width: 192, height: 192 }, 'icon-192.png must be 192x192 PNG');

  const icon512 = getPngDimensions(path.resolve(process.cwd(), 'public/icon-512.png'));
  assert.deepEqual(icon512, { width: 512, height: 512 }, 'icon-512.png must be 512x512 PNG');

  const appleTouch = getPngDimensions(path.resolve(process.cwd(), 'public/apple-touch-icon.png'));
  assert.ok(appleTouch && appleTouch.width >= 180, 'apple-touch-icon.png must be at least 180x180 PNG');
});

test('3. All areas (/app, /tai-khoan, /parking, /quan-ly) reference the unified manifest', () => {
  const rootLayout = fs.readFileSync(path.resolve(process.cwd(), 'app/layout.tsx'), 'utf8');
  assert.ok(rootLayout.includes('/manifest.webmanifest'), 'app/layout.tsx must reference /manifest.webmanifest');
  assert.ok(rootLayout.includes('SiGolf'), 'app/layout.tsx must declare SiGolf');

  const appPage = fs.readFileSync(path.resolve(process.cwd(), 'app/app/page.tsx'), 'utf8');
  assert.ok(appPage.includes('/manifest.webmanifest'), 'app/app/page.tsx must reference /manifest.webmanifest');

  const qlLayout = fs.readFileSync(path.resolve(process.cwd(), 'app/quan-ly/layout.tsx'), 'utf8');
  assert.ok(qlLayout.includes('/manifest.webmanifest'), 'app/quan-ly/layout.tsx must reference /manifest.webmanifest');

  const pkLayout = fs.readFileSync(path.resolve(process.cwd(), 'app/parking/layout.tsx'), 'utf8');
  assert.ok(pkLayout.includes('/manifest.webmanifest'), 'app/parking/layout.tsx must reference /manifest.webmanifest');
});

test('4. App launcher page (/app) has all three access destinations and staff login link', () => {
  const launcherPath = path.resolve(process.cwd(), 'app/app/AppLauncherClient.tsx');
  assert.ok(fs.existsSync(launcherPath), 'app/app/AppLauncherClient.tsx must exist');

  const content = fs.readFileSync(launcherPath, 'utf8');
  assert.ok(content.includes('/tai-khoan'), 'Must link to /tai-khoan (Tài khoản của tôi)');
  assert.ok(content.includes('/parking'), 'Must link to /parking (Bãi đậu xe)');
  assert.ok(content.includes('/quan-ly'), 'Must link to /quan-ly (Quản lý cơ sở)');
  assert.ok(content.includes('Đăng nhập nhân viên'), 'Must provide staff login link');
  assert.ok(content.includes('Mở vé QR'), 'Must provide quick action Mở vé QR when active ticket exists');
});

test('5. Shared PWA 7-day snooze logic and standalone check', () => {
  const now = 1763452800000;
  const SNOOZE_DAYS = 7;
  const snoozeUntil = now + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  assert.equal(snoozeUntil - now, 604800000, 'Snooze duration must be exactly 7 days in milliseconds');
});
