/**
 * WebP: a RIFF container. "RIFF" size "WEBP" then chunks [fourcc][size][data, padded to even].
 * EXIF and XMP are separate chunks; the VP8X header has flag bits announcing them.
 */
import { ascii, concat, startsWith, u32le } from './bytes';
import { summarizeExif } from './exif';
import { DEFAULT_OPTIONS, type CleanOptions, type CleanResult, type RemovedBlock } from './types';

const FLAG_ICC = 0x20;
const FLAG_EXIF = 0x08;
const FLAG_XMP = 0x04;

export function cleanWebp(bytes: Uint8Array, options: CleanOptions = {}): CleanResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) || ascii(bytes, 8, 4) !== 'WEBP') {
    throw new Error('Not a WebP');
  }

  const removed: RemovedBlock[] = [];
  const kept: string[] = [];
  let hasXmp = false;
  let exif: CleanResult['report']['exif'];
  const body: Uint8Array[] = [];
  let vp8x: Uint8Array | undefined;

  const riffEnd = Math.min(bytes.length, 8 + u32le(bytes, 4));
  let pos = 12;
  while (pos + 8 <= riffEnd) {
    const fourcc = ascii(bytes, pos, 4);
    const size = u32le(bytes, pos + 4);
    const end = pos + 8 + size + (size & 1);
    if (pos + 8 + size > bytes.length) throw new Error('Truncated chunk');

    if (fourcc === 'EXIF') {
      exif ??= summarizeExif(stripExifHeader(bytes.subarray(pos + 8, pos + 8 + size)));
      removed.push({ name: 'EXIF', bytes: end - pos });
    } else if (fourcc === 'XMP ') {
      hasXmp = true;
      removed.push({ name: 'XMP', bytes: end - pos });
    } else if (fourcc === 'ICCP' && !opts.keepColorProfile) {
      removed.push({ name: 'ICC profile (ICCP)', bytes: end - pos });
    } else {
      if (fourcc === 'ICCP') kept.push('ICC profile');
      const copy = bytes.slice(pos, Math.min(end, bytes.length));
      if (fourcc === 'VP8X') vp8x = copy;
      body.push(copy);
    }
    pos = end;
  }
  if (riffEnd < bytes.length) {
    removed.push({ name: 'Trailer after RIFF', bytes: bytes.length - riffEnd });
  }

  if (vp8x && vp8x.length >= 9) {
    let flags = vp8x[8]! & ~(FLAG_EXIF | FLAG_XMP);
    if (!opts.keepColorProfile) flags &= ~FLAG_ICC;
    vp8x[8] = flags;
  }

  // Browsers ignore EXIF orientation in WebP inconsistently; the pixels are
  // stored as displayed in practice, so no orientation block is re-inserted.
  const content = concat(body);
  const header = new Uint8Array(12);
  header.set([0x52, 0x49, 0x46, 0x46], 0);
  new DataView(header.buffer).setUint32(4, 4 + content.length, true);
  header.set([0x57, 0x45, 0x42, 0x50], 8);
  const data = concat([header, content]);

  return {
    data,
    report: {
      format: 'webp',
      method: 'lossless',
      removed,
      kept,
      exif,
      hasXmp,
      hasIptc: false,
      bytesBefore: bytes.length,
      bytesAfter: data.length
    }
  };
}

/** Some writers prefix the WebP EXIF chunk with "Exif\0\0" like JPEG does. */
function stripExifHeader(data: Uint8Array): Uint8Array {
  return ascii(data, 0, 4) === 'Exif' ? data.subarray(6) : data;
}
