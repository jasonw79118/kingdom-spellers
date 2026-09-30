// Openings and attachments.
//
// A wall with no openings reads as a wall. A wall with leaded windows, shutters
// that are open at different angles, a plank door with ironwork, a porch with its
// own little roof, and a balcony with turned balusters reads as a house someone
// lives in. Every function here draws into a wall's plane using the same
// contract as walls.jsx, so they compose freely.

import { shade, iso, Z_HEIGHT } from "../../iso";
import { MAT, tones, pick } from "./materials";
import { wallRect, wallPoly } from "./walls";

const fmt = (p) => `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`;

/**
 * A window: a stone surround, a recessed reveal that throws the glass back, a
 * cross of glazing bars, and shutters hung open on the sides.
 *
 * `shutters` chooses the look:
 *   "open"    both leaves swung back against the wall (most characterful)
 *   "one"     one leaf open, one closed across the glass
 *   "closed"  both leaves shut, with a plank line and a hinge strap
 */
export function Window({
  axis = "x",
  plane,
  u,
  z,
  w = 0.2,
  h = 0.26,
  shutters = "open",
  lit = false,
  seed = 0,
  bar = true,
  sill = true,
  /** A hay-loft opening: dark, hoisted, no glass. Overrides everything else. */
  loft = false,
  /** A ventilation slit: a bare gap. Overrides everything else. */
  slit = false,
}) {
  const out = [];
  const t = tones(MAT.stoneLight);
  const glassFill = lit ? MAT.glassLit : MAT.glass;
  const shutterCol = seed % 3 === 0 ? MAT.shutterAlt : MAT.shutter;

  // Stone surround: a lintel above and jambs either side, each its own quad so
  // they read as dressed blocks rather than a drawn outline.
  out.push(
    <polygon
      key="lintel"
      points={wallRect(axis, plane, u - w / 2 - 0.028, u + w / 2 + 0.028, z + h, z + h + 0.038, 0.026)}
      fill={MAT.stoneLight}
    />,
  );
  out.push(
    <polygon
      key="lintelshade"
      points={wallRect(axis, plane, u - w / 2 - 0.028, u + w / 2 + 0.028, z + h, z + h + 0.012, 0.03)}
      fill={shade(MAT.stoneDark, 0)}
      opacity={0.7}
    />,
  );
  for (const s of [-1, 1]) {
    out.push(
      <polygon
        key={`j${s}`}
        points={wallRect(axis, plane, u + s * (w / 2) - (s > 0 ? 0 : 0.028), u + s * (w / 2) + (s > 0 ? 0.028 : 0), z, z + h, 0.026)}
        fill={t.front}
      />,
    );
  }

  // The reveal: the glass sits back inside the opening.
  out.push(
    <polygon
      key="reveal"
      points={wallRect(axis, plane, u - w / 2, u + w / 2, z, z + h, -0.03)}
      fill={MAT.glassDeep}
    />,
  );
  out.push(
    <polygon
      key="glass"
      points={wallRect(axis, plane, u - w / 2 + 0.012, u + w / 2 - 0.012, z + 0.012, z + h - 0.012, -0.024)}
      fill={glassFill}
    />,
  );
  // A sky reflection in the top corner, so the glass is not a flat swatch.
  out.push(
    <polygon
      key="sheen"
      points={wallPoly(axis, plane, [
        [u - w / 2 + 0.014, z + h - 0.016],
        [u + w / 2 - 0.014, z + h - 0.016],
        [u + w / 2 - 0.014, z + h - 0.07],
        [u - w / 2 + 0.014, z + h - 0.07],
      ], -0.02)}
      fill={lit ? "#fff0c4" : "#b9dbe6"}
      opacity={0.75}
    />,
  );
  if (bar) {
    // Glazing bars: one vertical, one horizontal.
    out.push(
      <polygon key="bv" points={wallRect(axis, plane, u - 0.008, u + 0.008, z, z + h, -0.02)} fill={MAT.beamDark} />,
    );
    out.push(
      <polygon key="bh" points={wallRect(axis, plane, u - w / 2, u + w / 2, z + h / 2 - 0.007, z + h / 2 + 0.007, -0.02)} fill={MAT.beamDark} />,
    );
  }
  // Frame.
  out.push(
    <polygon key="fb" points={wallRect(axis, plane, u - w / 2, u + w / 2, z, z + 0.016, 0.004)} fill={MAT.beamDark} />,
  );
  out.push(
    <polygon key="ft" points={wallRect(axis, plane, u - w / 2, u + w / 2, z + h - 0.016, z + h, 0.004)} fill={MAT.beamDark} />,
  );
  for (const s of [-1, 1]) {
    out.push(
      <polygon key={`fs${s}`} points={wallRect(axis, plane, u + s * (w / 2) - (s > 0 ? 0.016 : 0), u + s * (w / 2) + (s > 0 ? 0 : 0.016), z, z + h, 0.004)} fill={MAT.beamDark} />,
    );
  }

  if (sill) {
    // A projecting sill, with its underside in shadow and a cast shadow below.
    const sw = w / 2 + 0.05;
    out.push(
      <polygon key="sill" points={wallRect(axis, plane, u - sw, u + sw, z - 0.026, z, 0.042)} fill={MAT.stoneLight} />,
    );
    out.push(
      <polygon key="silltop" points={wallRect(axis, plane, u - sw, u + sw, z - 0.026, z - 0.012, 0.048)} fill={shade(MAT.stoneLight, 0.14)} />,
    );
    out.push(
      <polygon key="sillsh" points={wallRect(axis, plane, u - sw, u + sw, z - 0.05, z - 0.026, 0.014)} fill={shade(shutterCol, -0.4)} opacity={0.3} />,
    );
  }

  // Shutters.
  const leafW = w / 2 - 0.006;
  const leaf = (side) => {
    const g = [];
    // The leaf itself, swung out from the wall by `sw` grid units.
    const off = 0.03 + (shutters === "open" || (shutters === "one" && side > 0) ? 0.075 : 0);
    const uu = side > 0 ? u + w / 2 : u - w / 2 - leafW;
    const col = shade(shutterCol, side > 0 ? -0.12 : 0);
    g.push(
      <polygon key={`l${side}`} points={wallRect(axis, plane, uu, uu + leafW, z, z + h, off)} fill={col} />,
    );
    // Plank lines.
    for (let i = 1; i < 3; i += 1) {
      g.push(
        <polygon
          key={`p${side}-${i}`}
          points={wallRect(axis, plane, uu + (leafW * i) / 3 - 0.005, uu + (leafW * i) / 3 + 0.005, z, z + h, off + 0.006)}
          fill={shade(col, -0.14)}
        />,
      );
    }
    // Iron strap hinges.
    for (const zz of [z + 0.03, z + h - 0.05]) {
      g.push(
        <polygon key={`h${side}-${zz}`} points={wallRect(axis, plane, uu, uu + leafW * 0.55, zz, zz + 0.018, off + 0.01)} fill={MAT.iron} />,
      );
    }
    // The lit edge where the leaf turns away from the wall.
    g.push(
      <polygon
        key={`e${side}`}
        points={wallRect(axis, plane, side > 0 ? uu + leafW - 0.014 : uu, side > 0 ? uu + leafW : uu + 0.014, z, z + h, off + 0.004)}
        fill={shade(col, 0.2)}
      />,
    );
    return g;
  };
  if (shutters !== "none") {
    out.push(leaf(-1));
    out.push(leaf(1));
  }

  if (loft) {
    // A hay-loft opening. The same hole in the wall, but there is no glass and
    // no glazing bars: hay goes in on a pole through this. Dark inside, with
    // the sheaves stacked just inside catching the light, and a hoist beam
    // across the head of it.
    out.length = 0;
    out.push(
      <polygon
        key="lr"
        points={wallRect(axis, plane, u - w / 2 - 0.03, u + w / 2 + 0.03, z - 0.03, z + h + 0.03, 0.03)}
        fill={MAT.beamDark}
      />,
    );
    out.push(
      <polygon
        key="lin"
        points={wallRect(axis, plane, u - w / 2, u + w / 2, z, z + h, -0.03)}
        fill={shade(MAT.beamDark, -0.1)}
      />,
    );
    out.push(
      <polygon
        key="loftfloor"
        points={wallRect(axis, plane, u - w / 2, u + w / 2, z, z + h * 0.3, -0.02)}
        fill={shade(MAT.thatch, 0.12)}
        opacity={0.5}
      />,
    );
    // The hoist beam, seen end-on above the opening.
    out.push(
      <polygon
        key="hoist"
        points={wallRect(axis, plane, u - 0.022, u + 0.022, z + h - 0.02, z + h + 0.03, 0.06)}
        fill={MAT.beam}
      />,
    );
    // Rope hanging from the hoist, disappearing into the dark.
    out.push(
      <polygon
        key="rope"
        points={wallRect(axis, plane, u - 0.006, u + 0.006, z + h * 0.24, z + h - 0.02, 0.055)}
        fill="#c9b183"
        opacity={0.8}
      />,
    );
  }

  if (slit) {
    // A ventilation slit: a plain dark gap with a stone lintel, no joinery at
    // all. Deliberately the cheapest opening in the kit, so it reads as a hole
    // rather than a window.
    out.length = 0;
    out.push(
      <polygon
        key="sl"
        points={wallRect(axis, plane, u - w / 2 - 0.024, u + w / 2 + 0.024, z + h, z + h + 0.03, 0.024)}
        fill={MAT.stoneLight}
      />,
    );
    out.push(
      <polygon
        key="sld"
        points={wallRect(axis, plane, u - w / 2, u + w / 2, z, z + h, -0.02)}
        fill={MAT.glassDeep}
      />,
    );
    out.push(
      <polygon
        key="slb"
        points={wallRect(axis, plane, u - w / 2 + 0.01, u + w / 2 - 0.01, z + h - 0.016, z + h - 0.004, -0.014)}
        fill={shade(MAT.glassDeep, 0.5)}
        opacity={0.5}
      />,
    );
  }

  return <g data-role="window" data-shutters={shutters}>{out}</g>;
}

/** A door: vertical planks, a ledger line, iron hinges, a ring handle and a step. */
export function Door({
  axis = "x",
  plane,
  u,
  z = 0,
  w = 0.22,
  h = 0.34,
  seed = 0,
  open = false,
  arched = false,
}) {
  const out = [];
  const col = seed % 2 === 0 ? MAT.door : shade(MAT.door, -0.1);

  // The opening behind the door, so an open door shows darkness.
  out.push(
    <polygon key="hole" points={wallRect(axis, plane, u - w / 2, u + w / 2, z, z + h, -0.03)} fill="#241c16" />,
  );

  if (open) {
    // Swung inwards: the leaf rotates about its far jamb, drawn as a narrower
    // quad with a lit edge, plus the dark gap where it has swung away.
    const lu = u + w / 2 - w * 0.34;
    out.push(
      <polygon key="leaf" points={wallRect(axis, plane, lu, u + w / 2, z, z + h, 0.05)} fill={shade(col, -0.16)} />,
    );
    out.push(
      <polygon key="leafedge" points={wallRect(axis, plane, lu, lu + 0.012, z, z + h, 0.056)} fill={shade(col, 0.18)} />,
    );
    out.push(
      <polygon key="leafdark" points={wallRect(axis, plane, lu, lu + 0.008, z + 0.01, z + h - 0.01, -0.02)} fill={shade(col, -0.34)} />,
    );
  } else {
    // Closed: planks, ledger, ledges, straps, ring.
    const planks = 4;
    for (let i = 0; i < planks; i += 1) {
      const a = u - w / 2 + (w * i) / planks;
      const b = u - w / 2 + (w * (i + 1)) / planks;
      out.push(
        <polygon key={`p${i}`} points={wallRect(axis, plane, a + 0.004, b - 0.004, z, z + h, 0.01)} fill={shade(col, (i % 2) * 0.07 - 0.035)} />,
      );
    }
    // Cross ledges.
    for (const zz of [z + h * 0.24, z + h * 0.76]) {
      out.push(
        <polygon key={`lg${zz}`} points={wallRect(axis, plane, u - w / 2, u + w / 2, zz, zz + 0.022, 0.018)} fill={MAT.beamDark} />,
      );
    }
    // Straps and studs.
    for (const zz of [z + h * 0.24, z + h * 0.76]) {
      out.push(
        <polygon key={`st${zz}`} points={wallRect(axis, plane, u - w / 2 + 0.01, u - w / 2 + w * 0.5, zz, zz + 0.016, 0.022)} fill={MAT.iron} />,
      );
      for (let k = 0; k < 3; k += 1) {
        const su = u - w / 2 + 0.02 + (w * 0.48 * k) / 2;
        out.push(
          <polygon key={`sd${zz}-${k}`} points={wallRect(axis, plane, su, su + 0.012, zz + 0.003, zz + 0.013, 0.03)} fill={MAT.ironLight} />,
        );
      }
    }
    // Ring handle.
    const ring = axis === "x"
      ? iso(u + w * 0.26, plane, z + h * 0.5, Z_HEIGHT)
      : iso(plane, u + w * 0.26, z + h * 0.5, Z_HEIGHT);
    out.push(<ellipse key="ring" cx={round(ring.x)} cy={round(ring.y)} rx={2.1} ry={2.6} fill="none" stroke={MAT.iron} strokeWidth={1.3} />);
  }

  // Stone surround, and a worn step below.
  out.push(
    <polygon key="arch" points={wallRect(axis, plane, u - w / 2 - 0.03, u + w / 2 + 0.03, z + h, z + h + 0.036, 0.024)} fill={MAT.stoneLight} />,
  );
  if (arched) {
    out.push(
      <polygon
        key="archfill"
        points={wallPoly(axis, plane, [
          [u - w / 2 - 0.03, z + h],
          [u + w / 2 + 0.03, z + h],
          [u + w / 2 + 0.03, z + h + 0.05],
          [u + 0.02, z + h + 0.1],
          [u - 0.02, z + h + 0.1],
          [u - w / 2 - 0.03, z + h + 0.05],
        ], 0.02)}
        fill={MAT.stoneLight}
      />,
    );
  }
  out.push(
    <polygon key="step" points={wallRect(axis, plane, u - w / 2 - 0.06, u + w / 2 + 0.06, z - 0.03, z, 0.06)} fill={MAT.stone} />,
  );
  out.push(
    <polygon key="steptop" points={wallRect(axis, plane, u - w / 2 - 0.06, u + w / 2 + 0.06, z - 0.03, z - 0.014, 0.07)} fill={MAT.stoneLight} />,
  );

  return <g data-role="door">{out}</g>;
}

/**
 * A porch: a canopy on posts over the front door, with its own little pitched
 * roof. This is the single most effective way to make a doorway feel sheltered
 * and the wall feel inhabited.
 */
export function Porch({ x, y, w = 0.5, zTop = 0.4, face = MAT.tile[0], seed = 0, depth = 0.22 }) {
  const out = [];
  const yf = y + depth;
  const rise = 0.1;
  const zr = zTop + rise;

  // Posts, standing on the ground.
  for (const u of [x, x + w]) {
    const g = iso(u, yf, 0, Z_HEIGHT);
    const t = iso(u, yf, zTop, Z_HEIGHT);
    out.push(
      <polygon
        key={`p${round(u)}`}
        points={P3grid([
          [u - 0.022, yf - 0.022, 0], [u + 0.022, yf - 0.022, 0],
          [u + 0.022, yf + 0.022, 0], [u - 0.022, yf + 0.022, 0],
        ])}
        fill={MAT.beamDark}
        opacity={0.28}
      />,
    );
    out.push(
      <path
        key={`pp${round(u)}`}
        d={`M${round(g.x)},${round(g.y)} L${round(t.x)},${round(t.y)}`}
        stroke={MAT.beam}
        strokeWidth={3}
        strokeLinecap="round"
      />,
    );
  }
  // The canopy: a shallow gable running along the wall.
  const yb = y + 0.03;
  out.push(
    <polygon
      key="canopy"
      points={P3grid([
        [x - 0.05, yf + 0.05, zTop], [x + w + 0.05, yf + 0.05, zTop],
        [x + w + 0.05, yb, zr], [x - 0.05, yb, zr],
      ])}
      fill={shade(face, -0.06)}
    />,
  );
  out.push(
    <polygon
      key="canopyseam"
      points={P3grid([
        [x - 0.05, yb, zr], [x + w + 0.05, yb, zr],
        [x + w + 0.05, yb - 0.035, zr - 0.03], [x - 0.05, yb - 0.035, zr - 0.03],
      ])}
      fill={shade(face, 0.18)}
    />,
  );
  // Valance board with a scalloped edge under the front lip.
  out.push(
    <polygon
      key="valance"
      points={P3grid([
        [x - 0.05, yf + 0.05, zTop], [x + w + 0.05, yf + 0.05, zTop],
        [x + w + 0.05, yf + 0.05, zTop - 0.035], [x - 0.05, yf + 0.05, zTop - 0.035],
      ])}
      fill={MAT.beamDark}
    />,
  );
  const scallops = Math.max(2, Math.round(w / 0.11));
  for (let i = 0; i < scallops; i += 1) {
    const a = x - 0.05 + ((w + 0.1) * i) / scallops;
    const b = x - 0.05 + ((w + 0.1) * (i + 1)) / scallops;
    const mid = (a + b) / 2;
    out.push(
      <polygon
        key={`sc${i}`}
        points={P3grid([
          [a, yf + 0.05, zTop - 0.035], [b, yf + 0.05, zTop - 0.035],
          [mid, yf + 0.05, zTop - 0.062],
        ])}
        fill={MAT.beam}
      />,
    );
  }
  return <g data-role="porch" data-seed={seed}>{out}</g>;
}

/** Steps leading up to a door, each a receding tread. */
export function Steps({ x, y, w = 0.4, n = 3, zTop = 0, rise = 0.045, depth = 0.16 }) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const yy = y + i * depth;
    const zz = zTop - (n - i) * rise;
    out.push(
      <polygon
        key={`t${i}`}
        points={P3grid([[x, yy, zz], [x + w, yy, zz], [x + w, yy, zz + rise], [x, yy, zz + rise]])}
        fill={MAT.stoneLight}
      />,
    );
    out.push(
      <polygon
        key={`f${i}`}
        points={P3grid([[x, yy, zz], [x + w, yy, zz], [x + w, yy - 0.02, zz], [x, yy - 0.02, zz]])}
        fill={MAT.stone}
      />,
    );
  }
  return <g data-role="steps">{out}</g>;
}

/**
 * A balcony on the upper storey: a projecting timber floor with turned
 * balusters and a handrail.
 */
export function Balcony({ x, y, w = 0.6, z = 0.6, depth = 0.2, seed = 0 }) {
  const out = [];
  const yf = y + depth;

  // The floor slab: top surface, then the front edge in shadow.
  out.push(
    <polygon
      key="top"
      points={P3grid([[x, y, z], [x + w, y, z], [x + w, yf, z], [x, yf, z]])}
      fill={shade(MAT.beam, 0.16)}
    />,
  );
  out.push(
    <polygon
      key="front"
      points={P3grid([[x, yf, z], [x + w, yf, z], [x + w, yf, z - 0.035], [x, yf, z - 0.035]])}
      fill={MAT.beamDark}
    />,
  );
  // Corbels under it.
  for (let i = 0; i < 4; i += 1) {
    const u = x + 0.03 + ((w - 0.06) * i) / 3;
    out.push(
      <polygon
        key={`cb${i}`}
        points={P3grid([[u - 0.018, yf - 0.06, z - 0.035], [u + 0.018, yf - 0.06, z - 0.035], [u + 0.018, yf, z - 0.085], [u - 0.018, yf, z - 0.085]])}
        fill={MAT.beam}
      />,
    );
  }
  // Balusters and handrail on the front and both ends.
  const rails = [];
  const posts = Math.max(3, Math.round(w / 0.09));
  for (let i = 0; i <= posts; i += 1) {
    const u = x + (w * i) / posts;
    const a = iso(u, yf, z - 0.035, Z_HEIGHT);
    const b = iso(u, yf, z + 0.14, Z_HEIGHT);
    rails.push(
      <path key={`b${i}`} d={`M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)}`} stroke={MAT.beam} strokeWidth={1.8} strokeLinecap="round" />,
    );
  }
  // Handrail.
  const r0 = iso(x, yf, z + 0.14, Z_HEIGHT);
  const r1 = iso(x + w, yf, z + 0.14, Z_HEIGHT);
  rails.push(<path key="rail" d={`M${round(r0.x)},${round(r0.y)} L${round(r1.x)},${round(r1.y)}`} stroke={shade(MAT.beam, 0.2)} strokeWidth={3.2} strokeLinecap="round" />);
  out.push(...rails);

  return <g data-role="balcony" data-seed={seed}>{out}</g>;
}

/**
 * A hanging trade sign on an iron bracket — the inn's and the blacksmith's
 * signature. Board, frame, and a painted device.
 */
export function HangingSign({ x, y, z, w = 0.3, h = 0.2, device = "cup", seed = 0 }) {
  const out = [];
  const armOut = 0.2;

  // Bracket: an arm off the wall and a diagonal stay.
  const a0 = iso(x, y, z + 0.06, Z_HEIGHT);
  const a1 = iso(x, y + armOut, z + 0.06, Z_HEIGHT);
  out.push(<path key="arm" d={`M${round(a0.x)},${round(a0.y)} L${round(a1.x)},${round(a1.y)}`} stroke={MAT.iron} strokeWidth={2.4} />);
  out.push(<path key="stay" d={`M${round(iso(x, y, z - 0.08, Z_HEIGHT).x)},${round(iso(x, y, z - 0.08, Z_HEIGHT).y)} L${round(a1.x)},${round(a1.y)}`} stroke={MAT.iron} strokeWidth={1.6} />);

  // The board hangs below the arm's end.
  const bx = x + 0.05;
  const by = y + armOut;
  out.push(
    <polygon
      key="board"
      points={wallRect("x", by, bx, bx + w, z - 0.14, z + 0.02, 0)}
      fill={MAT.beamWarm}
    />,
  );
  out.push(
    <polygon
      key="boardshade"
      points={wallRect("x", by, bx + w * 0.55, bx + w, z - 0.14, z + 0.02, 0.004)}
      fill={MAT.beamDark}
      opacity={0.35}
    />,
  );
  // Frame.
  out.push(
    <polygon key="frame" points={wallRect("x", by + 0.006, bx, bx + w, z - 0.14, z - 0.115, 0)} fill={MAT.beamDark} />,
  );
  // Hangers.
  for (const u of [bx + 0.02, bx + w - 0.02]) {
    const a = iso(u, by, z + 0.06, Z_HEIGHT);
    const b = iso(u, by, z + 0.02, Z_HEIGHT);
    out.push(<path key={`hg${round(u)}`} d={`M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)}`} stroke={MAT.iron} strokeWidth={1.3} />);
  }

  // The painted device.
  const cx = bx + w / 2;
  const cz = z - 0.06;
  const p = (u, zz) => iso(u, by, zz, Z_HEIGHT);
  if (device === "cup") {
    const c = p(cx, cz);
    out.push(<ellipse key="cup" cx={round(c.x)} cy={round(c.y)} r={5} fill="#efe3c8" />);
    out.push(<ellipse key="cupin" cx={round(c.x)} cy={round(c.y)} r={3} fill={MAT.beamDark} />);
    const hd = iso(cx + w * 0.34, by, cz, Z_HEIGHT);
    out.push(<path key="hdl" d={`M${round(c.x + 5)},${round(c.y)} A4 4 0 0 1 ${round(hd.x)},${round(hd.y)}`} fill="none" stroke="#efe3c8" strokeWidth={2} />);
  } else if (device === "hammer") {
    const c = p(cx, cz);
    out.push(<path key="hstem" d={`M${round(c.x - 3)},${round(c.y + 6)} L${round(c.x + 3)},${round(c.y - 5)}`} stroke={MAT.beamDark} strokeWidth={3} strokeLinecap="round" />);
    out.push(<rect key="hhead" x={round(c.x)} y={round(c.y - 10)} width={9} height={5} rx={1.5} fill={MAT.ironLight} />);
  } else if (device === "sheaf") {
    const c = p(cx, cz);
    out.push(<path key="st1" d={`M${round(c.x - 3)},${round(c.y + 7)} L${round(c.x)},${round(c.y - 8)}`} stroke="#e8cf82" strokeWidth={2.4} strokeLinecap="round" />);
    out.push(<path key="st2" d={`M${round(c.x + 3)},${round(c.y + 7)} L${round(c.x)},${round(c.y - 8)}`} stroke="#e8cf82" strokeWidth={2.4} strokeLinecap="round" />);
    out.push(<path key="tie" d={`M${round(c.x - 4)},${round(c.y)} L${round(c.x + 4)},${round(c.y)}`} stroke={MAT.beamDark} strokeWidth={2} />);
  }

  return <g data-role="sign" data-device={device}>{out}</g>;
}

/** A freestanding sign board — a shop sign, or a boundary marker. */
export function SignBoard({ x, y, z = 0, w = 0.26, h = 0.22, device = null, seed = 0 }) {
  const out = [];
  out.push(
    <polygon key="board" points={wallRect("x", y, x + w / 2 - w, x + w / 2, z + h - 0.12, z + h, 0)} fill={MAT.beamWarm} />,
  );
  out.push(
    <polygon
      key="boardsh"
      points={wallRect("x", y, x + w / 2, x + w / 2 + w * 0.06, z + h - 0.12, z + h, 0.004)}
      fill={MAT.beamDark}
      opacity={0.3}
    />,
  );
  for (const s of [-1, 1]) {
    const g = iso(x + w / 2 + s * w * 0.32, y, 0, Z_HEIGHT);
    const t = iso(x + w / 2 + s * w * 0.32, y, z + h - 0.1, Z_HEIGHT);
    out.push(<path key={`p${s}`} d={`M${round(g.x)},${round(g.y)} L${round(t.x)},${round(t.y)}`} stroke={MAT.beam} strokeWidth={2.6} strokeLinecap="round" />);
  }
  if (device === "arrow") {
    const c = iso(x + w / 2, y, z + h - 0.06, Z_HEIGHT);
    out.push(<path key="ar" d={`M${round(c.x - 7)},${round(c.y)} L${round(c.x + 6)},${round(c.y)}`} stroke="#efe3c8" strokeWidth={2.2} strokeLinecap="round" />);
    out.push(<polygon key="arh" points={`${round(c.x + 3)},${round(c.y - 3.4)} ${round(c.x + 8)},${round(c.y)} ${round(c.x + 3)},${round(c.y + 3.4)}`} fill="#efe3c8" />);
  }
  return <g data-role="signboard" data-seed={seed}>{out}</g>;
}

/** A barrel: staves, two iron hoops, and a lit rim. */
export function Barrel({ x, y, z = 0, r = 0.07, h = 0.16, seed = 0, tipped = false }) {
  const steps = 10;
  const out = [];
  const stave = (i, k) => {
    const a0 = (Math.PI * 2 * i) / steps;
    const a1 = (Math.PI * 2 * (i + 1)) / steps;
    const mid = (a0 + a1) / 2;
    // Bulge the middle: the radius swells at mid height, like a real cask.
    const rr = r * (0.86 + 0.14 * Math.sin(k * Math.PI));
    const p0 = iso(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr, z, Z_HEIGHT);
    const p1 = iso(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr, z, Z_HEIGHT);
    const p2 = iso(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr, z + h, Z_HEIGHT);
    const p3 = iso(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr, z + h, Z_HEIGHT);
    const lam = Math.cos(mid - Math.PI * 1.15);
    out.push(
      <polygon key={`s${i}-${k}`} points={`${fmt(p0)} ${fmt(p1)} ${fmt(p2)} ${fmt(p3)}`} fill={shade(MAT.beamWarm, lam * 0.26 - 0.05)} />,
    );
  };
  const rows = 3;
  for (let k = 0; k < rows; k += 1) {
    for (let i = 0; i < steps; i += 1) stave(i, (k + 0.5) / rows);
  }
  // Hoops.
  for (const t of [0.22, 0.78]) {
    for (let i = 0; i < steps; i += 1) {
      const a0 = (Math.PI * 2 * i) / steps;
      const a1 = (Math.PI * 2 * (i + 1)) / steps;
      const rr = r * (0.86 + 0.14 * Math.sin(t * Math.PI)) * 1.04;
      const p0 = iso(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr, z + h * t, Z_HEIGHT);
      const p1 = iso(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr, z + h * t, Z_HEIGHT);
      const mid = (a0 + a1) / 2;
      out.push(
        <path
          key={`h${t}-${i}`}
          d={`M${round(p0.x)},${round(p0.y)} L${round(p1.x)},${round(p1.y)}`}
          stroke={MAT.iron}
          strokeWidth={1.5}
          opacity={0.85}
        />,
      );
    }
  }
  // Head and top rim.
  const top = iso(x, y, z + h, Z_HEIGHT);
  out.push(<ellipse key="head" cx={round(top.x)} cy={round(top.y)} rx={round(r * 0.9 * 0.98)} ry={round(r * 0.45)} fill={shade(MAT.beamWarm, 0.2)} />);
  out.push(<ellipse key="headin" cx={round(top.x)} cy={round(top.y)} rx={round(r * 0.9 * 0.68)} ry={round(r * 0.45 * 0.68)} fill={shade(MAT.beamDark, 0.04)} />);
  return <g data-role="barrel" data-seed={seed} transform={tipped ? `rotate(90 ${round(top.x)} ${round(top.y)})` : undefined}>{out}</g>;
}

/** A crate: planks, corner battens, and a slat gap so it is not a solid cube. */
export function Crate({ x, y, z = 0, w = 0.13, h = 0.12, seed = 0 }) {
  const out = [];
  const y2 = y + w;
  // Front (+y) and right (+x) faces, top.
  out.push(
    <polygon key="front" points={P3grid([[x, y2, z], [x + w, y2, z], [x + w, y2, z + h], [x, y2, z + h]])} fill={MAT.beamWarm} />,
  );
  out.push(
    <polygon key="right" points={P3grid([[x + w, y, z], [x + w, y2, z], [x + w, y2, z + h], [x + w, y, z + h]])} fill={shade(MAT.beamWarm, -0.16)} />,
  );
  out.push(
    <polygon key="top" points={P3grid([[x, y, z + h], [x + w, y, z + h], [x + w, y2, z + h], [x, y2, z + h]])} fill={shade(MAT.beamWarm, 0.2)} />,
  );
  // Planks on the front, with shadowed gaps.
  for (let i = 1; i < 3; i += 1) {
    out.push(
      <polygon key={`p${i}`} points={P3grid([[x + (w * i) / 3, y2 - 0.004, z], [x + (w * i) / 3 + 0.008, y2 - 0.004, z], [x + (w * i) / 3 + 0.008, y2 - 0.004, z + h], [x + (w * i) / 3, y2 - 0.004, z + h]])} fill={MAT.beamDark} />,
    );
  }
  // Corner battens.
  out.push(
    <polygon key="b1" points={P3grid([[x, y2, z], [x + 0.016, y2, z], [x + 0.016, y2, z + h], [x, y2, z + h]])} fill={shade(MAT.beam, 0.08)} />,
  );
  out.push(
    <polygon key="b2" points={P3grid([[x + w - 0.016, y2, z], [x + w, y2, z], [x + w, y2, z + h], [x + w - 0.016, y2, z + h]])} fill={MAT.beamDark} />,
  );
  // A diagonal brace, so crates are not three untextured quads.
  out.push(
    <polygon
      key="brace"
      points={P3grid([[x + 0.02, y2 - 0.006, z + 0.02], [x + w - 0.02, y2 - 0.006, z + 0.02], [x + w - 0.02, y2 - 0.006, z + 0.036], [x + 0.02, y2 - 0.006, z + 0.036]])}
      fill={MAT.beam}
      opacity={0.55}
    />,
  );
  return <g data-role="crate" data-seed={seed}>{out}</g>;
}

/** The cut end of a log: a circle in the x–z plane, mapped through iso. */
function logEnd(u, y, zz, rad, n = 9) {
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (Math.PI * 2 * i) / n;
    pts.push([u + Math.cos(a) * rad, y, zz + Math.sin(a) * rad]);
  }
  return P3grid(pts);
}

/**
 * A stack of split firewood, coursed and slightly irregular, so a woodpile
 * reads as stacked timber rather than a brown box.
 */
export function Woodpile({ x, y, z = 0, w = 0.4, d = 0.14, h = 0.14, seed = 0 }) {
  const out = [];
  const rows = 3;
  const perRow = Math.max(3, Math.round(w / 0.055));
  const rnd = mulberry(Math.round(seed * 101) + 11);
  const len = d * 2.6;
  for (let r = 0; r < rows; r += 1) {
    // Work front to back so nearer logs overlap the ones behind.
    for (let i = 0; i < perRow; i += 1) {
      const u = x + (w * (i + 0.5)) / perRow + (rnd() - 0.5) * 0.014;
      const yF = y + (rnd() - 0.5) * 0.014;
      const rad = 0.024 * (0.78 + rnd() * 0.42);
      const zz = z + (h * (r + 0.35)) / rows + rad;
      const tone = shade("#a8845a", (rnd() - 0.5) * 0.34);
      // Body: the top of the log running back into the pile.
      out.push(
        <polygon
          key={`b${r}-${i}`}
          points={P3grid([
            [u - rad * 0.7, yF, zz + rad * 0.7],
            [u + rad * 0.7, yF, zz + rad * 0.7],
            [u + rad * 0.7, yF + len, zz + rad * 0.7],
            [u - rad * 0.7, yF + len, zz + rad * 0.7],
          ])}
          fill={shade(tone, -0.22)}
        />,
      );
      // The cut end, lighter, with a ring.
      out.push(<polygon key={`e${r}-${i}`} points={logEnd(u, yF, zz, rad)} fill={shade(tone, 0.16)} />);
      out.push(
        <polygon
          key={`r${r}-${i}`}
          points={logEnd(u, yF - 0.004, zz, rad * 0.55)}
          fill={shade(tone, -0.08)}
        />,
      );
    }
  }
  return <g data-role="woodpile" data-seed={seed}>{out}</g>;
}

function mulberry(a) {
  return function rnd() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function P3grid(list) {
  return list.map((p) => fmt(iso(p[0], p[1], p[2], Z_HEIGHT))).join(" ");
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export { P3grid as gridPts, round as partRound };
