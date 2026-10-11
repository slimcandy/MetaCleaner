/**
 * HEIC / HEIF / AVIF (ISO Base Media File Format).
 *
 * Removing boxes would require rewriting every offset in `iloc`, so metadata
 * is overwritten with zeros in place instead: the file keeps its size and
 * structure, the HEVC/AV1 payload in `mdat` is never touched, and the Exif /
 * XMP items simply become empty. Orientation lives in the `irot` property,
 * not in EXIF, so photos stay upright.
 *
 * Approach and box walking adapted from picscrub (MIT, © 2026 Fabio Souto).
 */
import { ascii, u32be, u16be } from './bytes';
import { summarizeExif } from './exif';
import { DEFAULT_OPTIONS, type CleanOptions, type CleanResult, type RemovedBlock } from './types';

interface Box {
  type: string;
  offset: number;
  size: number;
  dataOffset: number;
  dataSize: number;
}
interface Range {
  offset: number;
  length: number;
}

const C2PA_UUID = [0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c, 0x92, 0x97, 0x58, 0x28, 0x87, 0x7e, 0xc4, 0x81];

function readBox(bytes: Uint8Array, offset: number, end: number): Box | undefined {
  if (offset + 8 > end) return undefined;
  let size = u32be(bytes, offset);
  const type = ascii(bytes, offset + 4, 4);
  let header = 8;
  if (size === 1) {
    if (offset + 16 > end) return undefined;
    size = u32be(bytes, offset + 8) * 0x100000000 + u32be(bytes, offset + 12);
    header = 16;
  } else if (size === 0) {
    size = end - offset;
  }
  if (size < header || offset + size > end) return undefined;
  return { type, offset, size, dataOffset: offset + header, dataSize: size - header };
}

function children(bytes: Uint8Array, parent: Box): Box[] {
  const out: Box[] = [];
  // `meta` is a FullBox: version (1) + flags (3) precede its children.
  let pos = parent.dataOffset + (parent.type === 'meta' ? 4 : 0);
  const end = parent.offset + parent.size;
  for (;;) {
    const box = readBox(bytes, pos, end);
    if (!box) break;
    out.push(box);
    pos = box.offset + box.size;
  }
  return out;
}

function topLevel(bytes: Uint8Array): Box[] {
  const out: Box[] = [];
  let pos = 0;
  for (;;) {
    const box = readBox(bytes, pos, bytes.length);
    if (!box) break;
    out.push(box);
    pos = box.offset + box.size;
  }
  return out;
}

function sized(bytes: Uint8Array, offset: number, size: number): number {
  if (size === 4) return u32be(bytes, offset);
  if (size === 8) return u32be(bytes, offset) * 0x100000000 + u32be(bytes, offset + 4);
  return 0;
}

/** Item ids of Exif, XMP and C2PA items from `iinf`. */
function itemIds(bytes: Uint8Array, meta: Box[]): { exif: Set<number>; xmp: Set<number>; c2pa: Set<number> } {
  const ids = { exif: new Set<number>(), xmp: new Set<number>(), c2pa: new Set<number>() };
  const iinf = meta.find((b) => b.type === 'iinf');
  if (!iinf) return ids;
  const end = iinf.offset + iinf.size;
  let pos = iinf.dataOffset;
  const version = bytes[pos]!;
  pos += 4 + (version === 0 ? 2 : 4);
  for (;;) {
    const infe = readBox(bytes, pos, end);
    if (!infe) break;
    pos = infe.offset + infe.size;
    if (infe.type !== 'infe') continue;
    const v = bytes[infe.dataOffset]!;
    const base = infe.dataOffset + 4;
    if (v < 2 || base + 8 > bytes.length) continue;
    const id = u16be(bytes, base);
    const type = ascii(bytes, base + 4, 4);
    if (type === 'Exif') ids.exif.add(id);
    else if (type === 'mime') {
      const mime = ascii(bytes, base + 8, Math.min(48, infe.offset + infe.size - base - 8));
      if (mime.includes('application/rdf+xml')) ids.xmp.add(id);
      else if (mime.includes('application/c2pa')) ids.c2pa.add(id);
    }
  }
  return ids;
}

/** Byte ranges of the given items, resolved through `iloc`. */
function locations(bytes: Uint8Array, meta: Box[], ids: Set<number>): Range[] {
  const out: Range[] = [];
  const iloc = meta.find((b) => b.type === 'iloc');
  if (!iloc || ids.size === 0) return out;
  const idat = meta.find((b) => b.type === 'idat');
  const end = iloc.offset + iloc.size;
  let pos = iloc.dataOffset;
  const version = bytes[pos]!;
  pos += 4;
  const offsetSize = bytes[pos]! >> 4;
  const lengthSize = bytes[pos]! & 0x0f;
  const baseSize = bytes[pos + 1]! >> 4;
  const indexSize = version >= 1 ? bytes[pos + 1]! & 0x0f : 0;
  pos += 2;
  const count = version < 2 ? u16be(bytes, pos) : u32be(bytes, pos);
  pos += version < 2 ? 2 : 4;

  for (let i = 0; i < count && pos < end; i++) {
    const id = version < 2 ? u16be(bytes, pos) : u32be(bytes, pos);
    pos += version < 2 ? 2 : 4;
    let method = 0;
    if (version >= 1) {
      method = u16be(bytes, pos) & 0x0f;
      pos += 2;
    }
    pos += 2; // data_reference_index
    const base = sized(bytes, pos, baseSize);
    pos += baseSize;
    const extents = u16be(bytes, pos);
    pos += 2;
    for (let e = 0; e < extents; e++) {
      pos += indexSize;
      const extentOffset = sized(bytes, pos, offsetSize);
      pos += offsetSize;
      const length = sized(bytes, pos, lengthSize);
      pos += lengthSize;
      if (!ids.has(id) || length === 0) continue;
      let offset: number | undefined;
      if (method === 0) offset = base + extentOffset;
      else if (method === 1 && idat && base + extentOffset + length <= idat.dataSize) {
        offset = idat.dataOffset + base + extentOffset;
      }
      if (offset !== undefined && offset + length <= bytes.length) out.push({ offset, length });
    }
  }
  return out;
}

function isZero(bytes: Uint8Array, r: Range): boolean {
  for (let i = r.offset; i < r.offset + r.length; i++) if (bytes[i] !== 0) return false;
  return true;
}

/** HEIF Exif items start with a 4-byte offset to the TIFF header. */
function tiffOf(bytes: Uint8Array, r: Range): Uint8Array {
  const skip = 4 + u32be(bytes, r.offset);
  return bytes.subarray(r.offset + skip, r.offset + r.length);
}

export function cleanHeic(bytes: Uint8Array, options: CleanOptions = {}): CleanResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (ascii(bytes, 4, 4) !== 'ftyp') throw new Error('Not a HEIF file');

  const boxes = topLevel(bytes);
  const metaBox = boxes.find((b) => b.type === 'meta');
  const meta = metaBox ? children(bytes, metaBox) : [];
  const ids = itemIds(bytes, meta);

  const exif = locations(bytes, meta, ids.exif).filter((r) => !isZero(bytes, r));
  const xmp = locations(bytes, meta, ids.xmp).filter((r) => !isZero(bytes, r));
  const c2paItems = locations(bytes, meta, ids.c2pa).filter((r) => !isZero(bytes, r));
  const c2paBoxes = boxes.filter(
    (b) => b.type === 'uuid' && C2PA_UUID.every((v, i) => bytes[b.dataOffset + i] === v)
  );

  // ICC profile: `colr` property of type prof/rICC inside meta/iprp/ipco.
  const icc: Range[] = [];
  const iprp = meta.find((b) => b.type === 'iprp');
  const ipco = iprp ? children(bytes, iprp).find((b) => b.type === 'ipco') : undefined;
  if (ipco) {
    for (const p of children(bytes, ipco)) {
      if (p.type === 'colr' && p.dataSize > 4) {
        const kind = ascii(bytes, p.dataOffset, 4);
        if (kind === 'prof' || kind === 'rICC') icc.push({ offset: p.dataOffset + 4, length: p.dataSize - 4 });
      }
    }
  }

  const removed: RemovedBlock[] = [];
  const kept: string[] = [];
  const out = new Uint8Array(bytes);
  const zero = (ranges: Range[], name: string) => {
    for (const r of ranges) {
      out.fill(0, r.offset, r.offset + r.length);
      removed.push({ name, bytes: r.length });
    }
  };

  const summary = exif[0] ? summarizeExif(tiffOf(bytes, exif[0])) : undefined;
  zero(exif, 'EXIF');
  zero(xmp, 'XMP');
  zero(c2paItems, 'JUMBF / C2PA');
  for (const b of c2paBoxes) {
    out.set([0x66, 0x72, 0x65, 0x65], b.offset + 4); // retype uuid → free
    out.fill(0, b.dataOffset, b.offset + b.size);
    removed.push({ name: 'JUMBF / C2PA', bytes: b.dataSize });
  }
  if (opts.keepColorProfile) {
    if (icc.length) kept.push('ICC profile');
  } else {
    zero(icc, 'ICC profile');
  }
  // Orientation is carried by the `irot` property, which is untouched, so there is nothing to keep.

  return {
    data: out,
    report: {
      format: 'heic',
      method: 'lossless',
      removed,
      kept,
      exif: summary,
      hasXmp: xmp.length > 0,
      hasIptc: false,
      bytesBefore: bytes.length,
      bytesAfter: out.length
    }
  };
}
