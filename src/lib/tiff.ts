/**
 * TIFF and DNG. The file is a chain of IFDs whose entries point at values
 * anywhere in the file, so nothing can move. IFD0 is rewritten in place with
 * only the entries worth keeping (the new table is never larger), and the
 * values of removed entries, including whole EXIF/GPS sub-IFDs, are zeroed.
 * Strip and tile data are protected from zeroing even if pointers overlap.
 */
import { summarizeExif } from './exif';
import { DEFAULT_OPTIONS, type CleanOptions, type CleanResult, type RemovedBlock } from './types';

const REMOVE: Record<number, string> = {
  269: 'DocumentName',
  270: 'ImageDescription',
  271: 'Make',
  272: 'Model',
  285: 'PageName',
  305: 'Software',
  306: 'DateTime',
  315: 'Artist',
  316: 'HostComputer',
  700: 'XMP',
  33432: 'Copyright',
  33723: 'IPTC',
  34377: 'Photoshop',
  34665: 'EXIF',
  34853: 'GPS',
  36867: 'DateTimeOriginal',
  36868: 'DateTimeDigitized',
  42016: 'ImageUniqueID',
  50708: 'UniqueCameraModel',
  50709: 'LocalizedCameraModel',
  50735: 'CameraSerialNumber',
  50736: 'LensInfo',
  50740: 'DNGPrivateData',
  50781: 'RawDataUniqueID',
  50827: 'OriginalRawFileName',
  50828: 'OriginalRawFileData',
  50971: 'PreviewDateTime',
  52545: 'JUMBF / C2PA'
};
const ORIENTATION = 274;
const ICC = 34675;
const SUB_IFDS = new Set([34665, 34853, 40965]);
const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

interface Entry {
  tag: number;
  type: number;
  count: number;
  value: number;
  raw: Uint8Array;
}
interface Span {
  start: number;
  end: number;
}

export function cleanTiff(bytes: Uint8Array, options: CleanOptions = {}): CleanResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const le = bytes[0] === 0x49 && bytes[1] === 0x49;
  if (!le && !(bytes[0] === 0x4d && bytes[1] === 0x4d)) throw new Error('Not a TIFF');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (o: number) => view.getUint16(o, le);
  const u32 = (o: number) => view.getUint32(o, le);

  const readIfd = (offset: number): Entry[] => {
    if (offset < 8 || offset + 2 > bytes.length) return [];
    const n = u16(offset);
    const entries: Entry[] = [];
    for (let i = 0; i < n; i++) {
      const e = offset + 2 + i * 12;
      if (e + 12 > bytes.length) break;
      entries.push({ tag: u16(e), type: u16(e + 2), count: u32(e + 4), value: u32(e + 8), raw: bytes.slice(e + 8, e + 12) });
    }
    return entries;
  };
  const valueSize = (e: Entry) => (TYPE_SIZE[e.type] ?? 1) * e.count;
  const inline = (e: Entry) => valueSize(e) <= 4;
  const numbers = (e: Entry): number[] => {
    const size = TYPE_SIZE[e.type];
    if (size !== 2 && size !== 4) return [];
    const out: number[] = [];
    for (let i = 0; i < Math.min(e.count, 100_000); i++) {
      const o = (inline(e) ? -1 : e.value) + i * size;
      if (inline(e)) {
        const v = new DataView(e.raw.buffer, e.raw.byteOffset);
        out.push(size === 2 ? v.getUint16(i * 2, le) : v.getUint32(0, le));
      } else if (o + size <= bytes.length) {
        out.push(size === 2 ? u16(o) : u32(o));
      }
    }
    return out;
  };

  const ifd0Offset = u32(4);
  const ifd0 = readIfd(ifd0Offset);
  if (ifd0.length === 0) throw new Error('Empty TIFF IFD');

  // Image data must never be zeroed, whatever a malformed pointer says.
  const image: Span[] = [];
  for (const [offsetsTag, countsTag] of [[273, 279], [324, 325]] as const) {
    const o = ifd0.find((e) => e.tag === offsetsTag);
    const c = ifd0.find((e) => e.tag === countsTag);
    if (!o || !c) continue;
    const offs = numbers(o);
    const cnts = numbers(c);
    for (let i = 0; i < Math.min(offs.length, cnts.length); i++) image.push({ start: offs[i]!, end: offs[i]! + cnts[i]! });
  }

  const out = new Uint8Array(bytes);
  const removed: RemovedBlock[] = [];
  const zero = (start: number, length: number) => {
    const end = Math.min(start + length, out.length);
    if (image.some((s) => start < s.end && end > s.start)) return;
    out.fill(0, start, end);
  };
  const visited = new Set<number>();
  const wipeIfd = (offset: number, depth: number) => {
    if (depth > 3 || visited.has(offset)) return;
    visited.add(offset);
    const entries = readIfd(offset);
    for (const e of entries) {
      if (SUB_IFDS.has(e.tag) && inline(e)) wipeIfd(e.value, depth + 1);
      else if (!inline(e)) zero(e.value, valueSize(e));
    }
    zero(offset, 2 + entries.length * 12 + 4);
  };

  const kept: string[] = [];
  const keep: Entry[] = [];
  for (const e of ifd0) {
    const name = REMOVE[e.tag];
    if (e.tag === ORIENTATION) {
      if (opts.keepOrientation) {
        keep.push(e);
        kept.push('Orientation');
      } else {
        removed.push({ name: 'Orientation', bytes: 12 });
      }
    } else if (e.tag === ICC) {
      if (opts.keepColorProfile) {
        keep.push(e);
        kept.push('ICC profile');
      } else {
        zero(e.value, valueSize(e));
        removed.push({ name: 'ICC profile', bytes: valueSize(e) });
      }
    } else if (name) {
      if (SUB_IFDS.has(e.tag) && inline(e)) wipeIfd(e.value, 0);
      else if (!inline(e)) zero(e.value, valueSize(e));
      removed.push({ name, bytes: 12 + (inline(e) ? 0 : valueSize(e)) });
    } else {
      keep.push(e);
    }
  }

  // Rewrite IFD0 in place; it only ever shrinks. Surplus bytes are zeroed.
  const ov = new DataView(out.buffer, out.byteOffset, out.byteLength);
  let pos = ifd0Offset;
  ov.setUint16(pos, keep.length, le);
  pos += 2;
  for (const e of keep) {
    ov.setUint16(pos, e.tag, le);
    ov.setUint16(pos + 2, e.type, le);
    ov.setUint32(pos + 4, e.count, le);
    out.set(e.raw, pos + 8);
    pos += 12;
  }
  const oldNextPointer = ifd0Offset + 2 + ifd0.length * 12;
  ov.setUint32(pos, oldNextPointer + 4 <= bytes.length ? u32(oldNextPointer) : 0, le);
  pos += 4;
  out.fill(0, pos, oldNextPointer + 4);

  return {
    data: out,
    report: {
      format: 'tiff',
      method: 'lossless',
      removed,
      kept,
      exif: summarizeExif(bytes),
      hasXmp: ifd0.some((e) => e.tag === 700),
      hasIptc: ifd0.some((e) => e.tag === 33723 || e.tag === 34377),
      bytesBefore: bytes.length,
      bytesAfter: out.length
    }
  };
}
