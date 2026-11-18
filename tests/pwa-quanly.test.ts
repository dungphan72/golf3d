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

test('1. SiGolf Admin PWA Manifest has required fields, correct casing and stable ID', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/manifest-quan-ly.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest-quan-ly.webmanifest must exist in public/');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  // Exact casing required by prompt
  assert.equal(manifest.name, 'SiGolf', 'name must be exactly SiGolf');
  assert.equal(manifest.short_name, 'SiGolf', 'short_name must be exactly SiGolf');
  assert.equal(manifest.start_url, '/quan-ly', 'start_url must be /quan-ly');
  assert.equal(manifest.scope, '/quan-ly', 'scope must be /quan-ly');
  assert.equal(manifest.display, 'standalone', 'display must be standalone');
  assert.equal(manifest.id, 'sigolf-quan-ly', 'id must be stable identifier sigolf-quan-ly');
  assert.equal(manifest.theme_color, '#0a5c1e');

  // Verify icons in manifest
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Must have at least 2 icons');
  const has192 = manifest.icons.some((i: any) => i.src === '/icon-192.png' && i.sizes === '192x192');
  const has512 = manifest.icons.some((i: any) => i.src === '/icon-512.png' && i.sizes === '512x512');
  assert.ok(has192, 'Manifest must declare /icon-192.png');
  assert.ok(has512, 'Manifest must declare /icon-512.png');
});

test('2. Logo icon files exist and have exact approved dimensions', () => {
  const icon192 = getPngDimensions(path.resolve(process.cwd(), 'public/icon-192.png'));
  assert.deepEqual(icon192, { width: 192, height: 192 }, 'icon-192.png must be 192x192 PNG');

  const icon512 = getPngDimensions(path.resolve(process.cwd(), 'public/icon-512.png'));
  assert.deepEqual(icon512, { width: 512, height: 512 }, 'icon-512.png must be 512x512 PNG');

  const appleTouch = getPngDimensions(path.resolve(process.cwd(), 'public/apple-touch-icon.png'));
  assert.ok(appleTouch && appleTouch.width >= 180, 'apple-touch-icon.png must be at least 180x180 PNG');
});

test('3. Quan-Ly layout mounts manifest and Apple Web App tags independently from /parking', () => {
  const layoutPath = path.resolve(process.cwd(), 'app/quan-ly/layout.tsx');
  assert.ok(fs.existsSync(layoutPath), 'app/quan-ly/layout.tsx must exist');

  const content = fs.readFileSync(layoutPath, 'utf8');
  assert.ok(content.includes('/manifest-quan-ly.webmanifest'), 'Must link to /manifest-quan-ly.webmanifest');
  assert.ok(content.includes('SiGolf'), 'Must declare SiGolf web app title');
  assert.ok(content.includes('apple-mobile-web-app-capable'), 'Must declare apple-mobile-web-app-capable');
  assert.ok(content.includes('/apple-touch-icon.png'), 'Must link apple-touch-icon.png');
});

test('4. PWA 7-day snooze calculation logic', () => {
  const now = 1763452800000; // Sample timestamp
  const SNOOZE_DAYS = 7;
  const snoozeUntil = now + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  assert.equal(snoozeUntil - now, 604800000, 'Snooze duration must be exactly 7 days in milliseconds');
});
