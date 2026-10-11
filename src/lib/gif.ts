/**
 * GIF: header, logical screen descriptor, optional global colour table, then a
 * sequence of blocks until the trailer. Metadata hides in extension blocks:
 * Comment Extension (0xFE) and Application Extension (0xFF, e.g. XMP).
 */
import { ascii, concat, startsWith } from './bytes';
import type { CleanResult, RemovedBlock } from './types';

const EXTENSION = 0x21;
const IMAGE = 0x2c;
const TRAILER = 0x3b;
const COMMENT = 0xfe;
const APPLICATION = 0xff;

/** Skip a chain of data sub-blocks starting at `pos`; return the position after the terminator. */
function skipSubBlocks(bytes: Uint8Array, pos: number): number {
  while (pos < bytes.length) {
    const size = bytes[pos]!;
    pos += 1 + size;
    if (size === 0) break;
  }
  return pos;
}

function colorTableSize(flags: number): number {
  return flags & 0x80 ? 3 * (1 << ((flags & 0x07) + 1)) : 0;
}

export function cleanGif(bytes: Uint8Array): CleanResult {
  if (!startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) throw new Error('Not a GIF');

  const removed: RemovedBlock[] = [];
  let hasXmp = false;
  const parts: Uint8Array[] = [];

  // Header (6) + logical screen descriptor (7) + global colour table
  let pos = 13 + colorTableSize(bytes[10]!);
  parts.push(bytes.subarray(0, pos));

  while (pos < bytes.length) {
    const start = pos;
    const id = bytes[pos]!;

    if (id === TRAILER) {
      parts.push(bytes.subarray(pos, pos + 1));
      pos += 1;
      break;
    }
    if (id === IMAGE) {
      // descriptor (10) + local colour table + LZW minimum code size (1) + sub-blocks
      pos += 10 + colorTableSize(bytes[start + 9]!) + 1;
      pos = skipSubBlocks(bytes, pos);
      parts.push(bytes.subarray(start, pos));
      continue;
    }
    if (id === EXTENSION) {
      const label = bytes[pos + 1]!;
      pos = skipSubBlocks(bytes, pos + 2);
      if (label === COMMENT) {
        removed.push({ name: 'Comment', bytes: pos - start });
        continue;
      }
      if (label === APPLICATION) {
        const app = ascii(bytes, start + 3, 11);
        if (app.startsWith('NETSCAPE') || app.startsWith('ANIMEXTS')) {
          parts.push(bytes.subarray(start, pos)); // looping control, needed for animation
          continue;
        }
        if (app.startsWith('XMP Data')) hasXmp = true;
        removed.push({ name: app.startsWith('XMP Data') ? 'XMP' : `Application (${app.trim()})`, bytes: pos - start });
        continue;
      }
      parts.push(bytes.subarray(start, pos)); // graphic control, plain text
      continue;
    }
    throw new Error(`Unknown GIF block 0x${id.toString(16)} at ${start}`);
  }
  if (pos < bytes.length) {
    removed.push({ name: 'Trailer after end of GIF', bytes: bytes.length - pos });
  }

  const data = concat(parts);
  return {
    data,
    report: {
      format: 'gif',
      method: 'lossless',
      removed,
      kept: [],
      hasXmp,
      hasIptc: false,
      bytesBefore: bytes.length,
      bytesAfter: data.length
    }
  };
}
