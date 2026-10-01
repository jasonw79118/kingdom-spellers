// Find drawn-on annotations in a screenshot.
//
// The crop of the castle turned out to match the capture at every scale, which
// means it is the same render. So whatever the sender meant by "see here" is
// most likely something drawn ON the image - a circle, an arrow, a box.
//
// Artwork in this project is drawn from a warm neutral palette: stone, slate,
// timber, plaster. A UI annotation is not, and more usefully it is highly
// saturated and hue-clustered. So: find pixels whose colour is far from
// everything the palette contains, and report where they are.
//
// Usage: node scripts/find-marks.mjs <image.png>

import fs from "node:fs";
import zlib from "node:zlib";

function decodePng(buf) {
  let off = 8, ihdr = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.slice(off + 4, off + 8).toString("ascii");
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === "IHDR") {
      ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  const chan = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.color];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { width, height } = ihdr;
  const bpp = chan, stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y += 1) {
    const ft = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const row = out.subarray(y * stride, (y + 1) * stride);
    const up = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = up ? up[i] : 0;
      const c = up && i >= bpp ? up[i - bpp] : 0;
      let v = src[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) v += paeth(a, b, c);
      row[i] = v & 0xff;
    }
  }
  return { width, height, chan, data: out };
}

const img = decodePng(fs.readFileSync(process.argv[2]));
console.log(`${process.argv[2]}  ${img.width}x${img.height}\n`);

const HUES = new Map();   // coarse hue bucket -> pixel count
let marked = 0;
const boxes = [];
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;

// Grid buckets, so a ring drawn around a part of the building still reads as one
// region rather than being averaged away.
const CELLW = 24, CELLH = 24;
const perCell = new Map();

for (let y = 0; y < img.height; y += 1) {
  for (let x = 0; x < img.width; x += 1) {
    const i = (y * img.width + x) * img.chan;
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    // The palette is warm and desaturated. Saturation this high, this blue or
    // this green, is not stone, slate, timber or plaster.
    const isCool = b > r + 25 || g > r + 25;
    if (sat > 0.45 && (isCool || mx > 90)) {
      marked += 1;
      let hue = 0;
      const c = mx;
      if (c === r) hue = 60 * (((g - b) / (mx - mn)) % 6);
      else if (c === g) hue = 60 * ((b - r) / (mx - mn) + 2);
      else hue = 60 * ((r - g) / (mx - mn) + 4);
      if (hue < 0) hue += 360;
      const bucket = Math.round(hue / 15) * 15;
      HUES.set(bucket, (HUES.get(bucket) || 0) + 1);
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      const key = `${Math.floor(x / CELLW)},${Math.floor(y / CELLH)}`;
      perCell.set(key, (perCell.get(key) || 0) + 1);
    }
  }
}

const total = img.width * img.height;
console.log(`off-palette pixels: ${marked} of ${total} (${(100 * marked / total).toFixed(2)}%)`);

// The raw inventory, before any judgement about what "off-palette" means. When
// a heuristic above looks implausible this is what settles it.
const exact = new Map();
for (let y = 0; y < img.height; y += 1) {
  for (let x = 0; x < img.width; x += 1) {
    const i = (y * img.width + x) * img.chan;
    const k = (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2];
    exact.set(k, (exact.get(k) || 0) + 1);
  }
}
const quant = new Map();
for (const [k, n] of exact) {
  // Mask each channel out of its own byte. Doing this with a single shift on
  // the packed value reads one channel's low nibble instead of the next
  // channel's high nibble, which reported pure #00xxxx for the whole image.
  const q = (((k >> 16) & 0xf0) << 16) | (((k >> 8) & 0xf0) << 8) | (k & 0xf0);
  quant.set(q, (quant.get(q) || 0) + n);
}
console.log(`\n${exact.size} distinct colours; top 16 by area:`);
for (const [k, n] of [...quant].sort((a, b) => b[1] - a[1]).slice(0, 16)) {
  const hex = '#' + k.toString(16).padStart(6, '0');
  console.log(`  ${hex}  ${(100 * n / total).toFixed(1).padStart(5)}%`);
}

if (marked < 40) {
  console.log("\nno annotation found - this is the plain render, nothing drawn on it");
} else {
  console.log(`\nbounding box of all off-palette pixels:`
    + ` x ${x0}..${x1}, y ${y0}..${y1}`);
  console.log(`  centre ${Math.round((x0 + x1) / 2)},${Math.round((y0 + y1) / 2)}`
    + `  (${Math.round((((x0 + x1) / 2) / img.width) * 100)}% across,`
    + ` ${Math.round((((y0 + y1) / 2) / img.height) * 100)}% down)`);

  console.log("\nhue histogram (0=red, 120=green, 240=blue):");
  for (const [hue, n] of [...HUES].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  hue ~${String(hue).padStart(3)}  ${String(n).padStart(7)} px`);
  }

  const cells = [...perCell].sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log("\ndensest cells:");
  for (const [k, n] of cells) {
    const [cx, cy] = k.split(",").map(Number);
    console.log(`  ${String(cx * CELLW).padStart(4)},${String(cy * CELLH).padStart(4)}`
      + `  ${String(n).padStart(5)} px`);
  }
}