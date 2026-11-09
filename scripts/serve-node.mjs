import { startProdServer } from 'vinext/server/prod-server';

const port = parseInt(process.env.PORT || '8787', 10);
const host = process.env.HOST || '127.0.0.1';

console.log(`[Golf3D] Starting production server on http://${host}:${port}...`);

await startProdServer({
  port,
  host,
  outDir: 'dist',
});

console.log(`[Golf3D] Server successfully started and listening on http://${host}:${port}`);
