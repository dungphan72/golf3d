import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Dynamically resolve miniflare entry
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');
const serverDir = path.resolve(projectRoot, 'dist/server');

// Find miniflare module
let miniflarePath;
const possiblePaths = [
  path.resolve(projectRoot, 'node_modules/miniflare/dist/src/index.js'),
  path.resolve(projectRoot, 'node_modules/.pnpm/node_modules/miniflare/dist/src/index.js'),
];

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    miniflarePath = p;
    break;
  }
}

if (!miniflarePath) {
  // Search in node_modules/.pnpm
  const pnpmDir = path.resolve(projectRoot, 'node_modules/.pnpm');
  if (fs.existsSync(pnpmDir)) {
    for (const d of fs.readdirSync(pnpmDir)) {
      if (d.startsWith('miniflare@')) {
        const candidate = path.join(pnpmDir, d, 'node_modules/miniflare/dist/src/index.js');
        if (fs.existsSync(candidate)) {
          miniflarePath = candidate;
          break;
        }
      }
    }
  }
}

if (!miniflarePath) {
  throw new Error('Could not locate miniflare/dist/src/index.js');
}

console.log(`Using Miniflare from: ${miniflarePath}`);
const { Miniflare } = await import(pathToFileURL(miniflarePath).href);

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
// Ensure index.js is ALWAYS the first module (entrypoint for Miniflare)
allJsFiles = allJsFiles.filter(f => f !== 'index.js');
allJsFiles.unshift('index.js');
console.log(`Found ${allJsFiles.length} JS modules in dist/server. Entrypoint: ${allJsFiles[0]}`);

const modulesList = allJsFiles.map((f) => ({
  type: 'ESModule',
  path: path.resolve(serverDir, f),
}));

const port = parseInt(process.env.PORT || '8787', 10);
const host = process.env.HOST || '127.0.0.1';
const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'https://golfhub.cloud';

const mf = new Miniflare({
  modules: modulesList,
  modulesRoot: serverDir,
  compatibilityDate: '2026-05-15',
  compatibilityFlags: ['nodejs_compat'],
  bindings: {
    DISABLE_SITES_IDENTITY: '1',
    PUBLIC_BASE_URL: publicBaseUrl,
  },
  d1Databases: {
    DB: '00000000-0000-4000-8000-000000000000',
  },
  d1Persist: path.resolve(projectRoot, '.wrangler/state/v3/d1'),
  port,
  host,
});

const url = await mf.ready;
console.log(`[Golf3D] Server successfully started and listening on ${url.href}`);
console.log(`[Golf3D] Public Base URL: ${publicBaseUrl}`);

// Handle graceful shutdown
const shutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down Miniflare...`);
  try {
    await mf.dispose();
    console.log('Miniflare disposed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
