/**
 * Client-side image compression helper using HTML Canvas.
 * Automatically scales down high-resolution camera photos and compresses them to WebP/JPEG,
 * reducing multi-megabyte uploads down to optimized 80-200 KB payloads.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg';
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  // If not an image or running on server, return file untouched
  if (!file.type.startsWith('image/') || typeof window === 'undefined') {
    return file;
  }

  // SVG images should not be rasterized or compressed through canvas
  if (file.type === 'image/svg+xml') {
    return file;
  }

  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;
  const format = options.format ?? 'image/webp';

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // If dimensions are within bounds and file is already under 200KB, keep as-is
      if (width <= maxWidth && height <= maxHeight && file.size <= 200 * 1024) {
        resolve(file);
        return;
      }

      // Calculate constrained aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compression didn't save bytes, return original
            resolve(file);
            return;
          }

          const ext = format === 'image/webp' ? '.webp' : '.jpg';
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${baseName}${ext}`, {
            type: format,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        format,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
