// Locate a cropped screenshot inside a full capture, by matching structure.
//
// Why this exists: I cannot look at images. When someone reports that part of
// the art is wrong and attaches a crop, the crop's position in the full frame
// is the entire content of the report. Recovering that offset turns an
// unanswerable complaint into a coordinate I can go and measure.
//
// The trap, learned the hard way here. Absolute pixel comparison does not work.
// A screenshot of a rescaled render, on a different display, saved through a
// different tool, has its own brightness and contrast, so identical artwork
// fails an absolute test. Loosening the tolerance does not fix it: on a
// mid-tone stone building, loose comparison agrees almost everywhere and every
// candidate scores ~96%. Three separate versions of this file produced a
// confident, wrong answer that way.
//
// So: brightness and contrast are fitted per candidate rather than assumed, and
// candidates are ranked by residual after that fit. A true match drives the
// residual to near zero at some scale and offset; a false one cannot.
//
// Usage: node scripts/find-crop.mjs <crop.png> <full.png>

import fs from "node:fs";
import zlib from "node:zlib";

function decodePng(buf) {
  if (buf.slice(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("not a PNG");
  let off = 8, ihdr = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.slice(off + 4, off + 8).toString("ascii");
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        depth: data[8], color: data[9], interlace: data[12],
      };
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error("no IHDR");
  if (ihdr.depth !== 8) throw new Error(`bit depth ${ihdr.depth} unsupported`);
  if (ihdr.interlace !== 0) throw new Error("interlaced PNG unsupported");
  const chan = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.color];
  if (!chan) throw new Error(`colour type ${ihdr.color} unsupported`);
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

const DS = 4;

function greyDown(img) {
  const w = Math.floor(img.width / DS);
  const h = Math.floor(img.height / DS);
  const g = new Float32Array(w * h);
  const n = DS * DS;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let s = 0;
      for (let dy = 0; dy < DS; dy += 1) {
        for (let dx = 0; dx < DS; dx += 1) {
          const i = ((y * DS + dy) * img.width + (x * DS + dx)) * img.chan;
          s += 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
        }
      }
      g[y * w + x] = s / n;
    }
  }
  return { w, h, g };
}

function lumAt(img, x, y) {
  const i = (y * img.width + x) * img.chan;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
}

const cropImg = decodePng(fs.readFileSync(process.argv[2]));
const fullImg = decodePng(fs.readFileSync(process.argv[3]));
const crop = cropImg;
const full = greyDown(fullImg);

console.log(`crop  ${crop.width}x${crop.height}`);
console.log(`full  ${fullImg.width}x${fullImg.height}  (${full.w}x${full.h} downsampled)\n`);

// The crop as a fixed grid of cell averages. Computed once, valid at any scale.
const GX = 20, GY = 15;
const NC = GX * GY;
const cell = new Float32Array(NC);
const ccx = new Float32Array(NC);
const ccy = new Float32Array(NC);
for (let gy = 0; gy < GY; gy += 1) {
  for (let gx = 0; gx < GX; gx += 1) {
    const x0 = Math.floor((gx * crop.width) / GX);
    const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * crop.width) / GX));
    const y0 = Math.floor((gy * crop.height) / GY);
    const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * crop.height) / GY));
    let s = 0, n = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) { s += lumAt(crop, x, y); n += 1; }
    }
    cell[gy * GX + gx] = s / n;
    ccx[gy * GX + gx] = ((gx + 0.5) * crop.width) / GX;
    ccy[gy * GX + gx] = ((gy + 0.5) * crop.height) / GY;
  }
}

// Least squares fit of crop ~= a*full + b, returning residual RMS over the
// given sample positions. Fitting gain and offset is what makes the comparison
// survive a different display or a different screenshot tool.
function fitResidual(pairs) {
  const n = pairs.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [f, c] of pairs) { sx += f; sy += c; sxx += f * f; sxy += f * c; }
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-6) return { rms: 999, a: 1, b: 0 };
  const a = (n * sxy - sx * sy) / den;
  const b = (sy - a * sx) / n;
  let se = 0;
  for (const [f, c] of pairs) { const d = a * f + b - c; se += d * d; }
  return { rms: Math.sqrt(se / n), a, b };
}

const cands = [];
const S_MAX = full.w / (crop.width / DS);

for (let s = 0.2; s <= S_MAX; s += 0.01) {
  const spanX = (crop.width / DS) * s;
  const spanY = (crop.height / DS) * s;
  if (spanX > full.w || spanY > full.h) continue;
  const maxDx = full.w - spanX;
  const maxDy = full.h - spanY;

  const tx = new Float32Array(NC);
  const ty = new Float32Array(NC);
  for (let i = 0; i < NC; i += 1) {
    tx[i] = Math.round((ccx[i] / DS) * s);
    ty[i] = Math.round((ccy[i] / DS) * s);
  }

  for (let dy = 0; dy <= maxDy; dy += 1) {
    for (let dx = 0; dx <= maxDx; dx += 1) {
      // Cheap gate: rough structural spread must be comparable. Deliberately
      // loose, because it only has to reject obvious non-matches.
      let lo = 0, hi = 0;
      for (let i = 0; i < NC; i += 1) {
        const v = full.g[Math.round(dy + ty[i]) * full.w + Math.round(dx + tx[i])];
        if (v < 40 || v > 235) { lo = 1; break; }
      }
      if (lo) continue;
      const pairs = [];
      for (let i = 0; i < NC; i += 2) {
        pairs.push([full.g[Math.round(dy + ty[i]) * full.w + Math.round(dx + tx[i])], cell[i]]);
      }
      const r = fitResidual(pairs);
      if (r.rms < 14) cands.push({ s, dx, dy, rms: r.rms });
    }
  }
  if (cands.length > 20000) break;   // plenty to rank; stop widening
}

console.log(`${cands.length} candidates survived.\n`);
if (!cands.length) {
  console.log("nothing matches structurally at any scale - not a view of this image");
  process.exit(2);
}

cands.sort((a, b) => a.rms - b.rms);

// Re-fit each survivor on real pixels, which is the measurement to believe.
function bilin(img, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const g = (xx, yy) => {
    const cx = Math.min(img.width - 1, Math.max(0, xx));
    const cy = Math.min(img.height - 1, Math.max(0, yy));
    return lumAt(img, cx, cy);
  };
  return g(x0, y0) * (1 - fx) * (1 - fy) + g(x0 + 1, y0) * fx * (1 - fy)
    + g(x0, y0 + 1) * (1 - fx) * fy + g(x0 + 1, y0 + 1) * fx * fy;
}

function fullFit(c) {
  const X0 = c.dx * DS, Y0 = c.dy * DS;
  const pairs = [];
  let worst = 0;
  for (let cy = 2; cy < crop.height - 2; cy += 3) {
    for (let cx = 2; cx < crop.width - 2; cx += 3) {
      const fx = X0 + cx * c.s, fy = Y0 + cy * c.s;
      if (fx < 1 || fy < 1 || fx >= fullImg.width - 1 || fy >= fullImg.height - 1) continue;
      const f = bilin(fullImg, fx, fy);
      const cv = lumAt(crop, cx, cy);
      pairs.push([f, cv]);
    }
  }
  const r = fitResidual(pairs);
  for (const [f, cv] of pairs) {
    const d = Math.abs(r.a * f + r.b - cv);
    if (d > worst) worst = d;
  }
  return { ...c, rms: r.rms, a: r.a, b: r.b, n: pairs.length, worst };
}

const ranked = cands.slice(0, 400).map(fullFit).sort((a, b) => a.rms - b.rms);
const best = ranked[0];

console.log("re-fitted on real pixels, best 5:");
for (const c of ranked.slice(0, 5)) {
  console.log(`  rms ${c.rms.toFixed(1).padStart(5)}  worst ${String(Math.round(c.worst)).padStart(3)}`
    + `  gain ${c.a.toFixed(3)}  offset ${c.b.toFixed(1).padStart(6)}`
    + `  scale ${c.s.toFixed(2)}  at ${c.dx * DS},${c.dy * DS}`);
}

console.log(`\nbest rms ${best.rms.toFixed(1)}/255 over ${best.n} real pixels`
  + `  (gain ${best.a.toFixed(3)}, offset ${best.b.toFixed(1)})`);
console.log(`  ${best.rms < 8 ? "VERIFIED - a real view of this image"
  : best.rms < 16 ? "close, but treat the position as approximate"
    : "NOT a match"}`);

if (best.rms < 16) {
  const ox = best.dx * DS, oy = best.dy * DS;
  const ow = Math.round(crop.width * best.s), oh = Math.round(crop.height * best.s);
  console.log(`\nregion in full-frame pixels:`);
  console.log(`  x ${ox} .. ${ox + ow}`);
  console.log(`  y ${oy} .. ${oy + oh}`);
  console.log(`  centre ${Math.round(ox + ow / 2)},${Math.round(oy + oh / 2)}`
    + `  (${Math.round(((ox + ow / 2) / fullImg.width) * 100)}% across,`
    + ` ${Math.round(((oy + oh / 2) / fullImg.height) * 100)}% down)`);
}