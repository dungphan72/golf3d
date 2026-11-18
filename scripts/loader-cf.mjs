import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function resolve(specifier, context, nextResolve) {
  if (specifier === 'cloudflare:workers') {
    return {
      url: new URL('./cf-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // Handle relative specifiers
  if (specifier.startsWith('.') && context.parentURL && context.parentURL.startsWith('file:')) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    for (const ext of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.js']) {
      const candidate = path.resolve(parentDir, specifier + ext);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return {
          url: pathToFileURL(candidate).href,
          shortCircuit: true,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}
