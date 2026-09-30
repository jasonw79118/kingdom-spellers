// Walls.
//
// This is the piece that decides whether the buildings read as medieval or as
// prototypes. A prototype wall is one flat quad. A medieval wall is:
//
//   * a stone footing course that the timber frame stands on
//   * lime plaster panels
//   * exposed timber: corner posts, a sill beam, a top plate, intermediate
//     studs, and — the detail that does the most work — DIAGONAL BRACES at the
//     corners, which is what makes the eye read "timber frame"
//   * a subtle vertical wash so the plaster is never one dead colour
//   * optional stone masonry for the lower storey of bigger buildings
//
// Geometry contract: a wall lies in a vertical plane.
//   axis "x" -> the wall sits at a constant y and runs along x
//   axis "y" -> the wall sits at a constant x and runs along y
// `u` is the along-wall coordinate, `z` the height. `out` pushes the surface
// toward the camera so overlapping panels (an upper storey jutting out over a
// jetty, a dormer cheek) layer without z-fighting.

import { shade, iso, Z_HEIGHT } from "../../iso";
import { MAT, tones } from "./materials";

const fmt = (p) => `${round(p.x)},${round(p.y)}`;

/** Screen position of a point in a wall's plane. `out` is in grid units. */
export function wallPt(axis, plane, u, z, out = 0) {
  return axis === "x"
    ? iso(u, plane + out, z, Z_HEIGHT)
    : iso(plane + out, u, z, Z_HEIGHT);
}

/** Points string for a wall-space rectangle. */
export function wallRect(axis, plane, u0, u1, z0, z1, out = 0) {
  return (
    [
      [u0, z0], [u1, z0], [u1, z1], [u0, z1],
    ]
      .map(([u, z]) => wallPt(axis, plane, u, z, out))
      .map(fmt)
      .join(" ")
  );
}

/** Points string for a four-point wall-space quad. */
export function wallPoly(axis, plane, list, out = 0) {
  return list.map(([u, z]) => wallPt(axis, plane, u, z, out)).map(fmt).join(" ");
}

/** A line drawn in a wall's plane — used for laths, courses and braces. */
export function wallLine(axis, plane, u0, z0, u1, z1, out = 0) {
  const a = wallPt(axis, plane, u0, z0, out);
  const b = wallPt(axis, plane, u1, z1, out);
  return `M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)}`;
}

/**
 * A diagonal timber brace as a filled quad, in wall space. `w` is its width.
 * Returns the four corners so it can be lit like a face rather than stroked.
 */
export function braceQuad(u0, z0, u1, z1, w) {
  const du = u1 - u0;
  const dz = z1 - z0;
  const len = Math.hypot(du, dz) || 1;
  const nu = (-dz / len) * (w / 2);
  const nz = (du / len) * (w / 2);
  return [
    [u0 + nu, z0 + nz],
    [u1 + nu, z1 + nz],
    [u1 - nu, z1 - nz],
    [u0 - nu, z0 - nz],
  ];
}

/**
 * The default timber frame layout for a panel, in wall-space rects.
 * Returns an array of { u0, u1, z0, z1 } in grid units.
 */
function frameRects(u0, u1, z0, z1, bw, studs, style) {
  const out = [];
  const push = (a, b, c, d) => out.push({ u0: a, u1: b, z0: c, z1: d });
  const h = z1 - z0;

  push(u0, u0 + bw, z0, z1);                    // left corner post
  push(u1 - bw, u1, z0, z1);                    // right corner post
  push(u0, u1, z0, z0 + bw * 0.9);               // sill beam
  push(u0, u1, z1 - bw, z1);                    // top plate

  // Mid rail on anything taller than a single storey panel.
  if (h > 0.55) {
    const zm = z0 + h * (style === "upper" ? 0.62 : 0.5);
    push(u0 + bw, u1 - bw, zm - bw * 0.45, zm + bw * 0.45);
  }

  // Studs, evenly spread with a slightly irregular final gap.
  const span = u1 - u0 - bw * 2;
  for (let i = 1; i <= studs; i += 1) {
    const u = u0 + bw + (span * i) / (studs + 1);
    push(u - bw * 0.34, u + bw * 0.34, z0 + bw * 0.7, z1 - bw * 0.8);
  }
  return out;
}

/** The diagonal braces for a panel — the signature of a timber frame. */
function frameBraces(u0, u1, z0, z1, bw, style) {
  const out = [];
  const inset = bw * 1.15;
  const h = z1 - z0;
  // Braces spring from the sill up to the top plate, at both corners.
  out.push(braceQuad(u0 + inset, z0 + bw, u0 + inset + h * 0.62, z0 + bw + h * 0.62, bw * 0.78));
  out.push(braceQuad(u1 - inset, z0 + bw, u1 - inset - h * 0.62, z0 + bw + h * 0.62, bw * 0.78));
  // A half-height St Andrew's cross on wide panels, as real frames have.
  if (u1 - u0 > 1.9 && h > 0.7) {
    const mid = (z0 + z1) / 2;
    const s = Math.min(h * 0.34, (u1 - u0) * 0.24);
    out.push(braceQuad(u0 + inset, mid, u0 + inset + s, mid + s, bw * 0.6));
    out.push(braceQuad(u1 - inset, mid, u1 - inset - s, mid + s, bw * 0.6));
  }
  if (style === "upper") {
    // Upper storeys of a jettied building get a mid-rail X in every bay.
    const zm = z0 + h * 0.62;
    const s = h * 0.3;
    out.push(braceQuad(u0 + inset, zm - s, u0 + inset + s, zm, bw * 0.55));
    out.push(braceQuad(u1 - inset, zm - s, u1 - inset - s, zm, bw * 0.55));
  }
  return out;
}

/**
 * Irregular stone courses for a masonry wall: rows of blocks with staggered
 * vertical joints, each block shaded slightly differently.
 */
function stoneRows(u0, u1, z0, z1, rowH, seed) {
  const rows = Math.max(1, Math.round((z1 - z0) / rowH));
  const h = (z1 - z0) / rows;
  const blocks = [];
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let r = 0; r < rows; r += 1) {
    const za = z0 + r * h;
    // Courses are wider at the bottom of a wall, like real rubble masonry.
    const inset = 0.012 * r;
    let u = u0 + inset;
    // Stagger alternate courses by half a block.
    let first = 0.16 + rnd() * 0.2;
    if (r % 2 === 1) first = first * 0.5;
    u += first;
    while (u < u1 - inset - 0.1) {
      const w = 0.2 + rnd() * 0.3;
      const ub = Math.min(u + w, u1 - inset);
      if (ub - u > 0.07) {
        blocks.push({ u0: u, u1: ub, z0: za, z1: za + h, t: rnd() });
      }
      u = ub + 0.012;
    }
  }
  return blocks;
}

/**
 * A wall.
 *
 * `pattern` picks the construction:
 *   "timber"  lime plaster between exposed beams (the default for cottages)
 *   "upper"   as timber, but the lighter top storey of a jettied building
 *   "stone"   coursed rubble masonry (manor ground floor, forge walls)
 *   "plaster" plain limewash with a wash and no beams — for small sheds
 */
export function Wall({
  axis = "x",
  plane,
  u0,
  u1,
  z0,
  z1,
  fill = MAT.plaster[0],
  pattern = "timber",
  seed = 0,
  out = 0,
  studs = 3,
  beamColor = null,
  /** Show a dark band at the very bottom where the wall meets the ground. */
  skirt = true,
}) {
  const t = tones(fill);
  const beam = beamColor || MAT.beam;
  const bw = Math.min(0.075, (z1 - z0) * 0.12);
  const key = `${pattern}-${u0}-${u1}-${z0}-${z1}-${seed}`;

  // Masonry reads as its own set of blocks; timber as plaster plus beams.
  if (pattern === "stone") {
    const blocks = stoneRows(u0, u1, z0, z1, 0.15, Math.round(seed * 31) + 7);
    return (
      <g key={key} data-role="wall" data-pattern={pattern}>
        <polygon points={wallRect(axis, plane, u0, u1, z0, z1, out)} fill={MAT.mortar} />
        {blocks.map((b, i) => (
          <polygon
            key={i}
            points={wallRect(axis, plane, b.u0, b.u1, b.z0 + 0.008, b.z1 - 0.008, out + 0.002)}
            fill={shade(MAT.stone, (b.t - 0.5) * 0.22)}
          />
        ))}
        {/* A darker course line at each bed joint catches the light. */}
        {Array.from({ length: Math.round((z1 - z0) / 0.15) }, (_, i) => {
          const zz = z0 + i * ((z1 - z0) / Math.round((z1 - z0) / 0.15));
          return (
            <path
              key={`j${i}`}
              d={wallLine(axis, plane, u0, zz, u1, zz, out + 0.004)}
              stroke={shade(MAT.stoneDark, -0.1)}
              strokeWidth={0.5}
              opacity={0.55}
            />
          );
        })}
        {skirt && (
          <polygon
            points={wallRect(axis, plane, u0, u1, z0, z0 + 0.07, out + 0.005)}
            fill={shade(MAT.stoneDark, -0.18)}
            opacity={0.6}
          />
        )}
      </g>
    );
  }

  const rects = pattern === "plaster" ? [] : frameRects(u0, u1, z0, z1, bw, studs, pattern);
  const braces = pattern === "plaster" ? [] : frameBraces(u0, u1, z0, z1, bw, pattern);

  // The plaster is drawn as one patch per structural bay rather than as a
  // single quad for the whole wall. Two reasons, and they are the same reason:
  // a real timber frame is infilled bay by bay, each panel limewashed
  // separately and dried to a slightly different tone, and a wall broken into
  // bays cannot be read as one flat colour at any distance.
  //
  // Bay edges follow the frame itself - the corner posts, then one panel
  // between each pair of studs - so the plaster panels land exactly where the
  // carpentry says they should. Unframed "plaster" walls are simply divided up
  // to a plausible panel width.
  const bayEdges = [u0, u1];
  if (pattern === "plaster") {
    const n = Math.max(2, Math.round((u1 - u0) / 0.42));
    for (let i = 1; i < n; i += 1) bayEdges.push(u0 + ((u1 - u0) * i) / n);
  } else {
    bayEdges.push(u0 + bw, u1 - bw);
    const span = u1 - u0 - bw * 2;
    for (let i = 1; i <= studs; i += 1) {
      bayEdges.push(u0 + bw + (span * i) / (studs + 1));
    }
  }
  bayEdges.sort((a, b) => a - b);
  const bays = [];
  for (let i = 0; i < bayEdges.length - 1; i += 1) {
    const a = bayEdges[i];
    const b = bayEdges[i + 1];
    if (b - a < 0.02) continue;
    bays.push({ a, b, t: deterministic(seed, i) });
  }

  const h = z1 - z0;
  // Bays overlap by a hair so antialiasing cannot open a seam between them.
  // There is deliberately no full-wall quad behind them: one flat fill the size
  // of the whole wall is the single thing that makes an illustration read as a
  // shaded rectangle.
  const OVERLAP = 0.004;

  return (
    <g key={key} data-role="wall" data-pattern={pattern}>
      {bays.map((bay, i) => {
        const a = Math.max(u0, bay.a - OVERLAP);
        const b = Math.min(u1, bay.b + OVERLAP);
        // Each limewashed panel dries a little differently. Small, but it is
        // the difference between a wall and a swatch.
        const tone = shade(fill, (bay.t - 0.5) * 0.11);
        return (
          <g key={`bay${i}`}>
            <polygon points={wallRect(axis, plane, a, b, z0, z1, out + 0.001)} fill={tone} />
            {/* Lighter toward the top, where the eaves shed the rain. */}
            <polygon
              points={wallRect(axis, plane, a, b, z1 - h * 0.34, z1, out + 0.002)}
              fill={shade(tone, 0.09)}
              opacity={0.75}
            />
            {/* Damp and staining creeping up from the ground. */}
            <polygon
              points={wallRect(axis, plane, a, b, z0, z0 + h * 0.4, out + 0.002)}
              fill={shade(tone, -0.13)}
              opacity={0.5}
            />
            {/* A hairline joint where two bays meet, so the frame reads. */}
            <path
              d={wallLine(axis, plane, bay.b, z0, bay.b, z1, out + 0.003)}
              stroke={shade(tone, -0.22)}
              strokeWidth={0.6}
              opacity={0.5}
            />
          </g>
        );
      })}

      {/* Timber: each beam gets a dark body and a lit top edge, so it stands
          proud of the plaster instead of being painted on it. */}
      {rects.map((r, i) => (
        <g key={`b${i}`}>
          <polygon points={wallRect(axis, plane, r.u0, r.u1, r.z0, r.z1, out + 0.012)} fill={beam} />
          <polygon
            points={wallRect(axis, plane, r.u0, r.u1, r.z1 - bw * 0.22, r.z1, out + 0.016)}
            fill={MAT.beamLight}
            opacity={0.75}
          />
          <polygon
            points={wallRect(axis, plane, r.u0, r.u1, r.z0, r.z0 + bw * 0.2, out + 0.016)}
            fill={MAT.beamDark}
            opacity={0.6}
          />
        </g>
      ))}
      {braces.map((q, i) => (
        <g key={`x${i}`}>
          <polygon points={wallPoly(axis, plane, q, out + 0.012)} fill={beam} />
          <polygon points={wallPoly(axis, plane, q, out + 0.016)} fill="none" stroke={MAT.beamLight} strokeWidth={0.6} opacity={0.5} />
        </g>
      ))}

      {skirt && (
        <polygon
          points={wallRect(axis, plane, u0, u1, z0, z0 + 0.05, out + 0.018)}
          fill={MAT.beamDark}
          opacity={0.45}
        />
      )}
    </g>
  );
}

/**
 * A projecting jetty: an upper storey that oversails the one below. Drawn as a
 * band of beam ends along the top of the lower wall, then the wall itself.
 * This one detail does more for "medieval" than anything else in the file.
 */
export function Jetty({ axis = "x", plane, u0, u1, z, out = 0, count = 5, seed = 0 }) {
  const beam = MAT.beam;
  const ends = [];
  const span = u1 - u0;
  for (let i = 0; i < count; i += 1) {
    const u = u0 + (span * (i + 0.5)) / count;
    const w = 0.055;
    const jog = ((i * 37) % 11) * 0.002;
    ends.push(
      <polygon
        key={i}
        points={wallRect(axis, plane, u - w, u + w, z - 0.13, z, out + 0.03 + jog)}
        fill={shade(beam, (i % 3) * 0.06 - 0.06)}
      />,
    );
    ends.push(
      <polygon
        key={`t${i}`}
        points={wallRect(axis, plane, u - w, u + w, z - 0.03, z, out + 0.045 + jog)}
        fill={MAT.beamLight}
        opacity={0.7}
      />,
    );
  }
  return (
    <g data-role="jetty" data-seed={seed}>
      {ends}
      {/* The underside of the oversail, catching almost no light. */}
      <polygon
        points={wallRect(axis, plane, u0, u1, z - 0.13, z - 0.1, out + 0.012)}
        fill={MAT.beamDark}
      />
    </g>
  );
}

/**
 * A stone footing: a low course of rubble that the timber stands on, with a
 * chamfered top edge. `h` is its height in grid units.
 */
export function Footing({ axis = "x", plane, u0, u1, z0, h = 0.13, out = 0, seed = 0 }) {
  const blocks = stoneRows(u0, u1, z0, z0 + h, h * 1.1, Math.round(seed * 17) + 3);
  return (
    <g data-role="footing">
      <polygon points={wallRect(axis, plane, u0, u1, z0, z0 + h, out)} fill={shade(MAT.stoneDark, -0.05)} />
      {blocks.map((b, i) => (
        <polygon
          key={i}
          points={wallRect(axis, plane, b.u0, b.u1, b.z0 + 0.006, b.z1 - 0.006, out + 0.004)}
          fill={shade(MAT.stone, (b.t - 0.5) * 0.3)}
        />
      ))}
      {/* The chamfer catches the sun and separates wall from ground. */}
      <polygon points={wallRect(axis, plane, u0, u1, z0 + h, z0 + h + 0.022, out + 0.008)} fill={MAT.stoneLight} />
    </g>
  );
}

/**
 * A stable pseudo-random number in [0,1) for a given seed and index. Used for
 * the per-bay plaster tone, so a wall looks hand-limewashed but never changes
 * between renders.
 */
function deterministic(seed, i) {
  const x = Math.sin((seed + 1) * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function round(n) {
  return Math.round(n * 100) / 100;
}
