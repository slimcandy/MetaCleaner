# Meta Cleaner

Remove metadata from images in the browser. Nothing is uploaded, pixels are never re-encoded, and the cleaning engine has zero dependencies.

Live: <https://meta.avolkov.dev> (mirror: <https://admirable-puffpuff-e78254.netlify.app>). Installable as a PWA on iOS, iPadOS and macOS, works offline.

[![Netlify Status](https://api.netlify.com/api/v1/badges/1007dc0e-bbf9-4a65-93dd-efeacdda8522/deploy-status)](https://app.netlify.com/sites/admirable-puffpuff-e78254/deploys)

## Why

Photos and documents carry more than pixels: GPS coordinates, camera serial numbers, your name, editing history, thumbnails of the uncropped original. ExifTool removes all of that, but it is a Perl program. This project shows that the part you actually need, "delete everything that is not the image", fits in a few hundred lines of plain TypeScript and runs anywhere a browser does.

## What it does

| Format | Method | What is removed | What is kept |
| ------ | ------ | --------------- | ------------ |
| JPEG | Lossless, segment copy | EXIF, XMP, IPTC/Photoshop, comments, MPF previews, JUMBF/C2PA, every other APPn, trailers after EOI | JFIF, Adobe colour transform, ICC profile (optional), Orientation (optional) |
| PNG | Lossless, chunk copy | tEXt, zTXt, iTXt (incl. XMP), eXIf, tIME, caBX, trailers | Colour chunks, iCCP (optional), Orientation (optional) |
| WebP | Lossless, RIFF chunk copy | EXIF, XMP | ICCP (optional), animation, alpha |
| GIF | Lossless, block copy | Comment extensions, XMP and other application extensions | Animation and looping |
| HEIC / HEIF / AVIF | Lossless, in-place zeroing | EXIF, XMP, C2PA items and boxes | Image data, `irot` orientation, ICC (optional). File size does not change. |
| TIFF / DNG | Lossless, IFD rewrite in place | Make, Model, dates, Artist, Software, XMP, IPTC, Photoshop, whole EXIF/GPS sub-IFDs, DNG serials and private data, C2PA | Strips/tiles, Orientation (optional), ICC (optional). File size does not change. |
| SVG | Text rewrite | `<metadata>`, RDF, `<title>`, `<desc>`, comments, editor namespaces and attributes, `data-*`, UUID ids, metadata inside embedded base64 rasters | Drawing |
| Anything else | Canvas re-encode (fallback) | Everything | Pixels, re-compressed |

Before a block is removed it is read once so you can see what was inside: camera, date, software, author, GPS position, number of EXIF tags.

**Keep orientation** (default on) re-inserts a 26-byte EXIF block containing only the Orientation tag, so phone photos stay upright. Turn it off for a file with no EXIF at all.

## How it is verified

The real ExifTool is the judge. `npm test` cleans fixture files that were stuffed with metadata by ExifTool, then runs `exiftool -j -G` on the output and asserts that only structural groups remain (File, JPEG, PNG, RIFF, GIF, ICC_Profile) plus `EXIF:Orientation` when requested. It also runs `exiftool -validate` on every result and checks that cleaning is idempotent.

```sh
brew install exiftool   # or: apt install libimage-exiftool-perl
npm ci
npm test
```

Fixtures are regenerated with `scripts/make-fixtures.sh` (needs exiftool, sips, cwebp).

## Credits

The HEIC, TIFF and SVG cleaners are adapted from [picscrub](https://github.com/fasouto/picscrub) by Fabio Souto (MIT). ExifTool by Phil Harvey is the reference every test is checked against.

## Privacy guarantees you can check

- The site is served with `Content-Security-Policy: default-src 'self'; connect-src 'self'` (see `netlify.toml`). The page cannot talk to any other origin, even if a dependency wanted to.
- Open DevTools → Network: after the page has loaded, no request is made while you process files.
- No analytics, no cookies, no server-side code.

## Development

```sh
npm install
npm run dev      # Vite dev server
npm run check    # typecheck + tests
npm run build    # production build into dist/
```

Stack: Preact, Tailwind CSS v4, [Catalyst](https://tailwindcss.com/plus/ui-kit) components, Vite, vite-plugin-pwa. The engine in `src/lib/` imports nothing.

## Project layout

```
src/lib/        cleaning engine (jpeg.ts, png.ts, webp.ts, gif.ts, exif.ts, zip.ts) + tests
src/ui/         Catalyst UI kit components (Tailwind Plus licence, see below)
src/App.tsx     the single page
netlify.toml    build settings and security headers
```

## Licence

Code is MIT, see [LICENCE](LICENCE).

The components in `src/ui/` come from [Tailwind Plus](https://tailwindcss.com/plus) and are used under its licence, which permits open-source end products. They are part of this application and may not be extracted and redistributed as a UI kit.

## Contributing

Issues and pull requests are welcome. Good first contributions: HEIC/AVIF without re-encoding (ISOBMFF boxes), TIFF, and a worker for very large batches.
