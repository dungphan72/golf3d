import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');
const serverDir = path.resolve(projectRoot, 'dist/server');

const miniflarePath = path.resolve(projectRoot, 'node_modules/.pnpm/node_modules/miniflare/dist/src/index.js');
const { Miniflare, Log, LogLevel } = await import(pathToFileURL(miniflarePath).href);

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

let allJsFiles = getAllFiles(serverDir);
allJsFiles = allJsFiles.filter(f => f !== 'index.js');
allJsFiles.unshift('index.js');

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
    PUBLIC_BASE_URL: 'https://golfhub.cloud',
  },
  d1Databases: {
    DB: '00000000-0000-4000-8000-000000000000',
  },
  d1Persist: path.resolve(projectRoot, '.wrangler/state/v3/d1'),
  port: 8787,
  host: '127.0.0.1',
  log: new Log(LogLevel.DEBUG),
  verbose: true,
});

try {
  await mf.ready;
  console.log("Ready!");
} catch (e) {
  console.error("DEBUG CAUGHT:", e);
} finally {
  await mf.dispose();
}
