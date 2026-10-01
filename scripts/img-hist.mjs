// Compare two images without knowing their spatial relationship.
//
// Used to answer one question cheaply: is this crop even the same artwork? A
// colour histogram is scale-invariant and position-invariant, so it settles
// "same building, different crop" versus "something else entirely" before
// spending any time on a spatial search.
//
// Usage: node scripts/img-hist.mjs <a.png> <b.png>

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

// 4 bits per channel, alpha ignored.
function hist(file) {
  const img = decodePng(fs.readFileSync(file));
  const h = new Float64Array(4096);
  let n = 0;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      const i = (y * img.width + x) * img.chan;
      const k = ((img.data[i] >> 4) << 8) | ((img.data[i + 1] >> 4) << 4) | (img.data[i + 2] >> 4);
      h[k] += 1;
      n += 1;
    }
  }
  for (let i = 0; i < h.length; i += 1) h[i] /= n;
  return { h, n, img };
}

const a = hist(process.argv[2]);
const b = hist(process.argv[3]);
console.log(`${process.argv[2]}  ${a.img.width}x${a.img.height}  ${a.n} px`);
console.log(`${process.argv[3]}  ${b.img.width}x${b.img.height}  ${b.n} px\n`);

// Histogram intersection: sum of minima. 1.0 means identical distributions.
let inter = 0;
let l1 = 0;
for (let i = 0; i < a.h.length; i += 1) {
  inter += Math.min(a.h[i], b.h[i]);
  l1 += Math.abs(a.h[i] - b.h[i]);
}
console.log(`histogram intersection  ${inter.toFixed(4)}`);
console.log(`total variation        ${l1.toFixed(4)}`);

// The dominant few buckets tell us more than the aggregate: if one image is
// mostly pale sky and the other mostly dark masonry, that shows up here.
const top = (x) => Array.from(x.entries ?? [])
  || Array.from({ length: 4096 }, (_, i) => [i, x[i]])
    .sort((p, q) => q[1] - p[1]).slice(0, 6)
    .map(([i, v]) => `#${i.toString(16).padStart(3, "0")} ${(v * 100).toFixed(1)}%`)
    .join("  ");
console.log(`\ntop buckets a: ${top(a.h)}`);
console.log(`top buckets b: ${top(b.h)}`);