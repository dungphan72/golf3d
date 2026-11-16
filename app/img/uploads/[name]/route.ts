import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Serves images uploaded through /api/upload. They are saved next to the app (public/img/uploads, kept
 * across deploys), outside the build output the static server reads, so they need their own route.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // Only the names the upload route generates: no path separators, no other extensions.
  if (!/^hero-\d+-[a-z0-9]+\.(jpg|png|webp)$/.test(name)) return new Response('Not found', { status: 404 });
  try {
    const file = await fs.readFile(path.join(process.cwd(), 'public', 'img', 'uploads', name));
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': TYPES[path.extname(name)] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
