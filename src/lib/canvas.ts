/**
 * Last-resort fallback for formats the byte-level cleaners do not understand
 * (HEIC in Safari, BMP, TIFF…). Decodes and re-encodes through a canvas, which
 * drops every metadata block but also re-compresses the pixels.
 */
import type { CleanReport, CleanResult } from './types';

export async function cleanViaCanvas(file: File): Promise<CleanResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Not an image this browser can decode');
  }
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    ctx.drawImage(bitmap, 0, 0);
    // Re-encode as PNG when the browser cannot encode the source type (e.g. HEIC).
    const type = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? file.type : 'image/png';
    const blob = await canvas.convertToBlob({ type, quality: 0.92 });
    const data = new Uint8Array(await blob.arrayBuffer());
    const report: CleanReport = {
      format: 'unknown',
      method: 'reencode',
      removed: [{ name: 'All metadata (re-encoded)', bytes: Math.max(0, file.size - data.length) }],
      kept: [],
      hasXmp: false,
      hasIptc: false,
      bytesBefore: file.size,
      bytesAfter: data.length
    };
    return { data, report, mimeType: type } as CleanResult & { mimeType: string };
  } finally {
    bitmap.close();
  }
}
