import { Miniflare } from '../node_modules/.pnpm/node_modules/miniflare/dist/src/index.js';
import path from 'node:path';
import fs from 'node:fs';

const projectRoot = process.cwd();
const serverDir = path.resolve(projectRoot, 'dist/server');

function getAllFiles(dir, base = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const relPath = path.join(base, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, relPath));
    } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      results.push(relPath.replace(/\\/g, '/'));
    }
  }
  return results;
}

const allJsFiles = getAllFiles(serverDir);
console.log(`Found ${allJsFiles.length} JS modules in dist/server.`);

const modulesList = allJsFiles.map((f) => ({
  type: 'ESModule',
  path: path.resolve(serverDir, f),
}));

const mf = new Miniflare({
  modules: modulesList,
  modulesRoot: serverDir,
  compatibilityDate: '2026-05-15',
  compatibilityFlags: ['nodejs_compat'],
  bindings: {
    DISABLE_SITES_IDENTITY: '1',
    PUBLIC_BASE_URL: 'http://127.0.0.1:8797',
  },
  d1Databases: {
    DB: '00000000-0000-4000-8000-000000000000',
  },
  d1Persist: path.resolve(projectRoot, '.wrangler/state/v3/d1'),
  port: 8797,
  host: '127.0.0.1',
});

try {
  const url = await mf.ready;
  console.log('Miniflare started successfully on:', url.href);
  const res = await mf.dispatchFetch('http://127.0.0.1:8797/');
  console.log('DispatchFetch status:', res.status);
  console.log('DispatchFetch content-type:', res.headers.get('content-type'));
  const text = await res.text();
  console.log('Body length:', text.length);
  console.log('Body preview:', text.slice(0, 150));
  await mf.dispose();
  console.log('Miniflare disposed cleanly.');
} catch (err) {
  console.error('Miniflare startup error:', err);
  process.exit(1);
}
