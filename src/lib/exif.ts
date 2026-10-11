/**
 * Minimal TIFF/EXIF reader and writer.
 *
 * Reads just enough to tell the user what was in the file (camera, date, GPS…)
 * and to preserve the Orientation tag. This is deliberately not a full tag
 * database: ExifTool has 14 000 lines for Nikon alone, we need none of them to
 * delete a block.
 */
import type { ExifSummary } from './types';

const TAG = {
  Make: 0x010f,
  Model: 0x0110,
  Orientation: 0x0112,
  Software: 0x0131,
  DateTime: 0x0132,
  Artist: 0x013b,
  Copyright: 0x8298,
  ExifIFD: 0x8769,
  GpsIFD: 0x8825,
  DateTimeOriginal: 0x9003,
  LensModel: 0xa434,
  GpsLatitudeRef: 0x0001,
  GpsLatitude: 0x0002,
  GpsLongitudeRef: 0x0003,
  GpsLongitude: 0x0004
} as const;

const TYPE_SIZE: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  6: 1,
  7: 1, // UNDEFINED
  8: 2,
  9: 4, // SLONG
  10: 8, // SRATIONAL
  11: 4,
  12: 8
};

interface Entry {
  tag: number;
  type: number;
  count: number;
  /** absolute offset of the value within the TIFF block */
  valueOffset: number;
}

class Tiff {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  readonly le: boolean;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const order = this.u16(0, false);
    if (order === 0x4949) this.le = true;
    else if (order === 0x4d4d) this.le = false;
    else throw new Error('Not a TIFF header');
    if (this.u16(2) !== 42) throw new Error('Bad TIFF magic');
  }

  u16(o: number, le = this.le): number {
    return this.view.getUint16(o, le);
  }
  u32(o: number, le = this.le): number {
    return this.view.getUint32(o, le);
  }

  readIfd(offset: number): Entry[] {
    const entries: Entry[] = [];
    if (offset + 2 > this.bytes.length) return entries;
    const count = this.u16(offset);
    for (let i = 0; i < count; i++) {
      const e = offset + 2 + i * 12;
      if (e + 12 > this.bytes.length) break;
      const type = this.u16(e + 2);
      const n = this.u32(e + 4);
      const size = (TYPE_SIZE[type] ?? 1) * n;
      const valueOffset = size <= 4 ? e + 8 : this.u32(e + 8);
      entries.push({ tag: this.u16(e), type, count: n, valueOffset });
    }
    return entries;
  }

  nextIfd(offset: number): number {
    const count = this.u16(offset);
    const o = offset + 2 + count * 12;
    return o + 4 <= this.bytes.length ? this.u32(o) : 0;
  }

  string(e: Entry): string | undefined {
    if (e.type !== 2 && e.type !== 7) return undefined;
    const end = Math.min(e.valueOffset + e.count, this.bytes.length);
    let s = '';
    for (let i = e.valueOffset; i < end; i++) {
      const c = this.bytes[i]!;
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s.trim() || undefined;
  }

  short(e: Entry): number | undefined {
    if (e.type === 3) return this.u16(e.valueOffset);
    if (e.type === 4) return this.u32(e.valueOffset);
    return undefined;
  }

  long(e: Entry): number | undefined {
    if (e.type === 4) return this.u32(e.valueOffset);
    if (e.type === 3) return this.u16(e.valueOffset);
    return undefined;
  }

  rationals(e: Entry): number[] {
    if (e.type !== 5 && e.type !== 10) return [];
    const out: number[] = [];
    for (let i = 0; i < e.count; i++) {
      const o = e.valueOffset + i * 8;
      if (o + 8 > this.bytes.length) break;
      const num = e.type === 5 ? this.u32(o) : this.view.getInt32(o, this.le);
      const den = e.type === 5 ? this.u32(o + 4) : this.view.getInt32(o + 4, this.le);
      out.push(den === 0 ? 0 : num / den);
    }
    return out;
  }
}

function dms(parts: number[], ref: string | undefined): number | undefined {
  if (parts.length < 1) return undefined;
  const value = (parts[0] ?? 0) + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600;
  const negative = ref === 'S' || ref === 'W';
  return Math.round((negative ? -value : value) * 1e6) / 1e6;
}

/**
 * Summarise a TIFF block (the payload of a JPEG APP1 "Exif" segment, a PNG eXIf
 * chunk or a WebP EXIF chunk). Returns undefined if it cannot be parsed.
 */
export function summarizeExif(tiff: Uint8Array): ExifSummary | undefined {
  try {
    const t = new Tiff(tiff);
    const ifd0Offset = t.u32(4);
    const ifd0 = t.readIfd(ifd0Offset);
    const summary: ExifSummary = { tagCount: ifd0.length, hasThumbnail: false };

    let exifIfd: Entry[] = [];
    let gpsIfd: Entry[] = [];

    for (const e of ifd0) {
      switch (e.tag) {
        case TAG.Make:
          summary.make = t.string(e);
          break;
        case TAG.Model:
          summary.model = t.string(e);
          break;
        case TAG.Software:
          summary.software = t.string(e);
          break;
        case TAG.Artist:
          summary.artist = t.string(e);
          break;
        case TAG.Copyright:
          summary.copyright = t.string(e);
          break;
        case TAG.Orientation:
          summary.orientation = t.short(e);
          break;
        case TAG.ExifIFD: {
          const o = t.long(e);
          if (o !== undefined) exifIfd = t.readIfd(o);
          break;
        }
        case TAG.GpsIFD: {
          const o = t.long(e);
          if (o !== undefined) gpsIfd = t.readIfd(o);
          break;
        }
      }
    }

    summary.tagCount += exifIfd.length + gpsIfd.length;
    for (const e of exifIfd) {
      if (e.tag === TAG.DateTimeOriginal) summary.dateTimeOriginal = t.string(e);
      if (e.tag === TAG.LensModel) summary.lens = t.string(e);
    }

    if (gpsIfd.length > 0) {
      let latRef: string | undefined;
      let lonRef: string | undefined;
      let lat: number[] = [];
      let lon: number[] = [];
      for (const e of gpsIfd) {
        if (e.tag === TAG.GpsLatitudeRef) latRef = t.string(e);
        if (e.tag === TAG.GpsLongitudeRef) lonRef = t.string(e);
        if (e.tag === TAG.GpsLatitude) lat = t.rationals(e);
        if (e.tag === TAG.GpsLongitude) lon = t.rationals(e);
      }
      const latitude = dms(lat, latRef);
      const longitude = dms(lon, lonRef);
      if (latitude !== undefined && longitude !== undefined) {
        summary.gps = { latitude, longitude };
      }
    }

    const ifd1Offset = t.nextIfd(ifd0Offset);
    if (ifd1Offset > 0 && ifd1Offset < tiff.length) {
      const ifd1 = t.readIfd(ifd1Offset);
      summary.tagCount += ifd1.length;
      summary.hasThumbnail = ifd1.length > 0;
    }

    return summary;
  } catch {
    return undefined;
  }
}

/**
 * Build the smallest valid TIFF block that carries only an Orientation tag.
 * Layout (little-endian): header (8) + IFD0 count (2) + one entry (12) + next IFD (4) = 26 bytes.
 */
export function buildOrientationTiff(orientation: number): Uint8Array {
  const out = new Uint8Array(26);
  const v = new DataView(out.buffer);
  out.set([0x49, 0x49], 0); // "II"
  v.setUint16(2, 42, true);
  v.setUint32(4, 8, true); // IFD0 offset
  v.setUint16(8, 1, true); // one entry
  v.setUint16(10, TAG.Orientation, true);
  v.setUint16(12, 3, true); // SHORT
  v.setUint32(14, 1, true); // count
  v.setUint16(18, orientation, true); // value, padded
  v.setUint32(22, 0, true); // no IFD1
  return out;
}

/** Orientation values 2..8 change how pixels must be displayed. 1 (or absent) is "as stored". */
export function needsOrientation(orientation: number | undefined): orientation is number {
  return orientation !== undefined && orientation >= 2 && orientation <= 8;
}
