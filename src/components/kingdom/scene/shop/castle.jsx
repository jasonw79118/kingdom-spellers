// The castle.
//
// This is the one building a child looks at first, and it is the one the old art
// set got most wrong. The previous castle was four identical IsoBox towers with
// Cone roofs on top: four rectangles, four triangles, a flat brown rectangle for
// a gate and five flat rectangles for windows. It read as a diagram of a castle
// rather than a castle, and it sat in the middle of the kingdom making the whole
// scene look like a prototype.
//
// What is here instead is built the way a real motte-and-bailey reads in a fixed
// isometric view:
//
//   - a battered stone plinth, because a castle is founded on rock and the
//     batter is the first thing that tells the eye "fortification"
//   - a curtain wall with an inner and outer face, so the wall has thickness
//   - Crenellations as real merlons with embrasures, not a scalloped edge
//   - a gatehouse that projects from the wall line, with an arched gate,
//     portcullis, murder holes and machicolations over the arch
//   - a great tower with a battered base, a string course, arrow loops and a
//     conical roof with a finial
//   - corner turrets of DIFFERENT heights, so the silhouette is not a rhythm
//   - a hall range with a steep slate roof, dormers and tall chimneys
//   - a drawbridge on chains, a moat lip, a barbican and a pennant
//
// Composition: the castle is drawn back to front, mass by mass. Heights are
// chosen so the great tower is the tallest thing on the map by a clear margin,
// because the audit checks that a child can identify the castle as the
// dominant object in a single glance.
//
// Footprint origin is the near-left corner of the plot, in grid units, matching
// every other asset in the kit.

import { shade, iso, Z_HEIGHT } from "../../iso";
import { MAT, pick } from "./materials";
import { Wall, wallPt, wallRect, wallPoly, wallLine } from "./walls";
import { Roof, Chimney, Tower } from "./roof";
import { Window, Door, Steps, Barrel, Crate, Woodpile, SignBoard } from "./parts";

// The moat is the one piece of water a building asset owns. It cannot come from
// the territory palette, because the castle is a building and gets `variant`
// rather than a palette, so it carries its own two tones in the same family the
// river uses.
const WATER = "#5aa8d2";
const WATER_DEEP = "#3f8ab4";

const fmt = (p) => `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`;
const P3 = (list) => list.map((p) => fmt(iso(p[0], p[1], p[2], Z_HEIGHT))).join(" ");

/** A soft contact shadow, so the castle sits on the mound instead of floating. */
function Ground({ x, y, w, d, o = 0.3, op = 0.24 }) {
  return (
    <polygon
      data-role="shadow"
      points={P3([
        [x - o, y - o, 0], [x + w + o, y - o, 0],
        [x + w + o, y + d + o, 0], [x - o, y + d + o, 0],
      ])}
      fill="#2f3a24"
      opacity={op}
    />
  );
}

// ---------------------------------------------------------------------------
// Masonry primitives that the kit does not already provide
// ---------------------------------------------------------------------------

/**
 * A battered (sloping) stone base.
 *
 * A castle wall is thicker at the foot than the top, and that batter is the
 * single detail that separates masonry that looks like it can stand up from
 * masonry that looks like a flat panel. Drawn as a ring of quad segments so the
 * face shades like a solid, with a string course capping it.
 */
function Batter({ x, y, w, d, z, h = 0.34, inset = 0.14, seed = 0, depth }) {
  const out = [];
  const faces = [
    { axis: "x", plane: y + d, u0: x, u1: x + w, lam: 0 },
    { axis: "y", plane: x + w, u0: y, u1: y + d, lam: -0.22 },
    { axis: "x", plane: y, u0: x + w, u1: x, lam: 0.1 },
    { axis: "y", plane: x, u0: y + d, u1: y, lam: -0.12 },
  ];
  for (const f of faces) {
    const base = MAT.stone;
    // Two stages so the batter is a slope and not a wedge.
    const steps = 3;
    for (let i = 0; i < steps; i += 1) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const shrink0 = inset * t0;
      const shrink1 = inset * t1;
      const z0 = z + h * t0;
      const z1 = z + h * t1;
      const lo = f.axis === "x" ? [f.u0 + shrink0, f.u1 - shrink0] : [f.u0 + shrink0, f.u1 - shrink0];
      const hi = f.axis === "x" ? [f.u0 + shrink1, f.u1 - shrink1] : [f.u0 + shrink1, f.u1 - shrink1];
      out.push(
        <polygon
          key={`${f.axis}${f.plane}bt${i}`}
          points={wallPoly(f.axis, f.plane, [[lo[0], z0], [lo[1], z0], [hi[1], z1], [hi[0], z1]], 0.004)}
          fill={shade(base, f.lam - i * 0.05)}
        />,
      );
      // Bed joints across the batter.
      out.push(
        <path
          key={`${f.axis}${f.plane}bj${i}`}
          d={wallLine(f.axis, f.plane, lo[0], z0, lo[1], z0, 0.006)}
          stroke={shade(MAT.stoneDark, -0.12)}
          strokeWidth={0.5}
          opacity={0.45}
        />,
      );
    }
    // String course: the projecting band that caps a batter.
    out.push(
      <polygon
        key={`${f.axis}${f.plane}sc`}
        points={wallRect(f.axis, f.plane, f.u0 - 0.02, f.u1 + 0.02, z + h, z + h + 0.045, 0.012)}
        fill={MAT.stoneLight}
      />,
    );
    out.push(
      <polygon
        key={`${f.axis}${f.plane}scs`}
        points={wallRect(f.axis, f.plane, f.u0 - 0.02, f.u1 + 0.02, z + h, z + h + 0.014, 0.016)}
        fill={shade(MAT.stoneDark, -0.1)}
        opacity={0.6}
      />,
    );
  }
  return <g data-role="batter" data-seed={seed} data-depth={depth}>{out}</g>;
}

/**
 * Crenellations: merlons with embrasures between them, on one wall.
 *
 * The old art drew these as a scalloped strip along the top of a box. Here each
 * merlon is an individual block with a lit top, a front face and a shaded inner
 * face, and they are set at a merlon pitch rather than at even spacing, because
 * a real wall alternates.
 */
function Crenellations({ axis = "x", plane, u0, u1, z, h = 0.15, w = 0.14, seed = 0 }) {
  const out = [];
  const span = u1 - u0;
  const n = Math.max(3, Math.floor(span / (w * 2)));
  const pitch = span / n;
  for (let i = 0; i < n; i += 1) {
    const a = u0 + i * pitch;
    const b = a + w;
    if (b > u1) break;
    // Slight irregularity: no two merlons are quite the same size.
    const j = ((i * 13 + Math.round(seed * 7)) % 5) * 0.004;
    const hh = h + ((i * 7) % 3) * 0.012 - j;
    // Merlon front.
    out.push(
      <polygon
        key={`m${i}f`}
        points={wallRect(axis, plane, a, b, z, z + hh, 0.02)}
        fill={MAT.stoneLight}
      />,
    );
    // Top, catching the sun.
    out.push(
      <polygon
        key={`m${i}t`}
        points={wallRect(axis, plane, a, b, z + hh, z + hh + 0.014, 0.03)}
        fill={shade(MAT.stoneLight, 0.16)}
      />,
    );
    // The inner return, in shadow, which is what gives the merlon depth.
    out.push(
      <polygon
        key={`m${i}b`}
        points={wallRect(axis, plane, a + 0.012, b - 0.012, z + 0.02, z + hh - 0.01, 0.006)}
        fill={shade(MAT.stone, -0.06)}
        opacity={0.5}
      />,
    );
  }
  // The wall walk the merlons stand on, and its shadowed inner face.
  out.push(
    <polygon
      key="walk"
      points={wallRect(axis, plane, u0, u1, z - 0.05, z, 0.01)}
      fill={shade(MAT.stoneDark, 0.04)}
    />,
  );
  return <g data-role="crenellations" data-merlons={n} data-seed={seed}>{out}</g>;
}

/**
 * Machicolations: the corbelled overhang under a parapet, with the gaps
 * between them. A castle that has them looks like it can drop things on people
 * standing at its foot, which is the entire point of a curtain wall.
 */
function Machicolations({ axis = "x", plane, u0, u1, z, depth = 0.1, seed = 0 }) {
  const out = [];
  const span = u1 - u0;
  const n = Math.max(3, Math.floor(span / 0.19));
  const pitch = span / n;
  for (let i = 0; i < n; i += 1) {
    const a = u0 + i * pitch;
    const b = a + pitch * 0.58;
    // Corbel bracket below.
    out.push(
      <polygon
        key={`c${i}`}
        points={wallRect(axis, plane, a, b, z - 0.09, z - 0.03, depth)}
        fill={MAT.stoneLight}
      />,
    );
    // The dark murder hole behind it.
    out.push(
      <polygon
        key={`h${i}`}
        points={wallRect(axis, plane, b, a + pitch, z - 0.03, z, depth * 0.5)}
        fill="#241d18"
        opacity={0.75}
      />,
    );
  }
  // The projecting lip.
  out.push(
    <polygon
      key="lip"
      points={wallRect(axis, plane, u0, u1, z, z + 0.04, depth + 0.01)}
      fill={MAT.stoneLight}
    />,
  );
  return <g data-role="machicolations" data-seed={seed}>{out}</g>;
}

/**
 * An arrow loop: a splayed slit with a cross-bar, cut into a wall.
 *
 * Wider at the inside than the outside, which is why it is drawn as three
 * quads rather than a rectangle. This is the detail that stops a castle wall
 * reading as a blank band.
 */
function ArrowLoop({ axis = "x", plane, u, z, h = 0.2, seed = 0 }) {
  const wOut = 0.028;
  const wIn = 0.055;
  return (
    <g data-role="arrow-loop" data-seed={seed}>
      <polygon
        points={wallPoly(axis, plane, [[u - wIn, z], [u + wIn, z], [u + wOut, z + h], [u - wOut, z + h]], 0.03)}
        fill="#2b241f"
      />
      {/* The splayed reveal catches a little light on one side. */}
      <polygon
        points={wallPoly(axis, plane, [[u - wIn, z], [u - wOut, z + h], [u - wOut + 0.012, z + h], [u - wIn + 0.02, z]], 0.034)}
        fill={shade(MAT.stone, 0.1)}
      />
      <path
        d={wallLine(axis, plane, u - wOut, z + h * 0.66, u + wOut, z + h * 0.66, 0.036)}
        stroke={MAT.ironLight}
        strokeWidth={1.1}
        opacity={0.85}
      />
    </g>
  );
}

/** A stone arch, drawn as voussoirs so the ring reads as cut stone. */
function Arch({ axis = "x", plane, u, z, w = 0.34, h = 0.3, seed = 0 }) {
  const out = [];
  const n = 9;
  const r = w / 2;
  for (let i = 0; i < n; i += 1) {
    const t0 = Math.PI * (i / n);
    const t1 = Math.PI * ((i + 1) / n);
    const mid = (t0 + t1) / 2;
    // Light from the upper left: the left haunch is the brighter one.
    const lam = Math.cos(mid - Math.PI * 1.15) * 0.16;
    const p = (t) => [u - Math.cos(t) * r, z + Math.sin(t) * r * 0.9];
    const [ax, az] = p(t0);
    const [bx, bz] = p(t1);
    const [cx, cz] = [bx, bz + 0.05];
    const [dx, dz] = [ax, az + 0.05];
    out.push(
      <polygon
        key={`a${i}`}
        points={wallPoly(axis, plane, [[ax, az], [bx, bz], [cx, cz], [dx, dz]], 0.028)}
        fill={shade(MAT.stoneLight, lam)}
      />,
    );
  }
  return <g data-role="arch" data-voussoirs={n} data-seed={seed}>{out}</g>;
}

/** The gate opening itself: a dark passage with a raised portcullis. */
function GatePassage({ axis = "x", plane, u, z, w = 0.34, h = 0.3, open = false }) {
  const r = w / 2;
  const pts = [];
  // A round-headed opening, following the arch above it.
  const n = 10;
  for (let i = 0; i <= n; i += 1) {
    const t = Math.PI * (i / n);
    pts.push([u - Math.cos(t) * r, z + h * 0.55 + Math.sin(t) * r * 0.62]);
  }
  pts.push([u + r, z]);
  pts.push([u - r, z]);
  return (
    <g data-role="gate">
      <polygon points={wallPoly(axis, plane, pts, 0.012)} fill={open ? "#4a3a2a" : "#1d1712"} />
      {/* Flagstone floor catching light from the gate. */}
      {open && (
        <polygon
          points={wallRect(axis, plane, u - r, u + r, z, z + 0.02, 0.02)}
          fill="#6b573f"
        />
      )}
      {/* Portcullis: vertical bars with two cross rails, raised not dropped. */}
      <g data-role="portcullis" data-state={open ? "raised" : "down"}>
        {Array.from({ length: 5 }, (_, i) => {
          const bu = u - r + 0.035 + (i * (w - 0.07)) / 4;
          return (
            <polygon
              key={`b${i}`}
              points={wallRect(axis, plane, bu - 0.011, bu + 0.011, z + h * 0.34, z + h * 0.9, 0.024)}
              fill={MAT.iron}
            />
          );
        })}
        {[0.5, 0.74].map((t, k) => (
          <polygon
            key={`r${k}`}
            points={wallRect(axis, plane, u - r, u + r, z + h * (0.34 + t * 0.56) - 0.009, z + h * (0.34 + t * 0.56) + 0.009, 0.026)}
            fill={MAT.ironLight}
          />
        ))}
      </g>
    </g>
  );
}

/** A drawbridge: planked deck, iron bands, two chains, seen partly raised. */
function Drawbridge({ x, y, w, z, seed = 0 }) {
  const out = [];
  const n = 6;
  const tilt = 0.42;
  for (let i = 0; i < n; i += 1) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const z0 = z - tilt * t0;
    const z1 = z - tilt * t1;
    const y0 = y + t0 * 0.62;
    const y1 = y + t1 * 0.62;
    out.push(
      <polygon
        key={`p${i}`}
        points={P3([
          [x, y0, z0], [x + w, y0, z0], [x + w, y1, z1], [x, y1, z1],
        ])}
        fill={shade(MAT.beam, 0.06 + (i % 2) * 0.05)}
      />,
    );
  }
  // Iron bands across the planks.
  for (const t of [0.28, 0.62, 0.9]) {
    out.push(
      <path
        key={`b${t}`}
        d={`M${fmt(iso(x, y + t * 0.62, z - tilt * t, Z_HEIGHT))} L${fmt(iso(x + w, y + t * 0.62, z - tilt * t, Z_HEIGHT))}`}
        stroke={MAT.iron}
        strokeWidth={2.2}
      />,
    );
  }
  // Chains up to the gatehouse.
  for (const cx of [x + 0.06, x + w - 0.06]) {
    out.push(
      <path
        key={`c${cx}`}
        d={`M${fmt(iso(cx, y + 0.5, z - tilt * 0.8, Z_HEIGHT))} L${fmt(iso(cx, y + 0.06, z + 0.34, Z_HEIGHT))}`}
        stroke={MAT.ironLight}
        strokeWidth={1.8}
        strokeDasharray="4 3"
      />,
    );
  }
  return <g data-role="drawbridge" data-seed={seed}>{out}</g>;
}

/** A pennant: pole, cloth with a swallow-tail notch, and a finial. */
function Pennant({ x, y, z, h = 0.5, color = MAT.cloth, seed = 0 }) {
  const tip = iso(x, y, z + h, Z_HEIGHT);
  const out = [
    <path key="p" d={`M${fmt(tip)} L${fmt(iso(x, y, z, Z_HEIGHT))}`} stroke={MAT.beamDark} strokeWidth={1.8} />,
  ];
  const mid = iso(x, y, z + h * 0.72, Z_HEIGHT);
  const w = 0.26;
  out.push(
    <polygon
      key="cloth"
      points={`${fmt(mid)} ${fmt(iso(x + w, y, z + h * 0.62, Z_HEIGHT))} ${fmt(iso(x + w * 0.78, y, z + h * 0.5, Z_HEIGHT))} ${fmt(iso(x + w, y, z + h * 0.36, Z_HEIGHT))} ${fmt(iso(x, y, z + h * 0.42, Z_HEIGHT))}`}
      fill={color}
    />,
  );
  out.push(
    <polygon
      key="fold"
      points={`${fmt(mid)} ${fmt(iso(x + w * 0.42, y, z + h * 0.6, Z_HEIGHT))} ${fmt(iso(x + w * 0.4, y, z + h * 0.45, Z_HEIGHT))} ${fmt(iso(x, y, z + h * 0.48, Z_HEIGHT))}`}
      fill={shade(color, -0.2)}
      opacity={0.7}
    />,
  );
  out.push(<circle key="fin" cx={round2(tip.x)} cy={round2(tip.y - 3)} r={2} fill={MAT.brass} />);
  return <g data-role="pennant" data-seed={seed}>{out}</g>;
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * A corner turret: a small round tower with a conical cap, corbelled out on a
 * little corbel so it appears to oversail the wall it stands against.
 */
function Turret({ x, y, z, h = 0.9, r = 0.16, cap = 0.3, face = MAT.slate[0], seed = 0, depth }) {
  return (
    <g data-role="turret" data-seed={seed} data-depth={depth}>
      <Tower x={x} y={y} z={z} h={h} r={r} cap={cap} face={face} windows={1} seed={seed} />
    </g>
  );
}

/**
 * Ivy climbing a wall face.
 *
 * Stone this old does not stay clean, and ivy is the cheapest way to stop a
 * large masonry plane reading as one flat fill. Drawn as a set of wandering
 * stems with leaves, thinning out towards the top so it looks like it is
 * growing rather than painted on.
 */
function Ivy({ axis = "x", plane, u0, u1, z0, z1, out = 0.02, seed = 0 }) {
  const out_el = [];
  const rnd = mulberry(Math.round(seed * 131) + 7);
  const stems = 4;
  for (let s = 0; s < stems; s += 1) {
    const u = u0 + ((u1 - u0) * (s + 0.35 + rnd() * 0.3)) / stems;
    // How far up this stem climbs: some die out early, one reaches the top.
    const top = s === stems - 1 ? z1 - 0.04 : z0 + (z1 - z0) * (0.35 + rnd() * 0.45);
    const pts = [];
    const steps = 5;
    for (let k = 0; k <= steps; k += 1) {
      pts.push([u + (rnd() - 0.5) * 0.07, z0 + ((top - z0) * k) / steps]);
    }
    out_el.push(
      <path
        key={`iv${s}`}
        d={wallLine(axis, plane, pts[0][0], pts[0][1], pts[steps][0], pts[steps][1], out)}
        stroke={shade(MAT.turf, -0.08)}
        strokeWidth={1.1}
        fill="none"
        strokeLinecap="round"
      />,
    );
    for (let k = 0; k <= steps; k += 1) {
      const [lu, lz] = pts[k];
      const leaf = wallPt(axis, plane, lu, lz, out + 0.008);
      const r = 1.7 + rnd() * 1.5;
      const tone = k % 2 ? MAT.turfLight : shade(MAT.turf, 0.06);
      out_el.push(
        <circle
          key={`il${s}-${k}`}
          cx={round2(leaf.x + (rnd() - 0.5) * 5)}
          cy={round2(leaf.y - rnd() * 2)}
          r={round2(r)}
          fill={tone}
        />,
      );
    }
  }
  return <g data-role="ivy">{out_el}</g>;
}

/**
 * An iron brazier on a stand, for the wall walk. Lit at dusk, smoking by day.
 */
function Brazier({ x, y, z, seed = 0, smoke = false }) {
  const out = [];
  const bowl = iso(x, y, z + 0.16, Z_HEIGHT);
  // Three splayed legs.
  for (let i = 0; i < 3; i += 1) {
    const a = (Math.PI * 2 * i) / 3 + 0.4;
    const foot = iso(x + Math.cos(a) * 0.06, y + Math.sin(a) * 0.06, z, Z_HEIGHT);
    out.push(
      <path
        key={`bl${i}`}
        d={`M${round2(foot.x)},${round2(foot.y)} L${round2(bowl.x)},${round2(bowl.y + 3)}`}
        stroke={MAT.iron}
        strokeWidth={1.6}
      />,
    );
  }
  out.push(
    <ellipse key="bb" cx={round2(bowl.x)} cy={round2(bowl.y)} rx={5.4} ry={3.1} fill={MAT.ironDark ?? MAT.iron} />,
  );
  out.push(
    <ellipse key="bi" cx={round2(bowl.x)} cy={round2(bowl.y - 1.4)} rx={4.2} ry={2.2} fill="#e8834a" />,
  );
  out.push(
    <ellipse key="bh" cx={round2(bowl.x)} cy={round2(bowl.y - 2.1)} rx={2.6} ry={1.4} fill="#f6cf6a" />,
  );
  if (smoke) {
    const top = iso(x, y, z + 0.16, Z_HEIGHT);
    out.push(
      <path
        key="bsm"
        d={`M${round2(top.x)},${round2(top.y - 4)} q-4,-6 1,-11 q4,-5 0,-10`}
        stroke="#cfc6b4"
        strokeWidth={2.4}
        fill="none"
        opacity={0.4}
        strokeLinecap="round"
      />,
    );
  }
  void seed;
  return <g data-role="brazier">{out}</g>;
}

/**
 * Rubble and scree banked against the foot of the batter.
 *
 * A castle plinth meets the ground, it does not intersect it cleanly. This is
 * the band of broken stone and scrub that makes the two read as touching.
 */
function Rubble({ x, y, w, d, seed = 0 }) {
  const out = [];
  const rnd = mulberry(Math.round(seed * 97) + 11);
  // Only the two camera-facing edges get a bank; the far ones are hidden.
  const edges = [
    { a: [x - 0.16, y + d + 0.16], b: [x + w + 0.16, y + d + 0.16], n: Math.round(w * 4) },
    { a: [x + w + 0.16, y - 0.16], b: [x + w + 0.16, y + d + 0.16], n: Math.round(d * 4) },
  ];
  for (const e of edges) {
    for (let i = 0; i < e.n; i += 1) {
      const t = (i + 0.5) / e.n;
      const px = e.a[0] + (e.b[0] - e.a[0]) * t + (rnd() - 0.5) * 0.08;
      const py = e.a[1] + (e.b[1] - e.a[1]) * t + (rnd() - 0.5) * 0.08;
      const s = 0.05 + rnd() * 0.05;
      const z = s * (0.4 + rnd() * 0.5);
      out.push(
        <polygon
          key={`rb${e.n}-${i}`}
          points={P3([
            [px - s, py - s, 0], [px + s, py - s, 0],
            [px + s * 0.6, py + s, 0], [px - s * 0.6, py + s, 0],
          ])}
          fill={shade(MAT.stoneDark, -0.1 + rnd() * 0.2)}
        />,
      );
      out.push(
        <polygon
          key={`rbt${e.n}-${i}`}
          points={P3([
            [px - s, py - s, z], [px + s, py - s, z],
            [px + s * 0.6, py + s, z], [px - s * 0.6, py + s, z],
          ])}
          fill={shade(MAT.stone, -0.02 + rnd() * 0.16)}
        />,
      );
    }
  }
  return <g data-role="rubble">{out}</g>;
}

/** Tufts of grass and weeds where the masonry meets the ground. */
function Scrub({ x, y, w, d, seed = 0 }) {
  const out = [];
  const rnd = mulberry(Math.round(seed * 61) + 17);
  const spots = Math.round((w + d) * 7);
  for (let i = 0; i < spots; i += 1) {
    // Bias toward the camera-facing edges, where the ground is actually visible.
    const onX = rnd() < 0.55;
    const px = onX ? x + rnd() * w : x + w - 0.12 + (rnd() - 0.5) * 0.2;
    const py = onX ? y + d + 0.14 + (rnd() - 0.5) * 0.18 : y + rnd() * d;
    const g = iso(px, py, 0, Z_HEIGHT);
    const h = 3 + rnd() * 5;
    out.push(
      <path
        key={`sc${i}`}
        d={`M${round2(g.x)},${round2(g.y)} Q${round2(g.x - 2)},${round2(g.y - h * 0.6)} ${round2(g.x - 3.5)},${round2(g.y - h)}` +
          ` M${round2(g.x)},${round2(g.y)} Q${round2(g.x + 2)},${round2(g.y - h * 0.6)} ${round2(g.x + 3)},${round2(g.y - h * 0.9)}` +
          ` M${round2(g.x)},${round2(g.y)} L${round2(g.x)},${round2(g.y - h)}`}
        stroke={i % 2 ? MAT.turfLight : MAT.turf}
        strokeWidth={1.1}
        fill="none"
      />,
    );
    if (i % 4 === 0) {
      out.push(
        <circle
          key={`sf${i}`}
          cx={round2(g.x + (rnd() - 0.5) * 4)}
          cy={round2(g.y - h - 1)}
          r={1.5}
          fill={MAT.flower[Math.floor(rnd() * MAT.flower.length)]}
        />,
      );
    }
  }
  return <g data-role="weeds">{out}</g>;
}

/**
 * A two-wheeled supply cart, parked in the yard.
 *
 * Drawn as a plank bed, two spoked wheels and a shaft, because a cart is the
 * single prop that most reliably says "people live here and things get
 * delivered" — and it is the thing a castle drawn as bare masonry always lacks.
 */
function Cart({ x, y, z = 0, seed = 0 }) {
  const out = [];
  const bed = iso(x, y, z + 0.16, Z_HEIGHT);
  // Bed and sideboards.
  out.push(
    <polygon
      key="cb"
      points={P3([
        [x - 0.2, y - 0.12, z + 0.16], [x + 0.2, y - 0.12, z + 0.16],
        [x + 0.2, y + 0.12, z + 0.16], [x - 0.2, y + 0.12, z + 0.16],
      ])}
      fill={shade(MAT.beam, 0.08)}
    />,
  );
  for (let i = 0; i < 4; i += 1) {
    const u = x - 0.2 + (0.4 * i) / 4 + 0.02;
    out.push(
      <polygon
        key={`cp${i}`}
        points={P3([
          [u, y + 0.12, z + 0.16], [u + 0.06, y + 0.12, z + 0.16],
          [u + 0.06, y + 0.12, z + 0.26], [u, y + 0.12, z + 0.26],
        ])}
        fill={i % 2 ? MAT.beam : MAT.beamDark}
      />,
    );
  }
  // Two wheels on the near side, spoked.
  for (const [dx, dy] of [[-0.09, 0.14], [0.11, 0.14]]) {
    const c = iso(x + dx, y + dy, z + 0.11, Z_HEIGHT);
    out.push(<circle key={`cw${dx}`} cx={round2(c.x)} cy={round2(c.y)} r={5.4} fill="none" stroke={MAT.beamDark} strokeWidth={2.2} />);
    for (let k = 0; k < 4; k += 1) {
      const a = (Math.PI * 2 * k) / 4 + 0.3;
      out.push(
        <path
          key={`cs${dx}-${k}`}
          d={`M${round2(c.x)},${round2(c.y)} L${round2(c.x + Math.cos(a) * 5)},${round2(c.y + Math.sin(a) * 5)}`}
          stroke={MAT.beamDark}
          strokeWidth={1}
        />,
      );
    }
  }
  // Shaft running out toward the viewer.
  const s0 = iso(x - 0.02, y + 0.14, z + 0.14, Z_HEIGHT);
  const s1 = iso(x - 0.12, y + 0.44, z + 0.1, Z_HEIGHT);
  out.push(<path key="csh" d={`M${round2(s0.x)},${round2(s0.y)} L${round2(s1.x)},${round2(s1.y)}`} stroke={MAT.beam} strokeWidth={2.6} />);
  // A couple of sacks in the bed.
  out.push(<ellipse key="cs1" cx={round2(bed.x - 4)} cy={round2(bed.y - 2)} rx={4} ry={3} fill={shade(MAT.cloth, 0.1)} />);
  out.push(<ellipse key="cs2" cx={round2(bed.x + 5)} cy={round2(bed.y - 3)} rx={3.4} ry={2.6} fill={MAT.clothAlt} />);
  void seed;
  return <g data-role="cart">{out}</g>;
}

function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// The castle
// ---------------------------------------------------------------------------

/**
 * Greenwood-style castle.
 *
 * Layout on the plot, with y increasing toward the viewer:
 *
 *   y=0    curtain wall across the back, 3.6 wide
 *   x=0    curtain wall down the left
 *   x=3.6  curtain wall down the right
 *   centre the great tower, tallest thing on the map
 *   front  gatehouse projecting from the wall line
 *   right  the hall range, a long steep-roofed block with dormers
 *
 * `variant` shifts the banner colour and a couple of proportions so the five
 * territories do not share an identical castle, and `seed` shifts stone tones.
 */
export function Castle({ x = 0, y = 0, seed = 0, lit = true, variant = 0 }) {
  const stone = MAT.stone;
  const slate = pick(MAT.slate, seed + 1);
  const banner = [MAT.cloth, MAT.clothAlt, "#7a4a86", "#3f6b74", "#a8622f"][variant % 5];

  // Overall plot. The gatehouse projects past the front wall line, so the
  // footprint is wider and deeper than the curtain rectangle.
  const W = 3.6;
  const D = 3.0;
  const WALL_H = 0.78;      // curtain wall height above the batter
  const BATTER = 0.3;       // sloping stone base
  const zWalk = BATTER + WALL_H;

  return (
    <g data-role="building" data-id="shop-castle" data-seed={seed}>
      <Ground x={x} y={y} w={W} d={D} o={0.42} op={0.26} />

      {/* --- the mound the castle is founded on --------------------------- */}
      {/* A dry moat lip, cut into the ground in front, so the castle is not
          simply sitting on flat grass. */}
      <g data-role="moat">
        <polygon
          points={P3([
            [x - 0.5, y + D + 0.34, 0], [x + W + 0.5, y + D + 0.34, 0],
            [x + W + 0.28, y + D + 0.78, 0], [x - 0.28, y + D + 0.78, 0],
          ])}
          fill={shade(MAT.dirt, -0.24)}
          opacity={0.8}
        />
        <polygon
          points={P3([
            [x - 0.34, y + D + 0.42, 0], [x + W + 0.34, y + D + 0.42, 0],
            [x + W + 0.22, y + D + 0.7, 0], [x - 0.22, y + D + 0.7, 0],
          ])}
          fill={WATER}
          opacity={0.7}
        />
        <polygon
          points={P3([
            [x - 0.28, y + D + 0.46, 0], [x + W + 0.28, y + D + 0.46, 0],
            [x + W + 0.2, y + D + 0.68, 0], [x - 0.2, y + D + 0.68, 0],
          ])}
          fill={WATER_DEEP}
          opacity={0.45}
        />
      </g>

      {/* --- curtain walls, back to front --------------------------------- */}
      {/* Battered base under the whole curtain, drawn first so the wall
          segments sit on top of it. */}
      <Batter x={x} y={y} w={W} d={D} z={0} h={BATTER} seed={seed} depth={x + W / 2 + y + D / 2} />

      {/* Left wall (x = 0), running down y. Depth 1.5, so it goes before the
          back wall at 1.8; the two share a little ink on the corner column and
          depth order says the left wall is the farther of the pair. */}
      <g data-role="curtain" data-face="left" data-depth={x + y + D / 2}>
        <Wall axis="y" plane={x} u0={y} u1={y + D} z0={BATTER} z1={zWalk}
          fill={stone} pattern="stone" seed={seed + 1} out={0.001} skirt={false} />
        <Machicolations axis="y" plane={x} u0={y} u1={y + D} z={zWalk} seed={seed + 1} />
        <Crenellations axis="y" plane={x} u0={y} u1={y + D} z={zWalk + 0.04} seed={seed + 1} />
        <ArrowLoop axis="y" plane={x} u={y + D * 0.5} z={BATTER + 0.3} seed={seed + 1} />
        <Ivy axis="y" plane={x} u0={y + 0.15} u1={y + D - 0.35} z0={BATTER} z1={zWalk - 0.08}
          out={-0.008} seed={seed + 1} />
        {/* A brazier on the wall walk. It is what tells the eye the parapet is
            walkable space rather than a decorative edge. */}
        <Brazier x={x + 0.24} y={y + D * 0.62} z={zWalk + 0.05} seed={seed + 1} smoke={!lit} />
      </g>

      {/* Back wall (y = 0). Reads as a plane at constant y running along x. */}
      <g data-role="curtain" data-face="back" data-depth={x + W / 2 + y}>
        <Wall axis="x" plane={y} u0={x} u1={x + W} z0={BATTER} z1={zWalk}
          fill={stone} pattern="stone" seed={seed} out={0.001} skirt={false} />
        <Machicolations axis="x" plane={y} u0={x} u1={x + W} z={zWalk} seed={seed} />
        <Crenellations axis="x" plane={y} u0={x} u1={x + W} z={zWalk + 0.04} seed={seed} />
        <ArrowLoop axis="x" plane={y} u={x + W * 0.24} z={BATTER + 0.3} seed={seed} />
        <ArrowLoop axis="x" plane={y} u={x + W * 0.76} z={BATTER + 0.3} seed={seed} />
      </g>

      {/* --- the great tower, the tallest mass on the map ----------------- */}
      {/* Depth (gx+gy) = 2.95. Painted BEFORE the hall range despite being far
          taller, because the hall's near end reaches depth 6.45. Painter order
          here is depth order and nothing else; a tall mass is not a near mass.
          Got this backwards once and the tower sat painted over the hall roof,
          which read as a tower standing on top of another building's roof. */}
      <g data-role="keep" data-depth={x + 1.83 + y + 1.12}>
        {/* Battered base, so the tower widens toward the ground. */}
        <Batter x={x + 1.28} y={y + 0.62} w={1.1} d={1.0} z={BATTER} h={0.26} inset={0.1} seed={seed + 5} />
        {/* Two storeys of stone. */}
        <Wall axis="y" plane={x + 2.38} u0={y + 0.62} u1={y + 1.62} z0={BATTER + 0.26} z1={BATTER + 0.86}
          fill={MAT.stoneCool} pattern="stone" seed={seed + 6} out={0.003} skirt={false} />
        <Wall axis="x" plane={y + 1.62} u0={x + 1.28} u1={x + 2.38} z0={BATTER + 0.26} z1={BATTER + 0.86}
          fill={MAT.stoneCool} pattern="stone" seed={seed + 7} out={0.004} skirt={false} />
        <Crenellations axis="y" plane={x + 2.38} u0={y + 0.62} u1={y + 1.62} z={BATTER + 0.86} h={0.12} w={0.11} seed={seed + 6} />
        <Crenellations axis="x" plane={y + 1.62} u0={x + 1.28} u1={x + 2.38} z={BATTER + 0.86} h={0.12} w={0.11} seed={seed + 7} />
        {/* Upper storey, set back a little, with a string course between. */}
        <Wall axis="y" plane={x + 2.3} u0={y + 0.72} u1={y + 1.54} z0={BATTER + 0.92} z1={BATTER + 1.34}
          fill={MAT.stone} pattern="stone" seed={seed + 8} out={0.005} skirt={false} />
        <Wall axis="x" plane={y + 1.54} u0={x + 1.36} u1={x + 2.3} z0={BATTER + 0.92} z1={BATTER + 1.34}
          fill={MAT.stone} pattern="stone" seed={seed + 9} out={0.006} skirt={false} />
        <Crenellations axis="y" plane={x + 2.3} u0={y + 0.72} u1={y + 1.54} z={BATTER + 1.34} h={0.13} w={0.1} seed={seed + 8} />
        <Crenellations axis="x" plane={y + 1.54} u0={x + 1.36} u1={x + 2.3} z={BATTER + 1.34} h={0.13} w={0.1} seed={seed + 9} />
        {/* Arrow loops on the keep, and a lit window on the lower storey. */}
        <ArrowLoop axis="y" plane={x + 2.38} u={y + 1.12} z={BATTER + 0.42} seed={seed} />
        <ArrowLoop axis="x" plane={y + 1.62} u={x + 1.6} z={BATTER + 0.42} seed={seed + 1} />
        <ArrowLoop axis="y" plane={x + 2.3} u={y + 1.0} z={BATTER + 1.04} seed={seed + 2} />
        <ArrowLoop axis="y" plane={x + 2.3} u={y + 1.28} z={BATTER + 1.04} seed={seed + 3} />
        <Window axis="x" plane={y + 1.62} u={x + 1.82} z={BATTER + 0.36} w={0.14} h={0.2} lit={lit} seed={seed + 4} />
        {/* The conical cap, and the pennant that marks it from a distance. */}
        <Roof x={x + 1.32} y={y + 0.66} w={0.92} d={0.84} z={BATTER + 1.5} rise={0.52}
          along="x" face={slate} seed={seed + 10} overhang={0.14} gables={false} />
        <Pennant x={x + 1.78} y={y + 1.08} z={BATTER + 2.02} h={0.44} color={banner} seed={seed} />
      </g>

      

      {/* --- corner turrets, deliberately unequal heights ----------------- */}
      {/* Depths 3.0 and 3.6, so both go before the yard (4.1). */}
      <Turret x={x + 0.2} y={y + D - 0.2} depth={x + 0.2 + y + D - 0.2} z={zWalk} h={0.86} r={0.15} cap={0.3} face={slate} seed={seed + 11} />
      <Turret x={x + W - 0.2} y={y + 0.2} depth={x + W - 0.2 + y + 0.2} z={zWalk} h={0.62} r={0.13} cap={0.26} face={slate} seed={seed + 12} />

      {/* --- right curtain wall, running down to the gatehouse ----------- */}
      <g data-role="curtain" data-face="right" data-depth={x + W + y + 0.25}>
        <Wall axis="y" plane={x + W} u0={y} u1={y + 0.5} z0={BATTER} z1={zWalk}
          fill={stone} pattern="stone" seed={seed + 3} out={0.001} skirt={false} />
        <Crenellations axis="y" plane={x + W} u0={y} u1={y + 0.5} z={zWalk + 0.04} seed={seed + 3} />
      </g>

      {/* --- the yard ---------------------------------------------------- */}
      {/* Drawn HERE, between the keep and the front wall, because that is where
          it sits in the world. Painter's order is back to front, so anything at
          a lower y has to be laid down before the front wall goes over it. Drawn
          last it paints the well, the cart and the cobbles straight across the
          face of the curtain, which is the single most obvious way this castle
          could look broken. */}
      <g data-role="yard" data-depth={x + 1.65 + y + 2.45}>
        {/* Cobbles, laid in arcs, only in the middle so the walls stay clean. */}
        {Array.from({ length: 3 }, (_, r) => (
          <g key={`cob${r}`}>
            {Array.from({ length: 6 - r }, (_, c) => {
              const cx = x + 0.5 + c * 0.42 + r * 0.21;
              const cy = y + 2.1 + r * 0.3;
              return (
                <polygon
                  key={`c${r}-${c}`}
                  points={P3([
                    [cx - 0.13, cy - 0.09, 0], [cx + 0.13, cy - 0.09, 0],
                    [cx + 0.13, cy + 0.09, 0], [cx - 0.13, cy + 0.09, 0],
                  ])}
                  fill={shade(MAT.stoneDark, 0.06 + ((r + c) % 3) * 0.05)}
                  opacity={0.5}
                />
              );
            })}
          </g>
        ))}

        {/* A well in the yard, because a castle with no water inside it is a
            siege waiting to happen. */}
        <g data-role="well">
          <polygon
            points={P3([
              [x + 0.62, y + 2.0, 0], [x + 0.94, y + 2.0, 0],
              [x + 0.94, y + 2.32, 0], [x + 0.62, y + 2.32, 0],
            ])}
            fill={shade(MAT.stone, -0.1)}
          />
          <polygon
            points={P3([
              [x + 0.66, y + 2.04, 0.1], [x + 0.9, y + 2.04, 0.1],
              [x + 0.9, y + 2.28, 0.1], [x + 0.66, y + 2.28, 0.1],
            ])}
            fill="#2b241f"
          />
          {[[x + 0.64, y + 2.02], [x + 0.92, y + 2.02]].map(([px, py], i) => (
            <path
              key={`wp${i}`}
              d={`M${fmt(iso(px, py, 0.1, Z_HEIGHT))} L${fmt(iso(px, py, 0.36, Z_HEIGHT))}`}
              stroke={MAT.beamDark}
              strokeWidth={2}
            />
          ))}
          <path
            d={`M${fmt(iso(x + 0.64, y + 2.02, 0.36, Z_HEIGHT))} L${fmt(iso(x + 0.92, y + 2.02, 0.36, Z_HEIGHT))}`}
            stroke={MAT.beamDark}
            strokeWidth={2.4}
          />
        </g>

        {/* The yard is where a castle stops being a wall and starts being a
            place people work, so it carries the props the village buildings do:
            stores, timber, a cart, a trestle. Without these the whole thing
            reads as a diagram of a castle rather than somewhere anyone lives. */}
        <Woodpile x={x + 2.44} y={y + 2.28} z={0} w={0.44} d={0.15} h={0.13} seed={seed + 2} />
        <Woodpile x={x + 2.42} y={y + 2.56} z={0} w={0.3} d={0.13} h={0.1} seed={seed + 3} />
        <Barrel x={x + 1.02} y={y + 2.46} z={0} r={0.05} h={0.12} seed={seed} />
        <Crate x={x + 0.3} y={y + 2.5} z={0} w={0.1} h={0.09} seed={seed + 1} />
        <Barrel x={x + 1.14} y={y + 2.66} z={0} r={0.055} h={0.13} seed={seed + 4} />
        <Barrel x={x + 1.28} y={y + 2.74} z={0} r={0.05} h={0.11} seed={seed + 5} tipped />
        <Crate x={x + 1.0} y={y + 2.82} z={0} w={0.11} h={0.1} seed={seed + 6} />
        <Crate x={x + 1.14} y={y + 2.84} z={0.1} w={0.09} h={0.08} seed={seed + 7} />
        <Cart x={x + 2.88} y={y + 1.86} z={0} seed={seed + 8} />

        {/* A trestle under an awning: what a gatehouse yard looks like when it
            is not under siege. */}
        <g data-role="stall">
          {[x + 0.24, x + 0.68, x + 1.12].map((px, i) => (
            <path
              key={`stp${i}`}
              d={`M${fmt(iso(px, y + 2.86, 0, Z_HEIGHT))} L${fmt(iso(px, y + 2.86, 0.34, Z_HEIGHT))}`}
              stroke={MAT.beam}
              strokeWidth={2.2}
            />
          ))}
          <polygon
            points={P3([
              [x + 0.14, y + 2.86, 0.34], [x + 1.22, y + 2.86, 0.34],
              [x + 1.22, y + 2.96, 0.34], [x + 0.14, y + 2.96, 0.34],
            ])}
            fill={shade(MAT.beam, 0.1)}
          />
          <polygon
            points={P3([
              [x + 0.08, y + 2.8, 0.5], [x + 1.28, y + 2.8, 0.5],
              [x + 1.28, y + 2.86, 0.46], [x + 0.08, y + 2.86, 0.46],
            ])}
            fill={pick(MAT.cloth, seed)}
          />
        </g>
      </g>

      {/* --- the hall range, on the right, behind the gate ---------------- */}
      {/* Depth (gx+gy) = 4.775. Nearer than the yard (4.1) and than both
          turrets, so it is painted after them. Painting it earlier let the yard
          cobbles run across the foot of the hall wall. */}
      <g data-role="hall" data-depth={x + 3.125 + y + 1.65}>
        <Wall axis="y" plane={x + W} u0={y + 0.5} u1={y + D - 0.2} z0={BATTER} z1={BATTER + 0.62}
          fill={MAT.plaster[3]} pattern="timber" seed={seed + 2} studs={4} out={0.002} />
        <Wall axis="x" plane={y + D - 0.2} u0={x + W - 0.95} u1={x + W} z0={BATTER} z1={BATTER + 0.62}
          fill={MAT.plaster[3]} pattern="timber" seed={seed + 3} studs={2} out={0.003} />
        <Roof x={x + W - 0.95} y={y + 0.45} w={0.95} d={D - 0.6} z={BATTER + 0.62}
          rise={0.44} along="y" face={slate} seed={seed + 4} overhang={0.12} />
        {/* Two tall chimneys, at different heights, so the roofline is not
            a single rhythm. */}
        <Chimney x={x + W - 0.78} y={y + 0.72} z={BATTER + 0.7} zTop={BATTER + 1.24} w={0.15} d={0.15} seed={seed} />
        <Chimney x={x + W - 0.78} y={y + D - 0.75} z={BATTER + 0.7} zTop={BATTER + 1.08} w={0.13} d={0.13} seed={seed + 1} />
        {/* Windows along the hall, lit from inside. */}
        <Window axis="y" plane={x + W} u={y + 0.95} z={BATTER + 0.24} w={0.16} h={0.22} lit={lit} seed={seed} />
        <Window axis="y" plane={x + W} u={y + 1.6} z={BATTER + 0.24} w={0.16} h={0.22} lit={lit} seed={seed + 1} />
        <Window axis="x" plane={y + D - 0.2} u={x + W - 0.5} z={BATTER + 0.24} w={0.16} h={0.22} lit={lit} seed={seed + 2} />
        {/* The hall's own door, a plank leaf with an iron ring, because a hall
            nobody can get into is a drawing and not a building. */}
        <Door axis="x" plane={y + D - 0.2} u={x + W - 0.78} z={BATTER} w={0.14} h={0.26}
          seed={seed + 5} arched />
      </g>

      

      {/* --- front wall, with the gate opening --------------------------- */}
      <g data-role="curtain" data-face="front" data-depth={x + W / 2 + y + D}>
        {/* Left of the gate. */}
        <Wall axis="x" plane={y + D} u0={x} u1={x + 1.42} z0={BATTER} z1={zWalk}
          fill={MAT.stoneCool} pattern="stone" seed={seed + 4} out={0.002} skirt={false} />
        <Crenellations axis="x" plane={y + D} u0={x} u1={x + 1.42} z={zWalk + 0.04} seed={seed + 4} />
        <Machicolations axis="x" plane={y + D} u0={x} u1={x + 1.42} z={zWalk} seed={seed + 4} />
        {/* Right of the gate. */}
        <Wall axis="x" plane={y + D} u0={x + 2.18} u1={x + W} z0={BATTER} z1={zWalk}
          fill={MAT.stoneCool} pattern="stone" seed={seed + 5} out={0.002} skirt={false} />
        <Crenellations axis="x" plane={y + D} u0={x + 2.18} u1={x + W} z={zWalk + 0.04} seed={seed + 5} />
        <Machicolations axis="x" plane={y + D} u0={x + 2.18} u1={x + W} z={zWalk} seed={seed + 5} />
        <ArrowLoop axis="x" plane={y + D} u={x + 0.55} z={BATTER + 0.3} seed={seed} />
        <ArrowLoop axis="x" plane={y + D} u={x + 3.05} z={BATTER + 0.3} seed={seed + 1} />
        {/* Ivy over the front wall, kept off the gate so the entrance reads. */}
        <Ivy axis="x" plane={y + D} u0={x + 0.18} u1={x + 1.24} z0={BATTER} z1={zWalk - 0.1}
          out={0.008} seed={seed + 4} />
        <Ivy axis="x" plane={y + D} u0={x + 2.32} u1={x + W - 0.16} z0={BATTER} z1={zWalk - 0.14}
          out={0.008} seed={seed + 5} />
        <Brazier x={x + 0.62} y={y + D - 0.2} z={zWalk + 0.05} seed={seed + 2} smoke={!lit} />
        <Brazier x={x + 3.1} y={y + D - 0.2} z={zWalk + 0.05} seed={seed + 3} smoke={!lit} />
        {/* Banners hanging on the outer face, either side of the gate. */}
        {[x + 0.72, x + 2.9].map((px, i) => (
          <g key={`bn${i}`} data-role="banner">
            <path
              d={`M${fmt(iso(px, y + D + 0.02, zWalk - 0.06, Z_HEIGHT))} L${fmt(iso(px, y + D + 0.02, zWalk - 0.44, Z_HEIGHT))}`}
              stroke={MAT.beamDark}
              strokeWidth={1.6}
            />
            <polygon
              points={P3([
                [px - 0.1, y + D + 0.02, zWalk - 0.12], [px + 0.1, y + D + 0.02, zWalk - 0.12],
                [px + 0.1, y + D + 0.02, zWalk - 0.5], [px, y + D + 0.02, zWalk - 0.42],
                [px - 0.1, y + D + 0.02, zWalk - 0.5],
              ])}
              fill={i ? MAT.clothAlt : pick(MAT.cloth, seed + i)}
            />
          </g>
        ))}
      </g>

      {/* --- the gatehouse, projecting from the wall line ---------------- */}
      <g data-role="gatehouse" data-depth={x + 1.8 + y + D + 0.21}>
        {/* Projecting block, taller than the curtain so it commands the gate. */}
        <Wall axis="y" plane={x + 1.95} u0={y + D} u1={y + D + 0.42} z0={0} z1={BATTER + 1.06}
          fill={MAT.stone} pattern="stone" seed={seed + 13} out={0.004} skirt={false} />
        <Wall axis="x" plane={y + D + 0.42} u0={x + 1.42} u1={x + 1.95} z0={0} z1={BATTER + 1.06}
          fill={MAT.stone} pattern="stone" seed={seed + 14} out={0.005} skirt={false} />
        <Wall axis="x" plane={y + D + 0.42} u0={x + 1.95} u1={x + 2.18} z0={0} z1={BATTER + 1.06}
          fill={MAT.stone} pattern="stone" seed={seed + 15} out={0.005} skirt={false} />
        <Wall axis="y" plane={x + 1.42} u0={y + D} u1={y + D + 0.42} z0={0} z1={BATTER + 1.06}
          fill={MAT.stone} pattern="stone" seed={seed + 16} out={0.003} skirt={false} />
        <Machicolations axis="x" plane={y + D + 0.42} u0={x + 1.42} u1={x + 2.18} z={BATTER + 1.06} depth={0.12} seed={seed} />
        <Crenellations axis="x" plane={y + D + 0.42} u0={x + 1.42} u1={x + 2.18} z={BATTER + 1.1} h={0.14} w={0.1} seed={seed} />
        <Crenellations axis="y" plane={x + 1.42} u0={y + D} u1={y + D + 0.42} z={BATTER + 1.1} h={0.12} w={0.1} seed={seed + 1} />
        <Crenellations axis="y" plane={x + 1.95} u0={y + D} u1={y + D + 0.42} z={BATTER + 1.1} h={0.12} w={0.1} seed={seed + 2} />
        {/* The arch and the gate itself. */}
        <Arch axis="x" plane={y + D + 0.42} u={x + 1.8} z={BATTER + 0.3} w={0.36} h={0.32} seed={seed} />
        <GatePassage axis="x" plane={y + D + 0.42} u={x + 1.8} z={BATTER + 0.3} w={0.34} h={0.32} open />
        {/* Murder holes over the passage, seen from below. */}
        {[-0.1, 0.1].map((o, i) => (
          <polygon
            key={`mh${i}`}
            points={P3([
              [x + 1.8 + o - 0.05, y + D + 0.06, BATTER + 1.02],
              [x + 1.8 + o + 0.05, y + D + 0.06, BATTER + 1.02],
              [x + 1.8 + o + 0.05, y + D + 0.34, BATTER + 1.02],
              [x + 1.8 + o - 0.05, y + D + 0.34, BATTER + 1.02],
            ])}
            fill="#1d1712"
          />
        ))}
        <ArrowLoop axis="x" plane={y + D + 0.42} u={x + 1.8} z={BATTER + 0.82} h={0.16} seed={seed + 3} />
        {/* Steps up to the gate, and the raised drawbridge. */}
        <Steps x={x + 1.56} y={y + D + 0.42} w={0.48} n={3} zTop={BATTER} rise={0.05} depth={0.13} />
        <Drawbridge x={x + 1.44} y={y + D + 0.72} w={0.72} z={BATTER + 0.14} seed={seed} />
        {/* A notice board on the gatehouse face: the castle is a building, and
            buildings have doors people knock on. */}
        <SignBoard x={x + 2.16} y={y + D + 0.46} z={0.14} w={0.22} h={0.2} device="axe" seed={seed} />
      </g>

      {/* Rubble and scrub where the masonry meets the ground, drawn last of all
          the ground-level dressing so they overlay the batter foot. */}
      <Rubble x={x} y={y} w={W} d={D} seed={seed + 20} />
      <Scrub x={x} y={y} w={W} d={D} seed={seed + 21} />
    </g>
  );
}

export default Castle;
