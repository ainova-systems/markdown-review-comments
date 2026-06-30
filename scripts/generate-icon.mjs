// Generates a simple 128x128 placeholder PNG icon (images/icon.png).
// No external dependencies: builds the PNG by hand using zlib.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZE = 128;

// CRC32 (PNG chunk checksum).
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Palette: dark slate background, blue accent square, white "quote" marks.
const bg = [30, 34, 45];
const accent = [45, 108, 223];
const white = [245, 247, 250];

function pixel(x, y) {
  const margin = 14;
  const inside = x >= margin && x < SIZE - margin && y >= margin && y < SIZE - margin;
  if (!inside) {
    return bg;
  }
  // Two quote bars to evoke a comment/review note.
  const barTop = 44;
  const barBottom = 84;
  const inBarRow = y >= barTop && y <= barBottom;
  const bar1 = x >= 38 && x <= 56;
  const bar2 = x >= 72 && x <= 90;
  if (inBarRow && (bar1 || bar2)) {
    return white;
  }
  return accent;
}

// Raw image: each row prefixed with a filter byte (0 = none), RGBA pixels.
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0;
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b] = pixel(x, y);
    raw[p++] = r;
    raw[p++] = g;
    raw[p++] = b;
    raw[p++] = 255;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = Buffer.concat([
  signature,
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'images', 'icon.png');
writeFileSync(out, png);
console.log(`Wrote ${png.length} bytes to ${out}`);
