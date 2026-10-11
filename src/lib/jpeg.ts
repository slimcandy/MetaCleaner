/**
 * JPEG: walk the marker segments, copy everything that is image, drop
 * everything that is metadata. Pixels are never decoded.
 *
 *   FFD8 SOI
 *   FFEn APPn  (JFIF, EXIF, XMP, ICC, IPTC, Adobe, …)   <- the interesting part
 *   FFDB DQT / FFC4 DHT / FFC0.. SOF / FFDD DRI          <- image, keep
 *   FFFE COM                                              <- comment, drop
 *   FFDA SOS + entropy coded data (repeats for progressive)
 *   FFD9 EOI
 *   [trailer: anything after EOI, e.g. embedded videos of "motion photos"]
 */
import { ascii, concat, startsWith, u16be } from './bytes';
import { buildOrientationTiff, needsOrientation, summarizeExif } from './exif';
import { DEFAULT_OPTIONS, type CleanOptions, type CleanResult, type RemovedBlock } from './types';

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;
const APP0 = 0xe0;
const APP1 = 0xe1;
const APP2 = 0xe2;
const APP14 = 0xee;
const APP15 = 0xef;
const COM = 0xfe;

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"

function isStandalone(marker: number): boolean {
  // RSTn, SOI, EOI, TEM have no length field
  return (marker >= 0xd0 && marker <= 0xd7) || marker === SOI || marker === EOI || marker === 0x01;
}

interface Segment {
  marker: number;
  start: number; // offset of 0xFF
  end: number; // exclusive
  payload: number; // offset of first byte after length field
}

/** Name a segment for the report. */
function describe(bytes: Uint8Array, s: Segment): string {
  const id = ascii(bytes, s.payload, Math.min(40, s.end - s.payload));
  switch (s.marker) {
    case APP0:
      return id.startsWith('JFXX') ? 'JFIF thumbnail (JFXX)' : 'JFIF';
    case APP1:
      if (id.startsWith('Exif')) return 'EXIF';
      if (id.startsWith('http://ns.adobe.com/xap/1.0/')) return 'XMP';
      if (id.startsWith('http://ns.adobe.com/xmp/extension/')) return 'XMP (extended)';
      return 'APP1';
    case APP2:
      if (id.startsWith('ICC_PROFILE')) return 'ICC profile';
      if (id.startsWith('MPF')) return 'MPF (embedded images)';
      if (id.startsWith('FPXR')) return 'FlashPix';
      if (id.startsWith('urn:iso:std:iso:ts:21496')) return 'Gain map (ISO 21496)';
      return 'APP2';
    case 0xe3:
      return id.startsWith('Meta') ? 'Kodak Meta' : 'APP3';
    case 0xe4:
      return 'APP4';
    case 0xe5:
      return 'APP5';
    case 0xe6:
      return 'APP6';
    case 0xe7:
      return 'APP7';
    case 0xe8:
      return 'APP8';
    case 0xe9:
      return 'APP9';
    case 0xea:
      return 'APP10';
    case 0xeb:
      return id.startsWith('JP') ? 'JUMBF / C2PA' : 'APP11';
    case 0xec:
      return id.startsWith('Ducky') ? 'Photoshop Ducky' : 'APP12';
    case 0xed:
      return id.startsWith('Photoshop') ? 'IPTC / Photoshop' : 'APP13';
    case APP14:
      return 'Adobe';
    case APP15:
      return 'APP15';
    case COM:
      return 'Comment';
    default:
      return `0x${s.marker.toString(16)}`;
  }
}

function isKeepable(bytes: Uint8Array, s: Segment, keepColorProfile: boolean): boolean {
  const id = ascii(bytes, s.payload, Math.min(12, s.end - s.payload));
  // JFIF header is structural, Adobe APP14 defines the colour transform (removing it breaks decoding).
  if (s.marker === APP0 && id.startsWith('JFIF')) return true;
  if (s.marker === APP14 && id.startsWith('Adobe')) return true;
  if (s.marker === APP2 && id.startsWith('ICC_PROFILE')) return keepColorProfile;
  return false;
}

function parseSegments(bytes: Uint8Array): { segments: Segment[]; trailerStart: number } {
  const segments: Segment[] = [];
  let pos = 2; // after SOI
  let trailerStart = bytes.length;

  while (pos + 2 <= bytes.length) {
    if (bytes[pos] !== 0xff) throw new Error(`Expected marker at ${pos}`);
    // Skip fill bytes 0xFF 0xFF…
    while (pos < bytes.length && bytes[pos + 1] === 0xff) pos++;
    const marker = bytes[pos + 1]!;

    if (marker === EOI) {
      segments.push({ marker, start: pos, end: pos + 2, payload: pos + 2 });
      trailerStart = pos + 2;
      break;
    }
    if (isStandalone(marker)) {
      segments.push({ marker, start: pos, end: pos + 2, payload: pos + 2 });
      pos += 2;
      continue;
    }

    if (pos + 4 > bytes.length) throw new Error('Truncated segment');
    const length = u16be(bytes, pos + 2);
    const end = pos + 2 + length;
    if (end > bytes.length) throw new Error('Truncated segment');
    const segment: Segment = { marker, start: pos, end, payload: pos + 4 };

    if (marker === SOS) {
      // Entropy coded data follows: scan for the next real marker.
      let p = end;
      while (p + 1 < bytes.length) {
        if (bytes[p] === 0xff) {
          const m = bytes[p + 1]!;
          if (m !== 0x00 && m !== 0xff && !(m >= 0xd0 && m <= 0xd7)) break;
        }
        p++;
      }
      segment.end = p;
    }
    segments.push(segment);
    pos = segment.end;
  }
  return { segments, trailerStart };
}

export function cleanJpeg(bytes: Uint8Array, options: CleanOptions = {}): CleanResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!startsWith(bytes, [0xff, 0xd8])) throw new Error('Not a JPEG');

  const { segments, trailerStart } = parseSegments(bytes);
  const removed: RemovedBlock[] = [];
  const kept: string[] = [];
  let hasXmp = false;
  let hasIptc = false;
  let exif: CleanResult['report']['exif'];

  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let orientationInserted = false;

  const insertOrientation = (): void => {
    if (orientationInserted || !opts.keepOrientation || !needsOrientation(exif?.orientation)) return;
    const tiff = buildOrientationTiff(exif.orientation);
    const payload = concat([new Uint8Array(EXIF_HEADER), tiff]);
    const header = new Uint8Array([0xff, APP1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]);
    parts.push(header, payload);
    kept.push('Orientation');
    orientationInserted = true;
  };

  for (const s of segments) {
    const isApp = s.marker >= APP0 && s.marker <= APP15;
    if (!isApp && s.marker !== COM) {
      // First structural segment: orientation block must precede it (and follow JFIF).
      insertOrientation();
      parts.push(bytes.subarray(s.start, s.end));
      continue;
    }

    const name = describe(bytes, s);
    if (name === 'EXIF') {
      exif ??= summarizeExif(bytes.subarray(s.payload + EXIF_HEADER.length, s.end));
    }
    if (name.startsWith('XMP')) hasXmp = true;
    if (name.startsWith('IPTC')) hasIptc = true;

    if (isKeepable(bytes, s, opts.keepColorProfile)) {
      parts.push(bytes.subarray(s.start, s.end));
      if (name === 'ICC profile') kept.push('ICC profile');
      continue;
    }
    removed.push({ name, bytes: s.end - s.start });
  }

  if (trailerStart < bytes.length) {
    removed.push({ name: 'Trailer after EOI', bytes: bytes.length - trailerStart });
  }

  const data = concat(parts);
  return {
    data,
    report: {
      format: 'jpeg',
      method: 'lossless',
      removed,
      kept,
      exif,
      hasXmp,
      hasIptc,
      bytesBefore: bytes.length,
      bytesAfter: data.length
    }
  };
}
