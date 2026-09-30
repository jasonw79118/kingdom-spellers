// Geometry for the illustrated kingdom scene.
//
// Everything in the scene is built from a few primitives that all respect the
// isometric projection in ../iso.js:
//
//   catmull   — a smooth curve through control points (roads, rivers, coasts)
//   ribbon    — a band of varying width along a curve
//   blob      — a closed, irregular outline (island coasts, hills, tree crowns)
//   noise     — cheap deterministic value noise, for terrain relief and scatter
//
// Two rules the renderer depends on, both learned the hard way:
//   * `polygon points=` needs the comma form (pts), never the "M…L…" path form
//   * strokes need `d={path(...)}`
//
// The grid stays internal. Nothing here draws a tile: the scene is built from
// curves and blobs so the land never reads as a board.

import { pts, path, HALF_W, HALF_H, Z_HEIGHT } from "../iso";

export const P = (list) => pts(list, Z_HEIGHT);
export const L = (list, close = true) => path(list, close, Z_HEIGHT);
/** A grid height expressed in screen pixels, for hand-placed shapes. */
export const px = (z) => z * Z_HEIGHT;
/** Project a grid point to screen pixels, at an optional pixel elevation. */
export const at = (gx, gy, zPx = 0) => ({
  x: (gx - gy) * HALF_W,
  y: (gx + gy) * HALF_H - zPx,
});

// ---------------------------------------------------------------------------
// Deterministic noise
// ---------------------------------------------------------------------------

/** Stable 0..1 hash of two integers. Same input always gives the same output,
 *  so a player's kingdom looks identical on every visit. */
export function hash2(x, y, seed = 0) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 2246822519;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

/** A small seeded generator, so scatter is reproducible per territory. */
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Smooth value noise in 0..1 over grid space. */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

/** Two octaves of noise, for slightly more organic relief. */
export function fbm2(x, y, seed = 0) {
  return noise2(x, y, seed) * 0.65 + noise2(x * 2.3, y * 2.3, seed + 91) * 0.35;
}

// ---------------------------------------------------------------------------
// Curves
// ---------------------------------------------------------------------------

/**
 * Catmull-Rom through control points. `closed` wraps the ends, which is what
 * makes an island coast or a hill outline a loop rather than an open arc.
 */
export function catmull(control, steps = 10, closed = false) {
  const n = control.length;
  if (n < 2) return control.slice();
  const at_ = (i) => {
    if (closed) return control[((i % n) + n) % n];
    return control[Math.max(0, Math.min(n - 1, i))];
  };
  const out = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i += 1) {
    const p0 = at_(i - 1);
    const p1 = at_(i);
    const p2 = at_(i + 1);
    const p3 = at_(i + 2);
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(control[n - 1].slice());
  return out;
}

/** A closed, irregular outline — coastlines, hilltops, tree crowns. */
export function blob(cx, cy, r, { seed = 0, wobble = 0.18, lobes = 9, squash = 1, steps = 6 } = {}) {
  const rand = rng(seed + 1);
  const control = [];
  for (let i = 0; i < lobes; i += 1) {
    const a = (i / lobes) * Math.PI * 2;
    const rr = r * (1 + (rand() - 0.5) * 2 * wobble);
    control.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
  }
  return catmull(control, steps, true);
}

/**
 * A band of varying width along a curve — the basis of every road and river.
 * `widthAt` may be a number or a function of the 0..1 position along the path,
 * so a river can be broad in the middle and pinch at the banks.
 */
export function ribbon(pathPts, widthAt, z = 0) {
  const n = pathPts.length;
  const left = [];
  const right = [];
  for (let i = 0; i < n; i += 1) {
    const p = pathPts[i];
    const prev = pathPts[Math.max(0, i - 1)];
    const next = pathPts[Math.min(n - 1, i + 1)];
    let dx = next[0] - prev[0];
    let dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = typeof widthAt === "function" ? widthAt(i / (n - 1)) : widthAt;
    left.push([p[0] - dy * w, p[1] + dx * w, z]);
    right.push([p[0] + dy * w, p[1] - dx * w, z]);
  }
  return [...left, ...right.reverse()];
}

/** Project a curve into screen space, optionally lifted by a pixel height. */
export function project(pathPts, zPx = 0) {
  return pathPts.map(([gx, gy]) => at(gx, gy, zPx));
}

export const screenPts = (pathPts, zPx = 0) =>
  project(pathPts, zPx)
    .map((p) => `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`)
    .join(" ");

/** A closed ring in screen space, used for coasts and hilltops. */
export const screenRing = (pathPts, zPx = 0) => screenPts([...pathPts, pathPts[0]], zPx);

/**
 * Drop an already-projected closed ring by `dy` screen pixels. Used for the
 * land's crust: project the coast once, then stack the rock, soil and grass
 * bands off the same outline instead of re-projecting it three times.
 */
export const dropRing = (pointsAttr, dy) =>
  pointsAttr
    .split(" ")
    .map((pair) => {
      const [x, y] = pair.split(",");
      return `${x},${Math.round((parseFloat(y) + dy) * 100) / 100}`;
    })
    .join(" ");

/** Shrink a grid-space ring toward a centre, for fringes and insets. */
export const shrink = (ring, k, cx, cy) =>
  ring.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);

/** How wide a closed ring is in screen pixels, for crust offsets and viewBox. */
export function bounds(pathPts) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [gx, gy] of pathPts) {
    const p = at(gx, gy);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

// ---------------------------------------------------------------------------
// Collision (grid-space rectangles — invisible, maths only)
// ---------------------------------------------------------------------------

/** Axis-aligned footprint. The grid is never drawn; this is maths only. */
export const rect = (x, y, w, d) => ({ cx: x + w / 2, cy: y + d / 2, w, d });

export const overlaps = (a, b, margin = 0.06) =>
  Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 + margin &&
  Math.abs(a.cy - b.cy) < (a.d + b.d) / 2 + margin;

/** Distance from a point to a curve, used to keep scatter off roads and water. */
export function distToPath(pathPts, x, y) {
  let best = Infinity;
  for (let i = 0; i < pathPts.length - 1; i += 1) {
    const [ax, ay] = pathPts[i];
    const [bx, by] = pathPts[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((x - ax) * dx + (y - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
    if (d < best) best = d;
  }
  return best;
}
