/**
 * PNG: a signature followed by chunks [length][type][data][crc].
 * Metadata lives in its own chunks, so cleaning is "copy every chunk except these".
 */
import { ascii, concat, crc32, startsWith, u32be } from './bytes';
import { buildOrientationTiff, needsOrientation, summarizeExif } from './exif';
import { DEFAULT_OPTIONS, type CleanOptions, type CleanResult, type RemovedBlock } from './types';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Chunks that carry text/time/EXIF metadata and nothing the decoder needs. */
const METADATA_CHUNKS: Record<string, string> = {
  tEXt: 'Text (tEXt)',
  zTXt: 'Compressed text (zTXt)',
  iTXt: 'International text (iTXt)',
  eXIf: 'EXIF',
  tIME: 'Modification time (tIME)',
  caBX: 'JUMBF / C2PA',
  dSIG: 'Digital signature'
};

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  v.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

export function cleanPng(bytes: Uint8Array, options: CleanOptions = {}): CleanResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!startsWith(bytes, SIGNATURE)) throw new Error('Not a PNG');

  const removed: RemovedBlock[] = [];
  const kept: string[] = [];
  let hasXmp = false;
  let exif: CleanResult['report']['exif'];
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let orientationInserted = false;

  let pos = 8;
  while (pos + 12 <= bytes.length) {
    const length = u32be(bytes, pos);
    const type = ascii(bytes, pos + 4, 4);
    const end = pos + 12 + length;
    if (end > bytes.length) throw new Error('Truncated chunk');
    const data = bytes.subarray(pos + 8, pos + 8 + length);

    const label = METADATA_CHUNKS[type];
    if (type === 'eXIf') exif ??= summarizeExif(data);
    if (type === 'iTXt' && ascii(data, 0, 17) === 'XML:com.adobe.xmp') hasXmp = true;

    if (type === 'iCCP' && !opts.keepColorProfile) {
      removed.push({ name: 'ICC profile (iCCP)', bytes: end - pos });
    } else if (label) {
      removed.push({ name: label, bytes: end - pos });
    } else {
      if (type === 'iCCP') kept.push('ICC profile');
      parts.push(bytes.subarray(pos, end));
      // Orientation (if any) goes right after IHDR, before image data.
      if (type === 'IHDR' && !orientationInserted) {
        orientationInserted = true;
        // eXIf chunks usually come after IHDR, so look ahead for orientation first.
        const o = exif?.orientation ?? peekOrientation(bytes, end);
        if (opts.keepOrientation && needsOrientation(o)) {
          parts.push(chunk('eXIf', buildOrientationTiff(o)));
          kept.push('Orientation');
        }
      }
    }
    pos = end;
    if (type === 'IEND') break;
  }
  if (pos < bytes.length) {
    removed.push({ name: 'Trailer after IEND', bytes: bytes.length - pos });
  }

  const data = concat(parts);
  return {
    data,
    report: {
      format: 'png',
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

/** Find an eXIf chunk anywhere after `from` and return its orientation. */
function peekOrientation(bytes: Uint8Array, from: number): number | undefined {
  let pos = from;
  while (pos + 12 <= bytes.length) {
    const length = u32be(bytes, pos);
    const type = ascii(bytes, pos + 4, 4);
    if (type === 'eXIf') {
      return summarizeExif(bytes.subarray(pos + 8, pos + 8 + length))?.orientation;
    }
    if (type === 'IDAT' || type === 'IEND') return undefined;
    pos += 12 + length;
  }
  return undefined;
}
