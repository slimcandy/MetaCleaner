import { ascii, startsWith } from './bytes';
import type { Format } from './types';

const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1', 'avif', 'avis']);

/** Detect the container by magic bytes. Never trust the extension or MIME type. */
export function detectFormat(bytes: Uint8Array): Format {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'webp';
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  if (ascii(bytes, 4, 4) === 'ftyp' && HEIF_BRANDS.has(ascii(bytes, 8, 4).toLowerCase())) return 'heic';
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return 'tiff';
  if (/<svg[\s>]/i.test(ascii(bytes, 0, Math.min(bytes.length, 4096)))) return 'svg';
  return 'unknown';
}

export const MIME: Record<Exclude<Format, 'unknown'>, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  tiff: 'image/tiff',
  svg: 'image/svg+xml'
};
