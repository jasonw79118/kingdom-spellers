// Roofs.
//
// The single biggest thing separating "detailed medieval village illustration"
// from "prototype" is the roof. A prototype has one triangle. The target style
// has, on every building:
//
//   * an overhang, so the roof is wider than the walls and casts an eave shadow
//   * a slope drawn as COURSES of tiles with staggered seams, not a flat fill
//   * a ridge cap of separate capping tiles along the crest
//   * exposed rafter tails under the overhang
//   * a fascia board, and a gable end that is itself a framed wall
//   * and then more than one of: dormers, a cross-gable, a chimney, a lean-to
//
// The course and seam detail is generated, so a wide roof gets more tiles than
// a narrow one and the density stays right at any size.

import { shade, iso, Z_HEIGHT } from "../../iso";
import { MAT, tones } from "./materials";
import { wallPt, wallRect, wallPoly } from "./walls";

const fmt = (p) => `${round(p.x)},${round(p.y)}`;
const P3 = (list) => list.map((p) => fmt(iso(p[0], p[1], p[2], Z_HEIGHT))).join(" ");
const round = (n) => Math.round(n * 100) / 100;

/**
 * One pitched slope.
 *
 * `dir` is +1 for the slope facing +y (down-left, the face the viewer reads)
 * and -1 for the far slope. Courses run parallel to the ridge; within each
 * course the seams are staggered, the way a real roofer lays them.
 */
function Slope({ rx0, rx1, yEave, zEave, yRidge, zRidge, face, seed, detail = 1 }) {
  const cols = Math.max(3, Math.round(Math.abs(rx1 - rx0) * 5 * detail));
  const rows = Math.max(2, Math.round(Math.abs(zRidge - zEave) * 26 * detail));
  const out = [];

  const at = (t, u) => [
    u,
    yEave + (yRidge - yEave) * t,
    zEave + (zRidge - zEave) * t,
  ];

  // Course tiles, each nudged in tone so the slope shimmers like fired clay.
  for (let r = 0; r < rows; r += 1) {
    const t0 = r / rows;
    const t1 = (r + 1) / rows;
    for (let c = 0; c < cols; c += 1) {
      const stagger = r % 2 === 0 ? 0 : 0.5;
      const u0 = rx0 + ((rx1 - rx0) * (c - stagger)) / cols;
      const u1 = rx0 + ((rx1 - rx0) * (c + 1 - stagger)) / cols;
      const a = Math.max(rx0, u0);
      const b = Math.min(rx1, u1);
      if (b - a < 0.02) continue;
      const k = Math.abs(((r * 31 + c * 17 + Math.round(seed * 13)) % 7) - 3) * 0.028;
      // The bottom edge of each course is darker: the course laps over the one
      // below, so it throws a small shadow on it.
      out.push(
        <polygon
          key={`${r}-${c}`}
          points={P3([at(t0, a), at(t0, b), at(t1, b), at(t1, a)])}
          fill={shade(face, k)}
        />,
      );
      if (detail > 0.6) {
        out.push(
          <polygon
            key={`s${r}-${c}`}
            points={P3([at(t0, a), at(t0, b), at(t0 + 0.06 / rows, b), at(t0 + 0.06 / rows, a)])}
            fill={shade(face, -0.16)}
            opacity={0.55}
          />,
        );
      }
    }
  }
  return out;
}

/**
 * A pitched roof over a rectangle.
 *
 * `along` is the axis the ridge runs down: "x" gives a ridge running along +x,
 * so the slope the viewer sees faces +y. "y" flips it.
 */
export function Roof({
  x,
  y,
  w,
  d,
  z,
  rise,
  overhang = 0.16,
  face = MAT.tile[0],
  along = "x",
  seed = 0,
  detail = 1,
  /** Gable ends are framed walls drawn by the caller; this draws the triangle. */
  gables = true,
  gableFill = MAT.plaster[0],
}) {
  const rx0 = x - overhang;
  const rx1 = x + w + overhang;
  const ry0 = y - overhang;
  const ry1 = y + d + overhang;
  const ym = y + d / 2;
  const zr = z + rise;
  const alongX = along === "x";

  // Slopes and eaves are computed in the axis the ridge runs down, then mapped
  // into world space, so both orientations share one code path.
  const s0 = alongX ? rx0 : ry0;             // near end of the ridge
  const s1 = alongX ? rx1 : ry1;             // far end
  const eNear = alongX ? ry1 : rx1;          // eave on the +y / +x side
  const eFar = alongX ? ry0 : rx0;
  const m = alongX ? ym : y + w / 2;
  void eFar;

  const pt = (s, e, zz) => (alongX ? [s, e, zz] : [e, s, zz]);
  const g0 = pt(s0, eNear, z);
  const g1 = pt(s1, eNear, z);
  const g2 = pt(s1, m, zr);
  const g3 = pt(s0, m, zr);
  void g0; void g1; void g2; void g3;

  const out = [];

  // The far slope is behind the ridge and invisible from a fixed camera, so it
  // is skipped; instead the ridge gets a proper capping course.
  out.push(...Slope({ rx0: s0, rx1: s1, yEave: eNear, zEave: z, yRidge: m, zRidge: zr, face, seed, detail }));

  // Ridge capping: individual tiles straddling the crest.
  const caps = Math.max(4, Math.round(Math.abs(s1 - s0) * 9));
  const capW = 0.055;
  for (let i = 0; i < caps; i += 1) {
    const a = s0 + ((s1 - s0) * i) / caps;
    const b = s0 + ((s1 - s0) * (i + 1)) / caps;
    out.push(
      <polygon
        key={`cap${i}`}
        points={P3([pt(a, m - capW, zr + 0.012), pt(b, m - capW, zr + 0.012), pt(b, m + capW, zr + 0.012), pt(a, m + capW, zr + 0.012)])}
        fill={i % 2 ? MAT.ridge : shade(MAT.ridge, -0.09)}
      />,
    );
    out.push(
      <polygon
        key={`capb${i}`}
        points={P3([pt(a, m - capW, zr), pt(b, m - capW, zr), pt(b, m + capW, zr), pt(a, m + capW, zr)])}
        fill={MAT.ridgeDark}
        opacity={0.8}
      />,
    );
  }

  // Fascia along the near eave, plus the shadow it throws on the wall.
  out.push(
    <polygon key="fascia" points={P3([pt(s0, eNear, z), pt(s1, eNear, z), pt(s1, eNear, z - 0.045), pt(s0, eNear, z - 0.045)])} fill={shade(face, -0.34)} />,
  );

  // Exposed rafter tails poking out from under the overhang.
  const tails = Math.max(4, Math.round(Math.abs(s1 - s0) * 7));
  for (let i = 0; i < tails; i += 1) {
    const a = s0 + ((s1 - s0) * (i + 0.5)) / tails;
    const w = Math.abs(s1 - s0) / tails / 2.6;
    out.push(
      <polygon
        key={`rt${i}`}
        points={P3([pt(a - w, eNear, z - 0.045), pt(a + w, eNear, z - 0.045), pt(a + w, eNear, z - 0.105), pt(a - w, eNear, z - 0.105)])}
        fill={i % 2 ? MAT.beam : MAT.beamDark}
      />,
    );
  }

  // Gable triangles. Only the +x / +y one faces the camera; both are drawn so
  // the silhouette is closed when a building is seen from an angle in the map.
  let gableNodes = [];
  if (gables) {
    const t = tones(gableFill);
    const nearGable = alongX
      ? [[rx1, ry0, z], [rx1, ry1, z], [rx1, ym, zr]]
      : [[rx0, ry1, z], [rx1, ry1, z], [x + w / 2, ry1, zr]];
    const farGable = alongX
      ? [[rx0, ry0, z], [rx0, ry1, z], [rx0, ym, zr]]
      : [[rx0, ry0, z], [rx1, ry0, z], [x + w / 2, ry0, zr]];
    gableNodes = [
      <polygon key="gf" points={P3(farGable)} fill={shade(t.right, -0.18)} />,
      <polygon key="gn" points={P3(nearGable)} fill={t.right} />,
      // A collar tie across the gable, and the ridge beam showing at the apex.
      <polygon
        key="tie"
        points={P3(
          alongX
            ? [[rx1, ry0 + 0.12, z + rise * 0.34], [rx1, ry1 - 0.12, z + rise * 0.34], [rx1, ry1 - 0.12, z + rise * 0.28], [rx1, ry0 + 0.12, z + rise * 0.28]]
            : [[rx0 + 0.12, ry1, z + rise * 0.34], [rx1 - 0.12, ry1, z + rise * 0.34], [rx1 - 0.12, ry1, z + rise * 0.28], [rx0 + 0.12, ry1, z + rise * 0.28]],
        )}
        fill={MAT.beam}
        opacity={0.9}
      />,
    ];
  }

  // Painter's order: the far gable sits behind the slope, the near one in front.
  return (
    <g data-role="roof" data-along={along}>
      {gables ? gableNodes[0] : null}
      {out}
      {gables ? gableNodes.slice(1) : null}
    </g>
  );
}

/**
 * A chimney: a stone stack that passes through the roof and rises above the
 * ridge, with a corbelled cap and a dark throat.
 */
export function Chimney({ x, y, z, zTop, w = 0.2, d = 0.2, seed = 0, smoke = false }) {
  const x2 = x + w;
  const y2 = y + d;
  const out = [];

  // The +y face, in courses.
  const rows = Math.max(2, Math.round((zTop - z) / 0.13));
  for (let r = 0; r < rows; r += 1) {
    const za = z + ((zTop - z) * r) / rows;
    const zb = z + ((zTop - z) * (r + 1)) / rows;
    const cols = 3;
    for (let c = 0; c < cols; c += 1) {
      const ua = x + (w * c) / cols + 0.006;
      const ub = x + (w * (c + 1)) / cols - 0.006;
      const k = ((r * 13 + c * 29 + Math.round(seed * 7)) % 5) * 0.022 - 0.044;
      out.push(
        <polygon
          key={`f${r}-${c}`}
          points={P3([[ua, y2, za + 0.005], [ub, y2, za + 0.005], [ub, y2, zb - 0.005], [ua, y2, zb - 0.005]])}
          fill={shade(MAT.stone, k)}
        />,
      );
    }
  }
  // The +x face, darker.
  for (let r = 0; r < rows; r += 1) {
    const za = z + ((zTop - z) * r) / rows;
    const zb = z + ((zTop - z) * (r + 1)) / rows;
    out.push(
      <polygon
        key={`r${r}`}
        points={P3([[x2, y + 0.006, za + 0.005], [x2, y2 - 0.006, za + 0.005], [x2, y2 - 0.006, zb - 0.005], [x2, y + 0.006, zb - 0.005]])}
        fill={shade(MAT.stoneDark, ((r % 3) * 0.03) - 0.03)}
      />,
    );
  }
  // Cap: a wider slab, then the dark throat.
  const cw = 0.032;
  out.push(
    <polygon key="capf" points={P3([[x - cw, y2 + cw, zTop], [x2 + cw, y2 + cw, zTop], [x2 + cw, y2 + cw, zTop + 0.04], [x - cw, y2 + cw, zTop + 0.04]])} fill={MAT.stoneLight} />,
  );
  out.push(
    <polygon key="capr" points={P3([[x2 + cw, y - cw, zTop], [x2 + cw, y2 + cw, zTop], [x2 + cw, y2 + cw, zTop + 0.04], [x2 + cw, y - cw, zTop + 0.04]])} fill={MAT.stone} />,
  );
  out.push(
    <polygon key="captop" points={P3([[x - cw, y - cw, zTop + 0.04], [x2 + cw, y - cw, zTop + 0.04], [x2 + cw, y2 + cw, zTop + 0.04], [x - cw, y2 + cw, zTop + 0.04]])} fill={shade(MAT.stoneLight, 0.16)} />,
  );
  out.push(
    <polygon key="throat" points={P3([[x + 0.026, y + 0.026, zTop + 0.045], [x2 - 0.026, y + 0.026, zTop + 0.045], [x2 - 0.026, y2 - 0.026, zTop + 0.045], [x + 0.026, y2 - 0.026, zTop + 0.045]])} fill="#2a2320" />,
  );
  return <g data-role="chimney">{out}</g>;
}

/**
 * A lean-to: a single-pitch roof sloping away from a wall, the way a medieval
 * workshop, byre or market stall is covered. `axis`/`plane` say which wall it
 * hangs off, and it projects `depth` grid units away from it.
 */
export function LeanTo({ axis = "x", plane, u0, u1, zHigh, zLow, depth = 0.5, face = MAT.shingle[0], seed = 0, detail = 1 }) {
  const out = [];
  const w = u1 - u0;
  const cols = Math.max(3, Math.round(w * 5 * detail));
  const rows = Math.max(2, Math.round(Math.abs(zHigh - zLow) * 22 * detail));
  const pt = (t, u) => (axis === "x" ? [u, plane + depth * t, zHigh + (zLow - zHigh) * t] : [plane + depth * t, u, zHigh + (zLow - zHigh) * t]);

  for (let r = 0; r < rows; r += 1) {
    const t0 = r / rows;
    const t1 = (r + 1) / rows;
    for (let c = 0; c < cols; c += 1) {
      const stag = r % 2 === 0 ? 0 : 0.5;
      const a = u0 + (w * (c - stag)) / cols;
      const b = u0 + (w * (c + 1 - stag)) / cols;
      const k = Math.abs(((r * 19 + c * 23 + Math.round(seed * 11)) % 6) - 3) * 0.03;
      out.push(
        <polygon
          key={`${r}-${c}`}
          points={P3([pt(t0, Math.max(u0, a)), pt(t0, Math.min(u1, b)), pt(t1, Math.min(u1, b)), pt(t1, Math.max(u0, a))])}
          fill={shade(face, k)}
        />,
      );
      out.push(
        <polygon
          key={`s${r}-${c}`}
          points={P3([pt(t0, Math.max(u0, a)), pt(t0, Math.min(u1, b)), pt(t0 + 0.05 / rows, Math.min(u1, b)), pt(t0 + 0.05 / rows, Math.max(u0, a))])}
          fill={shade(face, -0.17)}
          opacity={0.5}
        />,
      );
    }
  }
  // Posts holding the low edge up.
  const posts = Math.max(2, Math.round(w / 0.45));
  for (let i = 0; i <= posts; i += 1) {
    const u = u0 + (w * i) / posts;
    // A visible post running down to the ground from the low edge.
    const g = axis === "x" ? iso(u, plane + depth, 0, Z_HEIGHT) : iso(plane + depth, u, 0, Z_HEIGHT);
    const top = axis === "x" ? iso(u, plane + depth, zLow, Z_HEIGHT) : iso(plane + depth, u, zLow, Z_HEIGHT);
    out.push(
      <path
        key={`pg${i}`}
        d={`M${round(g.x)},${round(g.y)} L${round(top.x)},${round(top.y)}`}
        stroke={MAT.beam}
        strokeWidth={2.2}
        strokeLinecap="round"
      />,
    );
  }
  return <g data-role="leanto">{out}</g>;
}

/**
 * A tower: cylindrical, because a square tower in isometric reads as a box.
 * Draws the drum as a shaded band with courses, plus a corbel table and a
 * conical roof with individual tiles running up it.
 */
export function Tower({ x, y, z, h = 1.2, r = 0.2, cap = 0.34, face = MAT.slate[0], windows = 2, seed = 0 }) {
  const out = [];
  const steps = 14;
  const g = (a, zz) => iso(x + Math.cos(a) * r, y + Math.sin(a) * r, zz, Z_HEIGHT);

  // The drum, as a series of vertical strips so it shades like a cylinder.
  for (let i = 0; i < steps; i += 1) {
    const a0 = (Math.PI * 2 * i) / steps;
    const a1 = (Math.PI * 2 * (i + 1)) / steps;
    // Light from the upper left: brightest on the left flank.
    const mid = (a0 + a1) / 2;
    const lam = Math.cos(mid - Math.PI * 1.15);
    const k = lam * 0.3;
    const p0 = g(a0, z);
    const p1 = g(a1, z);
    const p2 = g(a1, z + h);
    const p3 = g(a0, z + h);
    out.push(
      <polygon
        key={`d${i}`}
        points={`${fmt(p0)} ${fmt(p1)} ${fmt(p2)} ${fmt(p3)}`}
        fill={shade(MAT.stone, k)}
      />,
    );
    // Masonry courses.
    if (i % 2 === 0) {
      for (let c = 1; c < 5; c += 1) {
        const zz = z + (h * c) / 5;
        out.push(
          <path
            key={`c${i}-${c}`}
            d={`M${round(p0.x)},${round(p0.y + (p3.y - p0.y) * (c / 5))} L${round(p1.x)},${round(p1.y + (p2.y - p1.y) * (c / 5))}`}
            stroke={shade(MAT.stoneDark, -0.06)}
            strokeWidth={0.5}
            opacity={0.5}
          />,
        );
      }
    }
  }

  // Arrow slits, evenly spaced on the lit side.
  for (let i = 0; i < windows; i += 1) {
    const a = Math.PI * 0.75 + (i * Math.PI) / (windows + 1);
    const p0 = g(a, z + h * 0.55);
    out.push(
      <path
        key={`w${i}`}
        d={`M${round(p0.x)},${round(p0.y)} L${round(p0.x)},${round(p0.y - 12)}`}
        stroke="#2b241f"
        strokeWidth={3}
        strokeLinecap="round"
      />,
    );
  }

  // Corbel table: machicolations poking out under the parapet.
  const corbels = 9;
  for (let i = 0; i < corbels; i += 1) {
    const a = (Math.PI * 2 * i) / corbels;
    const p = g(a, z + h);
    const q = iso(x + Math.cos(a) * (r + 0.035), y + Math.sin(a) * (r + 0.035), z + h + 0.05, Z_HEIGHT);
    out.push(
      <polygon
        key={`cb${i}`}
        points={`${fmt(p)} ${fmt(q)} ${fmt(iso(x + Math.cos(a) * (r + 0.035), y + Math.sin(a) * (r + 0.035), z + h, Z_HEIGHT))}`}
        fill={shade(MAT.stone, 0.1)}
      />,
    );
  }

  // Conical roof with tiles fanning up to the finial.
  const rTop = 0.03;
  const cones = 12;
  for (let i = 0; i < cones; i += 1) {
    const a0 = (Math.PI * 2 * i) / cones;
    const a1 = (Math.PI * 2 * (i + 1)) / cones;
    const mid = (a0 + a1) / 2;
    const k = Math.cos(mid - Math.PI * 1.15) * 0.26;
    out.push(
      <polygon
        key={`k${i}`}
        points={`${fmt(g(a0, z + h + 0.06))} ${fmt(g(a1, z + h + 0.06))} ${fmt(iso(x + Math.cos(a0) * rTop, y + Math.sin(a0) * rTop, z + h + cap, Z_HEIGHT))} ${fmt(iso(x + Math.cos(a1) * rTop, y + Math.sin(a1) * rTop, z + h + cap, Z_HEIGHT))}`}
        fill={shade(face, k)}
      />,
    );
    // Tile courses up the cone.
    if (i % 2 === 0) {
      for (let c = 1; c < 4; c += 1) {
        const t = c / 4;
        const rr = r + (rTop - r) * t;
        const zz = z + h + 0.06 + (cap - 0.06) * t;
        out.push(
          <path
            key={`kc${i}-${c}`}
            d={`M${round(g(a0, zz).x + (iso(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr, zz, Z_HEIGHT).x - g(a0, zz).x) * 0)},${round(g(a0, zz).y)} L${round(g(a1, zz).x)},${round(g(a1, zz).y)}`}
            stroke={shade(face, -0.2)}
            strokeWidth={0.6}
            opacity={0.5}
          />,
        );
      }
    }
  }
  // Finial.
  const tip = iso(x, y, z + h + cap + 0.07, Z_HEIGHT);
  out.push(<circle key="fin" cx={round(tip.x)} cy={round(tip.y)} r={2} fill={MAT.brass} />);
  out.push(<path key="fins" d={`M${round(tip.x)},${round(tip.y)} L${round(tip.x)},${round(tip.y - 8)}`} stroke={MAT.iron} strokeWidth={1.4} />);

  return <g data-role="tower" data-seed={seed}>{out}</g>;
}

export { P3 as roofPts, round as roofRound };
