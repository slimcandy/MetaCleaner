/**
 * Differential tests: the real ExifTool is the judge.
 * Every cleaned fixture is written to disk and inspected with `exiftool -j -G`;
 * only structural groups (File, JPEG, PNG, RIFF, GIF, ICC_Profile, Composite)
 * may remain, plus EXIF:Orientation when we chose to keep it.
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
const STRUCTURAL = new Set(['ExifTool', 'File', 'JPEG', 'JFIF', 'PNG', 'RIFF', 'GIF', 'ICC_Profile', 'Composite']);

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

describe.each(['full.jpg', 'full.png', 'full.webp', 'full.gif'])('%s', (name) => {
  it('detects the format by magic bytes', () => {
    const bytes = new Uint8Array(readFileSync(join(fixtures, name)));
    expect(detectFormat(bytes)).toBe(name.endsWith('jpg') ? 'jpeg' : name.split('.')[1]);
  });

  it('removes every metadata group except the structural ones', async ({ skip }) => {
    if (!hasExiftool) skip();
    const { result, out } = await cleanFixture(name);
    const after = tags(out);
    const left = [...groups(after)].filter((g) => !STRUCTURAL.has(g));
    // The only thing allowed to survive is the orientation we re-inserted.
    const allowed = result.report.kept.includes('Orientation') ? ['EXIF'] : [];
    expect(left).toEqual(allowed);
    if (allowed.length) {
      const exifKeys = Object.keys(after).filter((k) => k.startsWith('EXIF:'));
      expect(exifKeys).toEqual(['EXIF:Orientation']);
      expect(after['EXIF:Orientation']).toBe(6);
    }
    expect(after['Composite:GPSLatitude']).toBeUndefined();
    expect(after['XMP:Creator']).toBeUndefined();
    expect(after['IPTC:By-line']).toBeUndefined();
  });

  it('removes orientation too when asked', async ({ skip }) => {
    if (!hasExiftool) skip();
    const { out } = await cleanFixture(name, { keepOrientation: false });
    const left = [...groups(tags(out))].filter((g) => !STRUCTURAL.has(g));
    expect(left).toEqual([]);
  });

  it('produces a file ExifTool validates without errors', async ({ skip }) => {
    if (!hasExiftool) skip();
    const { out } = await cleanFixture(name);
    const validation = exiftool(['-validate', '-warning', '-error', '-a', out]);
    expect(validation).not.toMatch(/Error/);
  });

  it('is smaller and reports what it removed', async () => {
    const { input, result } = await cleanFixture(name);
    expect(result.data.length).toBeLessThan(input.length);
    expect(result.report.removed.length).toBeGreaterThan(0);
    expect(result.report.bytesBefore).toBe(input.length);
    expect(result.report.bytesAfter).toBe(result.data.length);
  });

  it('is idempotent', async () => {
    const { result } = await cleanFixture(name);
    const again = await cleanBytes(result.data);
    expect(again.data).toEqual(result.data);
  });
});

describe('EXIF summary', () => {
  it.each(['full.jpg', 'full.png', 'full.webp'])('reads camera, date and GPS from %s', async (name) => {
    const { result } = await cleanFixture(name);
    const exif = result.report.exif;
    expect(exif?.make).toBe('Apple');
    expect(exif?.model).toBe('iPhone 15 Pro');
    expect(exif?.orientation).toBe(6);
    expect(exif?.dateTimeOriginal).toBe('2024:05:01 12:34:56');
    expect(exif?.gps?.latitude).toBeCloseTo(55.7558, 3);
    expect(exif?.gps?.longitude).toBeCloseTo(37.6173, 3);
    expect(result.report.hasXmp).toBe(true);
  });

  it('flags IPTC in JPEG', async () => {
    const { result } = await cleanFixture('full.jpg');
    expect(result.report.hasIptc).toBe(true);
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
    expect(result.data.length).toBeLessThan(readFileSync(join(fixtures, 'orientation1.jpg')).length);
  });

  it('rejects unknown formats', async () => {
    await expect(cleanBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).rejects.toThrow();
  });
});
