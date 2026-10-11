/**
 * Differential tests: the real ExifTool is the judge.
 * Every cleaned fixture is written to disk and inspected with `exiftool -j -G`.
 * Only structural groups may remain, plus EXIF:Orientation when we chose to keep it.
 * TIFF keeps its structural tags in the EXIF group, so it is checked tag by tag.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { cleanBytes, detectFormat } from './index';

const fixtures = join(import.meta.dirname, '__fixtures__');
const outDir = mkdtempSync(join(tmpdir(), 'metacleaner-'));

function exiftool(args: string[]): string {
  return execFileSync('exiftool', args, { encoding: 'utf8' });
}
function tags(path: string): Record<string, unknown> {
  const [json] = JSON.parse(exiftool(['-j', '-G', '-n', '-struct', path])) as Record<string, unknown>[];
  return json ?? {};
}
function groups(t: Record<string, unknown>): Set<string> {
  return new Set(Object.keys(t).map((k) => k.split(':')[0]!).filter((g) => g !== 'SourceFile'));
}
/** Groups that describe the container itself rather than what someone wrote into it. */
const STRUCTURAL = new Set(['ExifTool', 'File', 'JPEG', 'JFIF', 'PNG', 'RIFF', 'GIF', 'QuickTime', 'SVG', 'ICC_Profile', 'Composite']);
/** Tags that carry personal or device data; none may survive in any format. */
const PERSONAL = /Make|Model|Artist|Creator|By-line|Software|DateTime|GPS|Copyright|Description|Comment|Lens|Serial|Title|Caption/;

const ALL = ['full.jpg', 'full.png', 'full.webp', 'full.gif', 'full.heic', 'full.tif', 'full.svg'];
const SAME_SIZE = new Set(['full.heic', 'full.tif']); // zeroed in place
const FORMAT: Record<string, string> = { jpg: 'jpeg', tif: 'tiff' };

let hasExiftool = false;
beforeAll(() => {
  try {
    exiftool(['-ver']);
    hasExiftool = true;
  } catch {
    console.warn('exiftool not found: differential tests skipped');
  }
});

async function cleanFixture(name: string, options = {}) {
  const input = new Uint8Array(readFileSync(join(fixtures, name)));
  const result = await cleanBytes(input, options);
  const out = join(outDir, name.replace(/\.(\w+)$/, `-clean-${Object.keys(options).join('_') || 'default'}.$1`));
  writeFileSync(out, result.data);
  return { input, result, out };
}

function leftovers(after: Record<string, unknown>, name: string, keptOrientation: boolean): string[] {
  const left = [...groups(after)].filter((g) => !STRUCTURAL.has(g));
  if (name.endsWith('.tif')) return left.filter((g) => g !== 'EXIF');
  if (!keptOrientation) return left;
  const exifKeys = Object.keys(after).filter((k) => k.startsWith('EXIF:'));
  expect(exifKeys).toEqual(['EXIF:Orientation']);
  return left.filter((g) => g !== 'EXIF');
}

describe.each(ALL)('%s', (name) => {
  it('detects the format by magic bytes', () => {
    const bytes = new Uint8Array(readFileSync(join(fixtures, name)));
    const ext = name.split('.')[1]!;
    expect(detectFormat(bytes)).toBe(FORMAT[ext] ?? ext);
  });

  it('removes every metadata group except the structural ones', async ({ skip }) => {
    if (!hasExiftool) skip();
    const { result, out } = await cleanFixture(name);
    const after = tags(out);
    expect(leftovers(after, name, result.report.kept.includes('Orientation'))).toEqual([]);
    const personal = Object.keys(after).filter((k) => PERSONAL.test(k) && !/^(File|ICC_Profile):/.test(k));
    expect(personal).toEqual([]);
    if (result.report.kept.includes('Orientation')) expect(after['EXIF:Orientation']).toBe(6);
  });

  it('removes orientation too when asked', async ({ skip }) => {
    if (!hasExiftool) skip();
    const { out } = await cleanFixture(name, { keepOrientation: false });
    const after = tags(out);
    expect(leftovers(after, name, false)).toEqual([]);
    expect(after['EXIF:Orientation']).toBeUndefined();
  });

  it('produces a file ExifTool validates without errors', async ({ skip }) => {
    if (!hasExiftool) skip();
    const { out } = await cleanFixture(name);
    const validation = exiftool(['-validate', '-warning', '-error', '-a', out]);
    expect(validation).not.toMatch(/Error/);
  });

  it('reports what it removed and sizes', async () => {
    const { input, result } = await cleanFixture(name);
    if (SAME_SIZE.has(name)) expect(result.data.length).toBe(input.length);
    else expect(result.data.length).toBeLessThan(input.length);
    expect(result.report.removed.length).toBeGreaterThan(0);
    expect(result.report.bytesBefore).toBe(input.length);
    expect(result.report.bytesAfter).toBe(result.data.length);
  });

  it('is idempotent', async () => {
    const { result } = await cleanFixture(name);
    const again = await cleanBytes(result.data);
    expect(again.data).toEqual(result.data);
    // The minimal Orientation block is removed and re-inserted on every pass; nothing else may be.
    expect(again.report.removed.filter((r) => r.name !== 'EXIF')).toEqual([]);
  });
});

describe('EXIF summary', () => {
  it.each(['full.jpg', 'full.png', 'full.webp', 'full.heic', 'full.tif'])('reads camera and GPS from %s', async (name) => {
    const { result } = await cleanFixture(name);
    const exif = result.report.exif;
    expect(exif?.make).toBe('Apple');
    expect(exif?.model).toBe('iPhone 15 Pro');
    expect(exif?.dateTimeOriginal).toBe('2024:05:01 12:34:56');
    expect(exif?.gps?.latitude).toBeCloseTo(55.7558, 3);
    expect(exif?.gps?.longitude).toBeCloseTo(37.6173, 3);
    expect(result.report.hasXmp).toBe(true);
  });

  it('flags IPTC in JPEG and TIFF', async () => {
    expect((await cleanFixture('full.jpg')).result.report.hasIptc).toBe(true);
    expect((await cleanFixture('full.tif')).result.report.hasIptc).toBe(true);
  });

  it('cleans the JPEG embedded in an SVG', async () => {
    const { result } = await cleanFixture('full.svg');
    expect(result.report.removed.map((r) => r.name)).toContain('Embedded JPEG metadata');
    const text = new TextDecoder().decode(result.data);
    expect(text).not.toMatch(/Jane|inkscape|sodipodi|<title|<desc|<metadata|data-author|a1b2c3d4/);
    expect(text).toMatch(/<rect/);
  });
});

describe('edge cases', () => {
  it('leaves an already clean JPEG byte-identical', async () => {
    const { input, result } = await cleanFixture('clean.jpg');
    expect(result.data).toEqual(input);
    expect(result.report.removed).toEqual([]);
  });

  it('does not add an orientation block for orientation 1', async () => {
    const { result } = await cleanFixture('orientation1.jpg');
    expect(result.report.kept).not.toContain('Orientation');
  });

  it('rejects unknown formats', async () => {
    await expect(cleanBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).rejects.toThrow();
  });
});
