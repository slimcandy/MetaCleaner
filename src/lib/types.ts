export type Format = 'jpeg' | 'png' | 'webp' | 'gif' | 'unknown';

/** One block of metadata that was found in the source file. */
export interface RemovedBlock {
  /** Human readable name, e.g. "EXIF", "XMP", "PNG tEXt" */
  name: string;
  bytes: number;
  /** How many blocks of this kind were merged into this entry (absent = 1) */
  count?: number;
}

/** A few human-readable facts pulled out of EXIF before it is removed. */
export interface ExifSummary {
  /** Total number of tags across IFD0, ExifIFD, GPS and IFD1 */
  tagCount: number;
  make?: string;
  model?: string;
  lens?: string;
  software?: string;
  dateTimeOriginal?: string;
  artist?: string;
  copyright?: string;
  orientation?: number;
  gps?: { latitude: number; longitude: number };
  hasThumbnail: boolean;
}

export interface CleanOptions {
  /** Re-insert a minimal EXIF block containing only Orientation. Default: true. */
  keepOrientation?: boolean;
  /** Keep the ICC colour profile (not personal data, but needed for correct colours). Default: true. */
  keepColorProfile?: boolean;
}

export interface CleanReport {
  format: Format;
  /** "lossless" = bytes copied, pixels untouched. "reencode" = canvas fallback. */
  method: 'lossless' | 'reencode';
  removed: RemovedBlock[];
  /** Blocks intentionally kept (ICC, Orientation) */
  kept: string[];
  exif?: ExifSummary;
  hasXmp: boolean;
  hasIptc: boolean;
  bytesBefore: number;
  bytesAfter: number;
}

export interface CleanResult {
  data: Uint8Array;
  report: CleanReport;
}

export const DEFAULT_OPTIONS: Required<CleanOptions> = {
  keepOrientation: true,
  keepColorProfile: true
};
