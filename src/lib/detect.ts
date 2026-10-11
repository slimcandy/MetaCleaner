import { startsWith } from './bytes';
import type { Format } from './types';

/** Detect the container by magic bytes. Never trust the extension or MIME type. */
export function detectFormat(bytes: Uint8Array): Format {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'webp';
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  return 'unknown';
}

export const MIME: Record<Exclude<Format, 'unknown'>, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
};
