/**
 * SVG is XML: metadata is text. Removes <metadata>, RDF, <title>/<desc>,
 * comments, editor namespaces (Inkscape, Illustrator, Figma…), data-*
 * attributes and auto-generated UUID ids, and cleans raster images embedded
 * as base64 data URLs with the matching binary cleaner.
 */
import type { CleanOptions, CleanResult, RemovedBlock } from './types';

const EDITOR_PREFIXES = ['inkscape', 'sodipodi', 'illustrator', 'sketch', 'serif', 'vectornator', 'figma', 'adobe', 'xd', 'photoshop', 'corel', 'dc', 'cc', 'rdf'];
const EDITOR_URIS = [
  'http://www.inkscape.org',
  'http://sodipodi.sourceforge.net',
  'http://ns.adobe.com/Illustrator',
  'http://www.w3.org/1999/02/22-rdf-syntax-ns',
  'http://purl.org/dc/elements',
  'http://creativecommons.org/ns',
  'http://www.bohemiancoding.com/sketch/ns',
  'http://c2pa.org/'
];
const RASTER = /data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)/gi;

function b64decode(text: string): Uint8Array | undefined {
  try {
    const bin = atob(text.replace(/\s+/g, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return undefined;
  }
}
function b64encode(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 0x8000) parts.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
  return btoa(parts.join(''));
}

export async function cleanSvg(bytes: Uint8Array, options: CleanOptions = {}): Promise<CleanResult> {
  let text = new TextDecoder().decode(bytes);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!/<svg[\s>]/i.test(text)) throw new Error('Not an SVG');
  const before = text.length;
  const removed: RemovedBlock[] = [];
  const strip = (name: string, re: RegExp) => {
    const len = text.length;
    const matches = text.match(re)?.length ?? 0;
    text = text.replace(re, '');
    if (matches) removed.push({ name, bytes: len - text.length, count: matches > 1 ? matches : undefined });
  };

  // Embedded raster images carry their own EXIF/GPS.
  const { cleanBytes } = await import('./index');
  const rasters = [...text.matchAll(RASTER)];
  for (const m of rasters) {
    const data = b64decode(m[2]!);
    if (!data) continue;
    try {
      const result = await cleanBytes(data, options);
      const changed = result.data.length !== data.length || result.data.some((v, i) => v !== data[i]);
      if (changed) {
        text = text.replace(m[0], `data:${m[1]};base64,${b64encode(result.data)}`);
        removed.push({ name: `Embedded ${result.report.format.toUpperCase()} metadata`, bytes: data.length - result.data.length });
      }
    } catch {
      /* leave undecodable images alone */
    }
  }

  strip('Comment', /<!--[\s\S]*?-->/g);
  strip('Processing instruction', /<\?(?!xml[\s?])[\s\S]*?\?>/gi);
  strip('Metadata element', /<metadata(?=[\s>/])[\s\S]*?<\/metadata\s*>|<metadata(?=[\s/])[^>]*\/>/gi);
  strip('RDF', /<rdf:RDF(?=[\s>/])[\s\S]*?<\/rdf:RDF\s*>/gi);
  strip('Title', /<title(?=[\s>/])[\s\S]*?<\/title\s*>|<title(?=[\s/])[^>]*\/>/gi);
  strip('Description', /<desc(?=[\s>/])[\s\S]*?<\/desc\s*>|<desc(?=[\s/])[^>]*\/>/gi);
  strip('Editor elements', /<(?:sodipodi|inkscape):[\w-]+(?:[\s\S]*?<\/(?:sodipodi|inkscape):[\w-]+>|[^>]*\/>)/gi);
  strip('Editor attributes', new RegExp(`\\s+(?:${EDITOR_PREFIXES.join('|')}):[\\w-]+\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'gi'));
  for (const uri of EDITOR_URIS) {
    const escaped = uri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    strip('Editor namespace', new RegExp(`\\s+xmlns:[\\w-]+\\s*=\\s*(?:"[^"]*${escaped}[^"]*"|'[^']*${escaped}[^']*')`, 'gi'));
  }
  strip('Data attributes', /\s+data-[\w-]+\s*=\s*(?:"[^"]*"|'[^']*')/gi);
  // Auto-generated UUID ids, unless something references them.
  const source = text;
  text = text.replace(/\s+id\s*=\s*["']([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})["']/gi, (m, id: string) =>
    source.includes(`#${id}`) ? m : ''
  );
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n').replace(/[ \t]+$/gm, '').trim();

  const data = new TextEncoder().encode(text);
  return {
    data,
    report: {
      format: 'svg',
      method: 'lossless',
      removed,
      kept: [],
      hasXmp: /<rdf:RDF/i.test(new TextDecoder().decode(bytes)),
      hasIptc: false,
      bytesBefore: before,
      bytesAfter: data.length
    }
  };
}
