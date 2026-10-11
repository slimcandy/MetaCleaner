import { detectFormat, MIME } from './detect';
import type { CleanOptions, CleanResult, Format, RemovedBlock } from './types';

export * from './types';
export { detectFormat } from './detect';

/**
 * Clean an in-memory image. Pure function, runs anywhere (browser, worker, Node).
 * Throws for unknown formats; the caller decides whether to fall back to a canvas.
 */
export async function cleanBytes(bytes: Uint8Array, options: CleanOptions = {}): Promise<CleanResult> {
  const format = detectFormat(bytes);
  let result: CleanResult;
  switch (format) {
    case 'jpeg':
      result = (await import('./jpeg')).cleanJpeg(bytes, options);
      break;
    case 'png':
      result = (await import('./png')).cleanPng(bytes, options);
      break;
    case 'webp':
      result = (await import('./webp')).cleanWebp(bytes, options);
      break;
    case 'gif':
      result = (await import('./gif')).cleanGif(bytes);
      break;
    default:
      throw new UnsupportedFormatError(format);
  }
  result.report.removed = mergeBlocks(result.report.removed);
  return result;
}

/** Collapse repeated blocks of the same kind (e.g. seven PNG tEXt chunks) into one line. */
function mergeBlocks(blocks: RemovedBlock[]): RemovedBlock[] {
  const merged = new Map<string, RemovedBlock>();
  for (const b of blocks) {
    const existing = merged.get(b.name);
    if (existing) {
      existing.bytes += b.bytes;
      existing.count = (existing.count ?? 1) + 1;
    } else {
      merged.set(b.name, { ...b });
    }
  }
  return [...merged.values()];
}

export class UnsupportedFormatError extends Error {
  readonly format: Format;
  constructor(format: Format) {
    super('Unsupported image format');
    this.format = format;
  }
}

export interface CleanedFile {
  file: File;
  report: CleanResult['report'];
}

/** Browser entry point: File in, File out. Falls back to canvas re-encoding for unknown formats. */
export async function cleanFile(file: File, options: CleanOptions = {}): Promise<CleanedFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const { data, report } = await cleanBytes(bytes, options);
    const type = report.format === 'unknown' ? file.type : MIME[report.format];
    return { file: new File([data as BlobPart], file.name, { type }), report };
  } catch (error) {
    if (!(error instanceof UnsupportedFormatError)) throw error;
    const { cleanViaCanvas } = await import('./canvas');
    const result = await cleanViaCanvas(file);
    const type = (result as { mimeType?: string }).mimeType ?? file.type;
    const name = type === file.type ? file.name : file.name.replace(/\.[^.]+$/, '') + '.png';
    return { file: new File([result.data as BlobPart], name, { type }), report: result.report };
  }
}
