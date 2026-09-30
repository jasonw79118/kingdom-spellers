// Isometric projection helpers.
//
// The scene is a diamond grid. World space is (gx, gy, gz) where:
//   gx runs down-and-right, gy runs down-and-left, gz is height upwards.
//
// Projection uses the classic 2:1 pixel ratio, which reads as "isometric" to
// everyone and keeps the maths simple:
//
//   screenX = (gx - gy) * TILE_W / 2
//   screenY = (gx + gy) * TILE_H / 2 - gz
//
// Everything here returns plain {x, y} so it can be dropped straight into an
// SVG path or polygon, and depth is handled by sorting on (gx + gy).

export const TILE_W = 64;
export const TILE_H = 32;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

// Vertical exaggeration for built things.
//
// A tile is 64 wide but only 16 tall on screen, so projecting height 1:1 makes
// a two-storey house a 1-unit sliver beside a 128px-wide roof. This factor is
// what makes a wall of height 1 look like a wall rather than a line. Terrain
// passes zs = 1, because its z values are already thin decorative offsets;
// buildings pass Z_HEIGHT.
export const Z_HEIGHT = 40;

export function iso(gx, gy, gz = 0, zs = 1) {
  return {
    x: (gx - gy) * HALF_W,
    y: (gx + gy) * HALF_H - gz * zs,
  };
}

/** Build an SVG "points" string from a list of [gx, gy, gz] triples. */
export function pts(list, zs = 1) {
  return list
    .map((p) => {
      const q = iso(p[0], p[1], p[2] || 0, zs);
      return `${round(q.x)},${round(q.y)}`;
    })
    .join(" ");
}

/** Build an SVG path ("M x y L x y … Z") from a list of triples. */
export function path(list, close = true, zs = 1) {
  if (!list.length) return "";
  const first = iso(list[0][0], list[0][1], list[0][2] || 0, zs);
  let d = `M${round(first.x)},${round(first.y)}`;
  for (let i = 1; i < list.length; i += 1) {
    const q = iso(list[i][0], list[i][1], list[i][2] || 0, zs);
    d += ` L${round(q.x)},${round(q.y)}`;
  }
  return close ? `${d} Z` : d;
}

/**
 * A box occupying [x, x+w] × [y, y+d] from height z to z+h.
 * Returns the three visible faces (top, and the two sides that face the
 * camera), which is all you can see in a fixed isometric view.
 */
export function boxFaces(x, y, z, w, d, h) {
  const x2 = x + w;
  const y2 = y + d;
  const zt = z + h;
  return {
    top: [[x, y, zt], [x2, y, zt], [x2, y2, zt], [x, y2, zt]],
    // The face pointing down-right (+x side).
    right: [[x2, y, z], [x2, y2, z], [x2, y2, zt], [x2, y, zt]],
    // The face pointing down-left (+y side).
    front: [[x, y2, z], [x2, y2, z], [x2, y2, zt], [x, y2, zt]],
  };
}

/**
 * A gable roof sitting on a box. The ridge runs along +x at the midpoint of
 * the depth, which is the orientation used for every house in the village.
 */
export function gableFaces(x, y, z, w, d, h, rise) {
  const x2 = x + w;
  const y2 = y + d;
  const ym = y + d / 2;
  const zt = z + h;
  const zr = zt + rise;
  return {
    // Near slope, seen face-on.
    slope: [[x, ym, zr], [x2, ym, zr], [x2, y2, zt], [x, y2, zt]],
    // Far slope, only a sliver shows past the ridge.
    back: [[x, ym, zr], [x, y, zt], [x2, y, zt], [x2, ym, zr]],
    // Gable end (triangular) on the +x side.
    end: [[x2, y, zt], [x2, y2, zt], [x2, ym, zr]],
  };
}

/** Depth key: larger (gx + gy) is nearer the camera, so draw it last. */
export function depthOf(gx, gy) {
  return gx + gy;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/** Shade a hex colour darker (amount < 0) or lighter (amount > 0). */
export function shade(hex, amount) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const to = (v) => {
    const n = parseInt(v, 16);
    const t = amount < 0 ? 0 : 255;
    const p = Math.abs(amount);
    return Math.round((t - n) * p + n).toString(16).padStart(2, "0");
  };
  return `#${to(m[1])}${to(m[2])}${to(m[3])}`;
}

/** Three tones for the three faces of a box: top, right, front. */
export function boxTones(base) {
  return {
    top: shade(base, 0.16),
    right: shade(base, -0.14),
    front: shade(base, -0.28),
    line: shade(base, -0.45),
  };
}
