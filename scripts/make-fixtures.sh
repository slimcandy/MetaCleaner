#!/bin/sh
# Regenerates test fixtures. Needs: exiftool, sips (macOS). cwebp optional.
# Fixtures are committed, so CI does not need these tools.
set -e
cd "$(dirname "$0")/../src/lib/__fixtures__"
rm -f *.jpg *.png *.webp *.gif

# 4x4 base PNG written by hand through Node (no image library needed).
node -e '
const zlib = require("node:zlib");
const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
const w = 4, h = 4; const raw = Buffer.alloc((w * 3 + 1) * h);
for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = x * 60; raw[o + 1] = y * 60; raw[o + 2] = 128; } }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
require("node:fs").writeFileSync("base.png", Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
'
sips -s format jpeg base.png --out base.jpg >/dev/null
sips -s format gif base.png --out base.gif >/dev/null
if command -v cwebp >/dev/null; then cwebp -quiet base.png -o base.webp; else sips -s format webp base.png --out base.webp >/dev/null; fi

TAGS="-Make=Apple -Model='iPhone 15 Pro' -Orientation=6 -n -Software=MetaCleanerTest -Artist='Jane Doe' -Copyright='(c) Jane' -DateTimeOriginal='2024:05:01 12:34:56' -LensModel='iPhone 15 Pro back camera' -GPSLatitude=55.7558 -GPSLatitudeRef=N -GPSLongitude=37.6173 -GPSLongitudeRef=E -XMP:Creator='Jane Doe' -XMP:Description='secret description' -XMP:CreateDate='2024:05:01 12:34:56'"

eval exiftool -q $TAGS -IPTC:By-line="'Jane Doe'" -IPTC:Caption-Abstract="'iptc caption'" -Comment="'jpeg comment'" base.jpg -o full.jpg
eval exiftool -q $TAGS -PNG:Comment="'png comment'" -PNG:Title="'png title'" base.png -o full.png
eval exiftool -q $TAGS base.webp -o full.webp
exiftool -q -Comment='gif comment' -XMP:Creator='Jane Doe' base.gif -o full.gif

# Edge cases
exiftool -q -all= base.jpg -o clean.jpg          # already clean
exiftool -q -Orientation=1 -n base.jpg -o orientation1.jpg  # orientation that needs no block
ls -la
