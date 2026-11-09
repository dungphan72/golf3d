import { NextRequest } from 'next/server';
import { authorize, httpError, sameOrigin } from '../../auth-session';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Read the body before any early reply (an unread body upsets the worker runtime), but never
  // buffer an oversized upload from a caller that has not been authorised yet.
  if (Number(req.headers.get('content-length') ?? 0) > 11 * 1024 * 1024)
    return httpError('Dung lượng hình ảnh không vượt quá 10MB', 413);
  const rawBody = await req.arrayBuffer().catch(() => new ArrayBuffer(0));
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('settings.manage');
  if (response) return response;

  try {
    const formData = await new Response(rawBody, { headers: req.headers }).formData();
    const file = formData.get('file') as File | null;
    if (!file) return httpError('Vui lòng chọn file hình ảnh', 400);

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return httpError('Dung lượng hình ảnh không vượt quá 10MB', 413);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Decide the type from the file's own bytes, never from the client-supplied name or MIME
    // (SVG is refused: served from this origin it could run scripts).
    const head = buffer.subarray(0, 12);
    let safeExt = '';
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) safeExt = '.jpg';
    else if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) safeExt = '.png';
    else if (head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') safeExt = '.webp';
    if (!safeExt) return httpError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP', 415);

    // Determine extension or default to .jpg/.webp
    const filename = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${safeExt}`;
    const uploadsDir = path.join(process.cwd(), 'public', 'img', 'uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(path.join(uploadsDir, filename), buffer);
    } catch {
      // Cloudflare Workers has no writable disk: uploads only work on the VPS (Node) deployment.
      return httpError('Máy chủ hiện tại không hỗ trợ lưu ảnh tải lên (chỉ hoạt động khi chạy trên VPS)', 501);
    }

    return Response.json({
      ok: true,
      url: `/img/uploads/${filename}`,
      size: file.size,
          });
  } catch (err) {
    console.error('Upload error:', err);
    return httpError('Không thể tải ảnh lên máy chủ. Vui lòng thử lại.', 500);
  }
}
