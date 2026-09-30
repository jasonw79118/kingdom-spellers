// The five test buildings.
//
// These are the assets the rest of the game is waiting on. Each one is composed
// from the kit in walls.jsx / roof.jsx / parts.jsx using the construction the
// art brief specifies:
//
//   Cottage    irregular plan, stone footing, timber frame, steep pitched tile
//              roof, one dormer, chimney, shutters, porch, flower patch,
//              woodpile
//   Blacksmith timber-and-stone shop, open forge under a lean-to awning,
//              chimney, firewood stacks, barrels, anvil, trade sign
//   Inn        two jettied storeys, multiple roof sections, hanging cup sign,
//              chimney, porch, balcony, exterior barrels
//   Manor      stone ground floor, jettied timber first floor, small corner
//              tower with a conical roof, banner, courtyard wall, steps
//   Farm       long barn, attached lean-to, varied roofline, hay, fence, cart
//
// Depth: everything is drawn back to front. Building footprints are declared in
// grid units and the ground origin is the near-left corner of the footprint, so
// callers can place them on the kingdom grid with a single translate.

import { shade, iso, Z_HEIGHT } from "../../iso";
import { MAT, pick } from "./materials";
import { Wall, Jetty, Footing, wallRect } from "./walls";
import { Roof, Chimney, Tower, LeanTo } from "./roof";
import {
  Window, Door, Porch, Steps, Balcony, HangingSign, Barrel, Crate, Woodpile, SignBoard,
} from "./parts";

const fmt = (p) => `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`;
const P3 = (list) => list.map((p) => fmt(iso(p[0], p[1], p[2], Z_HEIGHT))).join(" ");
const round = (n) => Math.round(n * 100) / 100;

/** A soft contact shadow on the ground, so nothing floats. */
function Ground({ x, y, w, d, o = 0.1, op = 0.26 }) {
  return (
    <polygon
      data-role="shadow"
      points={P3([
        [x - o, y - o, 0], [x + w + o, y - o, 0],
        [x + w + o, y + d + o, 0], [x - o, y + d + o, 0],
      ])}
      fill="#2c3a24"
      opacity={op}
    />
  );
}

// ---------------------------------------------------------------------------
// Cottage
// ---------------------------------------------------------------------------

/**
 * A cottage. Deliberately NOT a rectangle: the main block is offset from a
 * smaller cross-wing, which is how real vernacular cottages grew, and which
 * gives the silhouette a step instead of a single outline.
 */
export function Cottage({ x = 0, y = 0, seed = 0, lit = true }) {
  const plaster = pick(MAT.plaster, seed);
  const tile = pick(MAT.tile, seed + 3);
  const thatch = MAT.thatch;
  const W = 1.55;
  const D = 1.25;
  const H = 0.62;          // ground storey wall height
  const RISE = 0.62;       // roof rise, steep ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a cottage roof is steep
  const wingW = 0.72;
  const wingD = 0.78;

  return (
    <g data-role="building" data-id="shop-cottage" data-seed={seed}>
      <Ground x={x} y={y} w={W + wingW} d={D + wingD} o={0.14} />

      {/* --- main block ---------------------------------------------------- */}
      {/* Right wall, drawn first so the front wall overlaps it cleanly. */}
      <Wall axis="y" plane={x + W} u0={y} u1={y + D} z0={0} z1={H}
        fill={plaster} pattern="timber" seed={seed} studs={2} />
      {/* Front wall, with a door and two shuttered windows. */}
      <Wall axis="x" plane={y + D} u0={x} u1={x + W} z0={0} z1={H}
        fill={plaster} pattern="timber" seed={seed + 1} studs={3} />
      <Footing axis="x" plane={y + D} u0={x} u1={x + W} z0={0} h={0.11} seed={seed} />
      <Footing axis="y" plane={x + W} u0={y} u1={y + D} z0={0} h={0.11} seed={seed + 1} />
      <Window axis="x" plane={y + D} u={x + 0.3} z={0.26} w={0.19} h={0.24}
        shutters="open" lit={lit} seed={seed} />
      <Window axis="x" plane={y + D} u={x + W - 0.3} z={0.26} w={0.19} h={0.24}
        shutters="one" lit={lit} seed={seed + 1} />
      <Window axis="y" plane={x + W} u={y + 0.42} z={0.28} w={0.18} h={0.22}
        shutters="open" lit={lit} seed={seed + 2} />
      <Door axis="x" plane={y + D} u={x + W * 0.5} z={0} w={0.23} h={0.36} seed={seed} arched />
      <Porch x={x + W * 0.5 - 0.28} y={y + D} w={0.56} zTop={0.42} face={tile} seed={seed} depth={0.2} />

      {/* Steep tiled roof over the main block. */}
      <Roof x={x} y={y} w={W} d={D} z={H} rise={RISE} face={tile} seed={seed} overhang={0.15}
        gableFill={plaster} />
      {/* A cross-gable over the door: the most recognisable feature of a
          vernacular cottage, and it steps the roofline instead of leaving one
          long unbroken triangle. */}
      <CrossGable x={x + W * 0.5} y={y + D} w={0.62} z={H + RISE * 0.3} rise={0.38}
        face={tile} seed={seed} />
      <Dormerish x={x} y={y} w={W} d={D} z={H} rise={RISE} u={x + W * 0.66} seed={seed} face={tile} />
      {/* Two chimneys at different heights, so the skyline is not symmetric. */}
      <Chimney x={x + W * 0.3} y={y + D * 0.5 - 0.09} z={H + 0.1} zTop={H + RISE + 0.3}
        w={0.17} d={0.17} seed={seed} />
      <Chimney x={x + W * 0.82} y={y + D * 0.26} z={H + 0.1} zTop={H + RISE + 0.12}
        w={0.13} d={0.13} seed={seed + 1} />
        w={0.17} d={0.17} seed={seed} />

      {/* --- cross-wing: a lower, thatched extension ------------------------ */}
      <Wall axis="y" plane={x + W + wingW} u0={y + D - wingD} u1={y + D} z0={0} z1={H * 0.72}
        fill={shade(plaster, -0.06)} pattern="timber" seed={seed + 2} studs={1} />
      <Wall axis="x" plane={y + D} u0={x + W} u1={x + W + wingW} z0={0} z1={H * 0.72}
        fill={shade(plaster, -0.06)} pattern="timber" seed={seed + 3} studs={1} />
      <Window axis="x" plane={y + D} u={x + W + wingW * 0.5} z={0.2} w={0.16} h={0.2}
        shutters="closed" lit={lit} seed={seed + 4} />
      {/* Thatch: a simple pitch, but with a rounded combed ridge and a sag. */}
      <LeanTo axis="x" plane={y + D} u0={x + W} u1={x + W + wingW}
        zHigh={H * 0.72} zLow={H * 0.72 - 0.3} depth={wingD} face={thatch} seed={seed} />
      <ThatchRidge x={x + W} y={y + D} w={wingW} z={H * 0.72} />

      {/* --- dressing ------------------------------------------------------ */}
      <Woodpile x={x - 0.05} y={y + D + 0.12} z={0} w={0.42} d={0.12} h={0.13} seed={seed} />
      <FlowerPatch x={x + 0.16} y={y + D + 0.16} seed={seed} r={0.2} />
      <FlowerPatch x={x + W + wingW - 0.18} y={y + D + 0.14} seed={seed + 1} r={0.17} />
      <Crate x={x - 0.06} y={y + 0.1} z={0} w={0.12} h={0.11} seed={seed} />
      <Barrel x={x + 0.02} y={y + 0.06} z={0} r={0.065} h={0.15} seed={seed} />
      <Weeds x={x - 0.1} y={y + D - 0.05} seed={seed + 2} />
      <Weeds x={x + W + wingW + 0.06} y={y + D * 0.5} seed={seed + 3} />
    </g>
  );
}

/** A dormer placed correctly on a `Roof`'s slope. */
function Dormerish({ x, y, w, d, z, rise, u, seed, face }) {
  const overhang = 0.15;
  const yEave = y + d + overhang;
  const yRidge = y + d / 2;
  const zr = z + rise;
  // Sit the dormer a third of the way down from the ridge.
  const zc = zr - rise * 0.3;
  const yAt = yRidge + (yEave - yRidge) * 0.3;
  return (
    <g data-role="dormer-mount">
      <DormerInner u={u} zc={zc} yEave={yAt - 0.02} yRidge={yRidge} face={face} seed={seed} />
    </g>
  );
}

function DormerInner({ u, zc, yEave, yRidge, face, seed }) {
  const out = [];
  const w = 0.34;
  const h = 0.24;
  const rise = 0.13;
  const depth = 0.1;
  const yf = yEave + depth;

  // Cheeks: the roof falling away either side.
  out.push(
    <polygon key="cl" points={P3([[u - w / 2, yEave, zc], [u - w / 2, yRidge, zc + rise], [u - w / 2, yEave, zc + rise]])} fill={shade(face, -0.3)} />,
  );
  out.push(
    <polygon key="cr" points={P3([[u + w / 2, yEave, zc], [u + w / 2, yRidge, zc + rise], [u + w / 2, yEave, zc + rise]])} fill={shade(face, -0.16)} />,
  );
  // Front wall, framed.
  out.push(
    <polygon key="fw" points={wallRect("x", yf, u - w / 2, u + w / 2, zc, zc + h, 0)} fill={MAT.plaster[2]} />,
  );
  out.push(
    <polygon key="fwl" points={wallRect("x", yf, u - w / 2, u - w / 2 + 0.026, zc, zc + h, 0.005)} fill={MAT.beam} />,
  );
  out.push(
    <polygon key="fwr" points={wallRect("x", yf, u + w / 2 - 0.026, u + w / 2, zc, zc + h, 0.005)} fill={MAT.beamDark} />,
  );
  // Its own little roof.
  out.push(
    <polygon key="dr" points={P3([[u - w / 2 - 0.035, yf + 0.03, zc + h], [u + w / 2 + 0.035, yf + 0.03, zc + h], [u + w / 2 + 0.035, yf, zc + h + rise], [u - w / 2 - 0.035, yf, zc + h + rise]])} fill={shade(face, -0.05)} />,
  );
  out.push(
    <polygon key="drt" points={P3([[u - w / 2 - 0.035, yf, zc + h + rise], [u + w / 2 + 0.035, yf, zc + h + rise], [u + w / 2 + 0.035, yf - 0.05, zc + h + rise - 0.025], [u - w / 2 - 0.035, yf - 0.05, zc + h + rise - 0.025]])} fill={shade(face, 0.18)} />,
  );
  // A small shuttered window in the dormer.
  out.push(
    <polygon key="dw" points={wallRect("x", yf + 0.012, u - 0.05, u + 0.05, zc + 0.06, zc + h - 0.05, 0)} fill={MAT.glassLit} />,
  );
  out.push(
    <polygon key="dwb" points={wallRect("x", yf + 0.02, u - 0.008, u + 0.008, zc + 0.06, zc + h - 0.05, 0)} fill={MAT.beamDark} />,
  );
  return <g data-role="dormer" data-seed={seed}>{out}</g>;
}

/** A combed ridge on a thatch roof, with a rounded profile. */
function ThatchRidge({ x, y, w, z }) {
  const out = [];
  const n = Math.max(4, Math.round(w * 8));
  for (let i = 0; i < n; i += 1) {
    const a = x - 0.04 + ((w + 0.08) * i) / n;
    const b = x - 0.04 + ((w + 0.08) * (i + 1)) / n;
    const t = Math.sin((Math.PI * (i + 0.5)) / n);
    out.push(
      <polygon
        key={i}
        points={P3([[a, y - 0.04, z - 0.02], [b, y - 0.04, z - 0.02], [b, y + 0.04, z + 0.03 * t], [a, y + 0.04, z + 0.03 * t]])}
        fill={i % 2 ? MAT.thatch : MAT.thatchDark}
      />,
    );
  }
  return <g data-role="thatch-ridge">{out}</g>;
}

/** A patch of flowers and tufts at the foot of a wall. */
function FlowerPatch({ x, y, seed, r = 0.18 }) {
  const out = [];
  const rnd = mulberry(Math.round(seed * 77) + 5);
  const n = 8;
  for (let i = 0; i < n; i += 1) {
    const a = (Math.PI * 2 * i) / n;
    const rr = r * (0.5 + rnd() * 0.5);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.6;
    const col = MAT.flower[Math.floor(rnd() * MAT.flower.length)];
    const g = iso(px, py, 0, Z_HEIGHT);
    out.push(<path key={`st${i}`} d={`M${round(g.x)},${round(g.y)} L${round(g.x + (rnd() - 0.5) * 3)},${round(g.y - 5 - rnd() * 3)}`} stroke={MAT.turf} strokeWidth={1} />);
    out.push(<circle key={`fl${i}`} cx={round(g.x + (rnd() - 0.5) * 3)} cy={round(g.y - 6 - rnd() * 3)} r={1.7} fill={col} />);
  }
  return <g data-role="flowers">{out}</g>;
}

/** Tufts of grass and a few weeds growing out of the ground by a wall. */
function Weeds({ x, y, seed }) {
  const rnd = mulberry(Math.round(seed * 53) + 3);
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const g = iso(x + (rnd() - 0.5) * 0.4, y + (rnd() - 0.5) * 0.3, 0, Z_HEIGHT);
    const h = 3 + rnd() * 5;
    out.push(
      <path
        key={i}
        d={`M${round(g.x)},${round(g.y)} Q${round(g.x - 2)},${round(g.y - h * 0.6)} ${round(g.x - 3.5)},${round(g.y - h)} M${round(g.x)},${round(g.y)} Q${round(g.x + 2)},${round(g.y - h * 0.6)} ${round(g.x + 3)},${round(g.y - h * 0.9)} M${round(g.x)},${round(g.y)} L${round(g.x)},${round(g.y - h)}`}
        stroke={i % 2 ? MAT.turfLight : MAT.turf}
        strokeWidth={1.1}
        fill="none"
      />,
    );
  }
  return <g data-role="weeds">{out}</g>;
}

// ---------------------------------------------------------------------------
// Blacksmith
// ---------------------------------------------------------------------------

/**
 * The forge: a stone-and-timber shop with an open-sided forge bay under a
 * lean-to awning, so the fire is visible. This is the building that most needs
 * to be more than a box, because the open bay gives it depth from every angle.
 */
export function Blacksmith({ x = 0, y = 0, seed = 0, lit = true }) {
  const plaster = shade(MAT.plaster[4], -0.06);
  const stone = MAT.stone;
  const shingle = pick(MAT.shingle, seed);
  const W = 1.3;
  const D = 1.0;
  const H = 0.66;
  const bayW = 0.62;
  const bayD = 0.5;
  const zRoof = H;

  return (
    <g data-role="building" data-id="shop-blacksmith" data-seed={seed}>
      <Ground x={x} y={y} w={W + bayW} d={D + bayD} o={0.13} />

      {/* --- main shop: stone below, timber above ------------------------- */}
      <Wall axis="y" plane={x + W} u0={y} u1={y + D} z0={0} z1={H}
        fill={stone} pattern="stone" seed={seed} />
      <Wall axis="x" plane={y + D} u0={x} u1={x + W} z0={0} z1={H}
        fill={stone} pattern="stone" seed={seed + 1} />
      <Footing axis="x" plane={y + D} u0={x} u1={x + W} z0={0} h={0.1} seed={seed} />
      <Footing axis="y" plane={x + W} u0={y} u1={y + D} z0={0} h={0.1} seed={seed + 1} />
      <Door axis="x" plane={y + D} u={x + W * 0.42} z={0} w={0.26} h={0.4} seed={seed} open={false} />
      <Window axis="x" plane={y + D} u={x + W - 0.26} z={0.32} w={0.18} h={0.2} shutters="none" lit={lit} seed={seed} />
      <Window axis="y" plane={x + W} u={y + 0.34} z={0.34} w={0.18} h={0.2} shutters="none" lit={lit} seed={seed + 1} />
      {/* A second, lower roof over a back extension, so the shop has two roof
          heights and the awning below is not the only step in the outline. */}
      <Roof x={x - 0.34} y={y - 0.02} w={0.4} d={D * 0.62} z={H * 0.8} rise={0.3}
        face={shingle} seed={seed + 4} overhang={0.12} gableFill={plaster} />
      <Roof x={x} y={y} w={W} d={D} z={zRoof} rise={0.5} face={shingle} seed={seed} overhang={0.14} gableFill={plaster} />
      <Dormerish x={x} y={y} w={W} d={D} z={zRoof} rise={0.5} u={x + W * 0.32} seed={seed} face={shingle} />
      {/* A smithy vent: a raised cowl on the ridge, iron rather than brick. */}
      <Cowl x={x + W * 0.26} y={y + D * 0.5} z={zRoof + 0.5} />
      <Chimney x={x + W * 0.66} y={y + D * 0.5 - 0.08} z={H + 0.08} zTop={zRoof + 0.72} w={0.15} d={0.15} seed={seed} />

      {/* --- the open forge bay -------------------------------------------- */}
      {/* A dark interior behind the posts, so the bay reads as a space. */}
      <polygon
        key="baydark"
        points={P3([[x + W, y + D - bayD, 0], [x + W + bayW, y + D - bayD, 0], [x + W + bayW, y + D - bayD, H * 0.86], [x + W, y + D - bayD, H * 0.86]])}
        fill="#33281f"
      />
      {/* Back wall of the bay, in stone. */}
      <Wall axis="x" plane={y + D - bayD} u0={x + W} u1={x + W + bayW} z0={0} z1={H * 0.86}
        fill={shade(stone, -0.1)} pattern="stone" seed={seed + 2} />
      <Wall axis="y" plane={x + W + bayW} u0={y + D - bayD} u1={y + D} z0={0} z1={H * 0.86}
        fill={shade(stone, -0.18)} pattern="stone" seed={seed + 3} />
      {/* Lean-to awning over the bay. */}
      <LeanTo axis="x" plane={y + D} u0={x + W} u1={x + W + bayW}
        zHigh={H * 0.9} zLow={H * 0.5} depth={bayD} face={shingle} seed={seed} detail={0.8} />
      {/* The forge: a stone hearth with fire in it. */}
      <Hearth x={x + W + 0.12} y={y + D - bayD + 0.1} z={0} seed={seed} />
      <Anvil x={x + W + bayW - 0.16} y={y + D - 0.16} z={0} />
      {/* Post holding the awning. */}
      <Post x={x + W + bayW - 0.05} y={y + D - 0.04} z={0} h={H * 0.5} w={0.05} />

      {/* --- dressing ------------------------------------------------------ */}
      <HangingSign x={x + W - 0.05} y={y + D} z={H * 0.72} w={0.3} h={0.2} device="hammer" seed={seed} />
      <Woodpile x={x - 0.02} y={y + D + 0.14} z={0} w={0.46} d={0.13} h={0.16} seed={seed} />
      <Woodpile x={x + 0.1} y={y + D + 0.28} z={0} w={0.36} d={0.12} h={0.12} seed={seed + 1} />
      <Barrel x={x - 0.07} y={y + 0.1} z={0} r={0.07} h={0.16} seed={seed} />
      <Barrel x={x + 0.06} y={y + 0.02} z={0} r={0.06} h={0.14} seed={seed + 1} />
      <Crate x={x + 0.02} y={y + 0.18} z={0} w={0.13} h={0.12} seed={seed} />
      <QuenchTub x={x + W + bayW + 0.05} y={y + D - 0.3} z={0} seed={seed} />
      <Weeds x={x + 0.3} y={y + D + 0.1} seed={seed + 4} />
    </g>
  );
}

/** A smith's chimney cowl: a metal hood, not a brick stack. */
function Cowl({ x, y, z }) {
  const out = [];
  const w = 0.16;
  const out2 = 0.05;
  out.push(
    <polygon key="body" points={P3([[x, y + w, z], [x + w, y + w, z], [x + w, y + w, z + 0.1], [x, y + w, z + 0.1]])} fill={MAT.iron} />,
  );
  out.push(
    <polygon key="side" points={P3([[x + w, y, z], [x + w, y + w, z], [x + w, y + w, z + 0.1], [x + w, y, z + 0.1]])} fill={MAT.ironLight} />,
  );
  out.push(
    <polygon key="cap" points={P3([[x - out2, y - out2, z + 0.1], [x + w + out2, y - out2, z + 0.1], [x + w + out2, y + w + out2, z + 0.1], [x - out2, y + w + out2, z + 0.1]])} fill={shade(MAT.ironLight, 0.1)} />,
  );
  out.push(
    <polygon key="throat" points={P3([[x + 0.03, y + 0.03, z + 0.105], [x + w - 0.03, y + 0.03, z + 0.105], [x + w - 0.03, y + w - 0.03, z + 0.105], [x + 0.03, y + w - 0.03, z + 0.105]])} fill="#1d1a17" />,
  );
  // Smoke, three lazy puffs.
  for (let i = 0; i < 3; i += 1) {
    const g = iso(x + w / 2, y + w / 2, z + 0.12 + i * 0.11, Z_HEIGHT);
    out.push(
      <circle
        key={`s${i}`}
        cx={round(g.x + i * 4 - 4)}
        cy={round(g.y - i * 2)}
        r={round(3 + i * 2.4)}
        fill="#cfc8bd"
        opacity={0.3 - i * 0.07}
      />,
    );
  }
  return <g data-role="cowl">{out}</g>;
}

/** A stone hearth with a fire in it ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the light source of a smithy. */
function Hearth({ x, y, z, seed }) {
  const out = [];
  const w = 0.28;
  const d = 0.24;
  const h = 0.16;
  out.push(
    <polygon key="front" points={P3([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={shade(MAT.stoneDark, -0.06)} />,
  );
  out.push(
    <polygon key="right" points={P3([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={MAT.stoneDark} />,
  );
  out.push(
    <polygon key="top" points={P3([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={MAT.stoneDark} />,
  );
  // The fire bed.
  out.push(
    <polygon key="coals" points={P3([[x + 0.03, y + 0.04, z + h + 0.005], [x + w - 0.03, y + 0.04, z + h + 0.005], [x + w - 0.03, y + d - 0.03, z + h + 0.005], [x + 0.03, y + d - 0.03, z + h + 0.005]])} fill="#4a2a18" />,
  );
  const rnd = mulberry(Math.round(seed * 29) + 13);
  for (let i = 0; i < 7; i += 1) {
    const g = iso(x + 0.04 + rnd() * (w - 0.08), y + 0.05 + rnd() * (d - 0.1), z + h + 0.01, Z_HEIGHT);
    out.push(<circle key={`c${i}`} cx={round(g.x)} cy={round(g.y)} r={round(1.2 + rnd() * 1.6)} fill={rnd() > 0.5 ? "#e8622c" : "#f2a13c"} />);
  }
  // Flame tongues.
  for (let i = 0; i < 4; i += 1) {
    const g = iso(x + 0.05 + (w - 0.1) * (i / 3), y + d * 0.55, z + h, Z_HEIGHT);
    out.push(
      <path
        key={`f${i}`}
        d={`M${round(g.x)},${round(g.y)} Q${round(g.x - 2)},${round(g.y - 6)} ${round(g.x + (i % 2 ? 1 : -1) * 1.5)},${round(g.y - 12 - i)}`}
        stroke={i % 2 ? "#f7c04a" : "#ef7a2a"}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />,
    );
  }
  return <g data-role="hearth">{out}</g>;
}

/** An anvil: base, waist, body and horn. Small, but instantly readable. */
function Anvil({ x, y, z }) {
  const out = [];
  const h = 0.13;
  // Stump.
  out.push(
    <polygon key="stump" points={P3([[x - 0.03, y - 0.02, 0], [x + 0.03, y - 0.02, 0], [x + 0.03, y + 0.03, 0], [x - 0.03, y + 0.03, 0]])} fill="#6b4f34" />,
  );
  const g = iso(x, y, 0, Z_HEIGHT);
  out.push(
    <polygon key="base" points={`${round(g.x - 7)},${round(g.y)} ${round(g.x + 7)},${round(g.y)} ${round(g.x + 7)},${round(g.y - 3)} ${round(g.x - 7)},${round(g.y - 3)}`} fill={MAT.iron} />,
  );
  const t = iso(x, y, h, Z_HEIGHT);
  out.push(
    <polygon key="face" points={`${round(t.x - 9)},${round(t.y)} ${round(t.x + 9)},${round(t.y)} ${round(t.x + 9)},${round(t.y - 3.4)} ${round(t.x - 9)},${round(t.y - 3.4)}`} fill={MAT.ironLight} />,
  );
  out.push(
    <path key="waist" d={`M${round(t.x - 3)},${round(t.y)} L${round(t.x + 3)},${round(t.y)} L${round(g.x + 5)},${round(g.y - 3)} L${round(g.x - 5)},${round(g.y - 3)} Z`} fill={MAT.iron} />,
  );
  // Horn.
  out.push(
    <polygon key="horn" points={`${round(t.x + 8)},${round(t.y - 0.4)} ${round(t.x + 15)},${round(t.y - 1.6)} ${round(t.x + 15)},${round(t.y - 3.2)} ${round(t.x + 8)},${round(t.y - 3.2)}`} fill={MAT.ironLight} />,
  );
  return <g data-role="anvil">{out}</g>;
}

/** A timber post standing on the ground. */
function Post({ x, y, z, h, w = 0.05, tone = null }) {
  const g = iso(x, y, z, Z_HEIGHT);
  const t = iso(x, y, z + h, Z_HEIGHT);
  return (
    <g data-role="post">
      <path d={`M${round(g.x)},${round(g.y)} L${round(t.x)},${round(t.y)}`} stroke={tone || MAT.beam} strokeWidth={round(w * 34)} strokeLinecap="butt" />
      <path d={`M${round(t.x)},${round(t.y)} L${round(t.x)},${round(t.y - w * 34 * 0.4)}`} stroke={MAT.beamLight} strokeWidth={round(w * 20)} />
    </g>
  );
}

/** A quench tub: a barrel of water beside the forge door. */
function QuenchTub({ x, y, z, seed }) {
  return (
    <g data-role="quench">
      <Barrel x={x} y={y} z={z} r={0.08} h={0.14} seed={seed} />
      <ellipse
        cx={round(iso(x, y, 0.14, Z_HEIGHT).x)}
        cy={round(iso(x, y, 0.14, Z_HEIGHT).y)}
        rx={round(0.08 * 30)}
        ry={round(0.08 * 15)}
        fill="#5d7f8c"
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Inn
// ---------------------------------------------------------------------------

/**
 * The inn: the biggest of the five. Two jettied storeys so the upper floor
 * oversails the lower one (with visible beam ends), a balcony, a porch deep
 * enough to stand in, a hanging cup sign, and a cross-gable so the roofline has
 * a step in it rather than one long triangle.
 */
export function Inn({ x = 0, y = 0, seed = 0, lit = true }) {
  const plaster = pick(MAT.plaster, seed + 1);
  const upper = shade(plaster, 0.05);
  const tile = pick(MAT.tile, seed + 5);
  const W = 2.05;
  const D = 1.5;
  const H1 = 0.6;
  const H2 = 0.52;
  const R1 = 0.5;
  const R2 = 0.44;
  const JET = 0.13;        // how far the upper floor oversails

  return (
    <g data-role="building" data-id="shop-inn" data-seed={seed}>
      <Ground x={x} y={y} w={W} d={D + JET} o={0.16} />

      {/* --- ground storey ------------------------------------------------- */}
      <Wall axis="y" plane={x + W} u0={y} u1={y + D} z0={0} z1={H1}
        fill={plaster} pattern="timber" seed={seed} studs={3} />
      <Wall axis="x" plane={y + D} u0={x} u1={x + W} z0={0} z1={H1}
        fill={plaster} pattern="timber" seed={seed + 1} studs={4} />
      <Footing axis="x" plane={y + D} u0={x} u1={x + W} z0={0} h={0.12} seed={seed} />
      <Footing axis="y" plane={x + W} u0={y} u1={y + D} z0={0} h={0.12} seed={seed + 1} />

      {/* Ground floor openings: a big door, two windows, one arrow slit. */}
      <Door axis="x" plane={y + D} u={x + W * 0.34} z={0} w={0.28} h={0.44} seed={seed} />
      <Window axis="x" plane={y + D} u={x + W * 0.68} z={0.22} w={0.24} h={0.26} shutters="open" lit={lit} seed={seed} />
      <Window axis="x" plane={y + D} u={x + W * 0.9} z={0.24} w={0.2} h={0.24} shutters="closed" lit={lit} seed={seed + 1} />
      <Window axis="y" plane={x + W} u={y + 0.5} z={0.24} w={0.22} h={0.24} shutters="open" lit={lit} seed={seed + 2} />
      <Porch x={x + W * 0.34 - 0.34} y={y + D} w={0.68} zTop={0.46} face={tile} seed={seed} depth={0.3} />
      <Steps x={x + W * 0.34 - 0.2} y={y + D + 0.3} w={0.4} n={2} zTop={0} rise={0.035} depth={0.12} />

      {/* Ground roof, mostly hidden by the storey above but its eaves show. */}
      <Roof x={x} y={y} w={W} d={D} z={H1} rise={R1} face={tile} seed={seed} overhang={0.12} gables={false} gableFill={plaster} />

      {/* --- jettied upper storey ------------------------------------------ */}
      <Jetty axis="x" plane={y + D} u0={x} u1={x + W} z={H1} count={7} seed={seed} />
      <Jetty axis="y" plane={x + W} u0={y} u1={y + D} z={H1} count={6} seed={seed + 1} />
      <Wall axis="y" plane={x + W + JET} u0={y - JET} u1={y + D + JET} z0={H1} z1={H1 + H2}
        fill={upper} pattern="upper" seed={seed + 2} studs={3} />
      <Wall axis="x" plane={y + D + JET} u0={x - JET} u1={x + W + JET} z0={H1} z1={H1 + H2}
        fill={upper} pattern="upper" seed={seed + 3} studs={4} />
      {/* Three upper windows; the middle one is a doorway onto the balcony. */}
      <Window axis="x" plane={y + D + JET} u={x + W * 0.2} z={H1 + 0.16} w={0.2} h={0.24} shutters="open" lit={lit} seed={seed} />
      <Door axis="x" plane={y + D + JET} u={x + W * 0.52} z={H1} w={0.2} h={0.34} seed={seed + 1} open />
      <Window axis="x" plane={y + D + JET} u={x + W * 0.82} z={H1 + 0.16} w={0.2} h={0.24} shutters="one" lit={lit} seed={seed + 2} />
      <Window axis="y" plane={x + W + JET} u={y + 0.5} z={H1 + 0.16} w={0.2} h={0.24} shutters="open" lit={lit} seed={seed + 3} />
      <Balcony x={x + W * 0.52 - 0.34} y={y + D + JET} w={0.68} z={H1 - 0.01} depth={0.2} seed={seed} />

      {/* Upper roof, plus a cross-gable so the skyline steps. */}
      <Roof x={x - JET} y={y - JET} w={W + JET * 2} d={D + JET * 2} z={H1 + H2} rise={R2}
        face={tile} seed={seed} overhang={0.14} gableFill={upper} />
      {/* Cross-gable over the door, its own little roof. */}
      <CrossGable x={x + W * 0.52} y={y + D + JET} w={0.66} z={H1 + H2} rise={0.34} face={tile} seed={seed} />
      <Chimney x={x + W * 0.2} y={y + D * 0.45 - 0.09} z={H1 + 0.2} zTop={H1 + H2 + R2 + 0.24}
        w={0.19} d={0.19} seed={seed} />
      <Chimney x={x + W * 0.86} y={y + D * 0.62} z={H1 + 0.2} zTop={H1 + H2 + R2 + 0.1}
        w={0.15} d={0.15} seed={seed + 1} />

      {/* --- dressing ------------------------------------------------------ */}
      <HangingSign x={x + W * 0.34 - 0.06} y={y + D} z={H1 + 0.12} w={0.34} h={0.24} device="cup" seed={seed} />
      <Barrel x={x + 0.04} y={y + D + 0.06} z={0} r={0.07} h={0.17} seed={seed} />
      <Barrel x={x + 0.16} y={y + D + 0.02} z={0} r={0.075} h={0.18} seed={seed + 1} />
      <Crate x={x + 0.03} y={y + 0.16} z={0} w={0.14} h={0.13} seed={seed} />
      <Crate x={x + 0.19} y={y + 0.08} z={0} w={0.12} h={0.11} seed={seed + 1} />
      <Bench x={x + W * 0.72} y={y + D + 0.3} z={0} seed={seed} />
      <FlowerPatch x={x + 0.4} y={y + D + 0.34} seed={seed + 2} r={0.2} />
      <FlowerPatch x={x + W - 0.2} y={y + D + 0.28} seed={seed + 3} r={0.16} />
      <Weeds x={x + W + 0.08} y={y + D * 0.7} seed={seed + 4} />
    </g>
  );
}

/** A small gable facing the viewer, set into a bigger roof. */
function CrossGable({ x, y, w, z, rise, face, seed }) {
  const out = [];
  const d = 0.26;
  const over = 0.06;
  // Front triangle.
  out.push(
    <polygon key="tri" points={P3([[x - w / 2 - over, y, z], [x + w / 2 + over, y, z], [x, y, z + rise]])} fill={MAT.plaster[3]} />,
  );
  // Barge boards along the rake.
  for (const s of [-1, 1]) {
    out.push(
      <path
        key={`bb${s}`}
        d={`M${round(iso(x + s * (w / 2 + over), y, z, Z_HEIGHT).x)},${round(iso(x + s * (w / 2 + over), y, z, Z_HEIGHT).y)} L${round(iso(x, y, z + rise, Z_HEIGHT).x)},${round(iso(x, y, z + rise, Z_HEIGHT).y)}`}
        stroke={MAT.beam}
        strokeWidth={3}
        strokeLinecap="round"
      />,
    );
  }
  // A round attic window in it.
  const c = iso(x, y - 0.01, z + rise * 0.42, Z_HEIGHT);
  out.push(<circle key="aw" cx={round(c.x)} cy={round(c.y)} r={5.4} fill={MAT.beamDark} />);
  out.push(<circle key="awi" cx={round(c.x)} cy={round(c.y)} r={4} fill={MAT.glassLit} />);
  out.push(
    <path key="awx" d={`M${round(c.x - 4)},${round(c.y)} L${round(c.x + 4)},${round(c.y)} M${round(c.x)},${round(c.y - 4)} L${round(c.x)},${round(c.y + 4)}`} stroke={MAT.beamDark} strokeWidth={1.2} />,
  );
  // The little roof over it, sloping away from the viewer.
  out.push(
    <polygon key="sl" points={P3([[x - w / 2 - over, y, z], [x, y, z + rise], [x, y + d, z + rise - 0.06], [x - w / 2 - over, y + d, z - 0.06]])} fill={shade(face, -0.04)} />,
  );
  out.push(
    <polygon key="sr" points={P3([[x + w / 2 + over, y, z], [x, y, z + rise], [x, y + d, z + rise - 0.06], [x + w / 2 + over, y + d, z - 0.06]])} fill={shade(face, -0.2)} />,
  );
  return <g data-role="cross-gable" data-seed={seed}>{out}</g>;
}

/** A bench outside the inn door. */
function Bench({ x, y, z, seed }) {
  const out = [];
  const w = 0.3;
  const zt = 0.09;
  out.push(
    <polygon key="top" points={P3([[x, y, zt], [x + w, y, zt], [x + w, y + 0.07, zt], [x, y + 0.07, zt]])} fill={MAT.beamLight} />,
  );
  out.push(
    <polygon key="front" points={P3([[x, y + 0.07, zt], [x + w, y + 0.07, zt], [x + w, y + 0.07, zt - 0.02], [x, y + 0.07, zt - 0.02]])} fill={MAT.beamDark} />,
  );
  for (const u of [x + 0.03, x + w - 0.05]) {
    out.push(<path key={`l${round(u)}`} d={`M${round(iso(u, y + 0.03, 0, Z_HEIGHT).x)},${round(iso(u, y + 0.03, 0, Z_HEIGHT).y)} L${round(iso(u, y + 0.03, zt, Z_HEIGHT).x)},${round(iso(u, y + 0.03, zt, Z_HEIGHT).y)}`} stroke={MAT.beam} strokeWidth={3} />);
  }
  return <g data-role="bench" data-seed={seed}>{out}</g>;
}

// ---------------------------------------------------------------------------
// Manor
// ---------------------------------------------------------------------------

/**
 * The manor: the landmark. A stone ground floor, a jettied timber first floor,
 * a corner tower with a conical roof, two roof heights, a banner, a walled
 * courtyard with a gate, and steps up to the entrance.
 */
export function Manor({ x = 0, y = 0, seed = 0, lit = true }) {
  const stone = MAT.stone;
  const timber = MAT.plaster[2];
  const upper = MAT.plaster[5];
  const slate = MAT.slate[1];
  const W = 2.1;
  const D = 1.6;
  const H1 = 0.72;
  const H2 = 0.58;
  const R = 0.62;
  const JET = 0.15;
  const tw = 0.42;         // tower footprint
  const towerH = 1.85;

  return (
    <g data-role="building" data-id="shop-manor" data-seed={seed}>
      <Ground x={x} y={y} w={W + 0.7} d={D + 0.6} o={0.2} />

      {/* --- ground floor: stone ------------------------------------------- */}
      <Wall axis="y" plane={x + W} u0={y} u1={y + D} z0={0} z1={H1}
        fill={stone} pattern="stone" seed={seed} />
      <Wall axis="x" plane={y + D} u0={x} u1={x + W} z0={0} z1={H1}
        fill={stone} pattern="stone" seed={seed + 1} />
      <Footing axis="x" plane={y + D} u0={x} u1={x + W} z0={0} h={0.14} seed={seed} />
      <Footing axis="y" plane={x + W} u0={y} u1={y + D} z0={0} h={0.14} seed={seed + 1} />
      {/* Narrow stone-mullioned windows, taller than they are wide. */}
      <NarrowWindow x={x + 0.34} y={y + D} z={0.24} w={0.11} h={0.3} lit={lit} />
      <NarrowWindow x={x + W - 0.34} y={y + D} z={0.24} w={0.11} h={0.3} lit={lit} />
      <NarrowWindow x={x + W} y={y + D * 0.55} z={0.24} w={0.11} h={0.3} lit={lit} side />
      {/* Entrance with steps. */}
      <Door axis="x" plane={y + D} u={x + W * 0.5} z={0} w={0.3} h={0.48} seed={seed} arched />
      <Steps x={x + W * 0.5 - 0.24} y={y + D + 0.06} w={0.48} n={4} zTop={0} rise={0.05} depth={0.14} />
      <Portcullis x={x + W * 0.5} y={y + D} z={0.48} />

      {/* --- first floor: jettied timber ---------------------------------- */}
      <Jetty axis="x" plane={y + D} u0={x} u1={x + W} z={H1} count={8} seed={seed} />
      <Jetty axis="y" plane={x + W} u0={y} u1={y + D} z={H1} count={7} seed={seed + 1} />
      <Wall axis="y" plane={x + W + JET} u0={y - JET} u1={y + D + JET} z0={H1} z1={H1 + H2}
        fill={timber} pattern="upper" seed={seed + 2} studs={3} />
      <Wall axis="x" plane={y + D + JET} u0={x - JET} u1={x + W + JET} z0={H1} z1={H1 + H2}
        fill={upper} pattern="upper" seed={seed + 3} studs={4} />
      <Window axis="x" plane={y + D + JET} u={x + W * 0.22} z={H1 + 0.16} w={0.22} h={0.28} shutters="open" lit={lit} seed={seed} />
      <Window axis="x" plane={y + D + JET} u={x + W * 0.74} z={H1 + 0.16} w={0.22} h={0.28} shutters="open" lit={lit} seed={seed + 1} />
      <Window axis="y" plane={x + W + JET} u={y + 0.46} z={H1 + 0.16} w={0.22} h={0.28} shutters="one" lit={lit} seed={seed + 2} />
      <Balcony x={x + W * 0.22 - 0.26} y={y + D + JET} w={0.52} z={H1 - 0.01} depth={0.18} seed={seed} />

      {/* --- roofs ---------------------------------------------------------- */}
      <Roof x={x - JET} y={y - JET} w={W + JET * 2} d={D + JET * 2} z={H1 + H2} rise={R}
        face={slate} seed={seed} overhang={0.16} gableFill={upper} />
      {/* A lower cross-wing roof, so there are two roof heights. */}
      <CrossGable x={x + W * 0.5} y={y + D + JET} w={0.8} z={H1 + H2} rise={0.42} face={slate} seed={seed} />
      <Chimney x={x + W * 0.62} y={y + D * 0.4 - 0.1} z={H1 + H2} zTop={H1 + H2 + R + 0.3}
        w={0.22} d={0.22} seed={seed} />
      <Chimney x={x + W * 0.12} y={y + D * 0.7} z={H1 + H2} zTop={H1 + H2 + R + 0.12}
        w={0.17} d={0.17} seed={seed + 1} />

      {/* --- the tower ------------------------------------------------------ */}
      <Tower x={x + W + JET - 0.02} y={y - 0.06} z={0} h={towerH} r={tw * 0.52} cap={0.5}
        face={slate} windows={3} seed={seed} />
      <Banner x={x + W + JET + tw * 0.3} y={y - 0.06} z={towerH - 0.42} seed={seed} />

      {/* --- courtyard ------------------------------------------------------ */}
      <Courtyard x={x + 0.1} y={y + D + 0.34} w={W - 0.2} seed={seed} />
      <FlowerPatch x={x + 0.2} y={y + D + 0.28} seed={seed + 2} r={0.18} />
      <FlowerPatch x={x + W - 0.24} y={y + D + 0.28} seed={seed + 3} r={0.16} />
      <Weeds x={x + W + JET + 0.16} y={y + D * 0.4} seed={seed + 5} />
    </g>
  );
}

/** A tall narrow window with a stone mullion ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a manor detail, not a cottage one. */
function NarrowWindow({ x, y, z, w, h, lit, side = false }) {
  const out = [];
  const gl = lit ? MAT.glassLit : MAT.glass;
  if (side) {
    out.push(<polygon key="g" points={wallRect("y", x, y, y + w, z, z + h, -0.02)} fill={gl} />);
    out.push(<polygon key="m" points={wallRect("y", x, y + w / 2 - 0.008, y + w / 2 + 0.008, z, z + h, -0.014)} fill={MAT.beamDark} />);
    out.push(<polygon key="s" points={wallRect("y", x, y - 0.03, y + w + 0.03, z - 0.03, z, 0.03)} fill={MAT.stoneLight} />);
  } else {
    out.push(<polygon key="g" points={wallRect("x", y, x - w / 2, x + w / 2, z, z + h, -0.02)} fill={gl} />);
    out.push(<polygon key="m" points={wallRect("x", y, x - 0.008, x + 0.008, z, z + h, -0.014)} fill={MAT.beamDark} />);
    out.push(<polygon key="l" points={wallRect("x", y, x - w / 2 - 0.026, x + w / 2 + 0.026, z + h, z + h + 0.03, 0.024)} fill={MAT.stoneLight} />);
    out.push(<polygon key="s" points={wallRect("x", y, x - w / 2 - 0.04, x + w / 2 + 0.04, z - 0.03, z, 0.034)} fill={MAT.stoneLight} />);
  }
  return <g data-role="narrow-window">{out}</g>;
}

/** A portcullis half-lowered in the manor's doorway. */
function Portcullis({ x, y, z }) {
  const out = [];
  const w = 0.3;
  const h = 0.16;
  const bars = 5;
  for (let i = 0; i < bars; i += 1) {
    const u = x - w / 2 + (w * (i + 0.5)) / bars;
    out.push(
      <polygon key={i} points={wallRect("x", y, u - 0.008, u + 0.008, z - h, z, 0.02)} fill={MAT.iron} />,
    );
  }
  for (const zz of [z - h, z - h * 0.5]) {
    out.push(
      <polygon key={`c${round(zz)}`} points={wallRect("x", y, x - w / 2, x + w / 2, zz, zz + 0.012, 0.026)} fill={MAT.iron} />,
    );
  }
  // Spikes at the bottom rail.
  for (let i = 0; i < bars; i += 1) {
    const u = x - w / 2 + (w * (i + 0.5)) / bars;
    const a = iso(u, y, z - h, Z_HEIGHT);
    out.push(<circle key={`sp${i}`} cx={round(a.x)} cy={round(a.y)} r={1.3} fill={MAT.ironLight} />);
  }
  return <g data-role="portcullis">{out}</g>;
}

/** A heraldic banner hanging from a pole. */
function Banner({ x, y, z, seed }) {
  const out = [];
  const w = 0.2;
  const h = 0.42;
  // Pole out from the tower.
  const a = iso(x, y, z + 0.08, Z_HEIGHT);
  const b = iso(x + 0.16, y, z + 0.08, Z_HEIGHT);
  out.push(<path key="pole" d={`M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)}`} stroke={MAT.beam} strokeWidth={2.2} strokeLinecap="round" />);
  // Cloth, hanging with a slight wave.
  const cols = 5;
  for (let i = 0; i < cols; i += 1) {
    const u0 = x + 0.06 + (w * i) / cols;
    const u1 = x + 0.06 + (w * (i + 1)) / cols;
    const dip = Math.sin((Math.PI * (i + 0.5)) / cols) * 0.02;
    out.push(
      <polygon
        key={i}
        points={P3([
          [u0, y, z + 0.06], [u1, y, z + 0.06],
          [u1, y + 0.02, z - h - dip], [u0, y + 0.02, z - h - dip],
        ])}
        fill={i % 2 ? MAT.cloth : shade(MAT.cloth, -0.14)}
      />,
    );
  }
  // A pale device on the cloth.
  const c = iso(x + 0.06 + w / 2, y + 0.005, z - h * 0.45, Z_HEIGHT);
  out.push(<path key="dev" d={`M${round(c.x)},${round(c.y - 8)} L${round(c.x + 6)},${round(c.y)} L${round(c.x)},${round(c.y + 8)} L${round(c.x - 6)},${round(c.y)} Z`} fill="#f0e0bc" />);
  return <g data-role="banner" data-seed={seed}>{out}</g>;
}

/** A low courtyard wall with a gate, so the manor has an enclosure. */
function Courtyard({ x, y, w, seed }) {
  const out = [];
  const h = 0.14;
  const gateW = 0.42;
  const runs = [
    [x, x + (w - gateW) / 2],
    [x + (w + gateW) / 2, x + w],
  ];
  for (let i = 0; i < runs.length; i += 1) {
    const [a, b] = runs[i];
    out.push(
      <polygon key={`cf${i}`} points={P3([[a, y, 0], [b, y, 0], [b, y, h], [a, y, h]])} fill={MAT.stone} />,
    );
    out.push(
      <polygon key={`ct${i}`} points={P3([[a - 0.014, y - 0.014, h], [b + 0.014, y - 0.014, h], [b + 0.014, y + 0.014, h], [a - 0.014, y + 0.014, h]])} fill={MAT.stoneLight} />,
    );
    // Coping blocks along the top.
    const n = Math.max(2, Math.round((b - a) / 0.16));
    for (let k = 0; k < n; k += 1) {
      const u = a + ((b - a) * k) / n;
      out.push(
        <polygon
          key={`cb${i}-${k}`}
          points={P3([[u, y - 0.014, h], [u + (b - a) / n, y - 0.014, h], [u + (b - a) / n, y - 0.014, h + 0.024], [u, y - 0.014, h + 0.024]])}
          fill={k % 2 ? MAT.stoneLight : MAT.stone}
        />,
      );
    }
  }
  // Gate piers and an open gate leaf.
  for (const u of [x + (w - gateW) / 2, x + (w + gateW) / 2]) {
    out.push(
      <polygon key={`p${round(u)}`} points={P3([[u - 0.05, y - 0.05, 0], [u + 0.05, y - 0.05, 0], [u + 0.05, y + 0.05, h + 0.16], [u - 0.05, y + 0.05, h + 0.16]])} fill={MAT.stone} />,
    );
    out.push(
      <polygon key={`pt${round(u)}`} points={P3([[u - 0.065, y - 0.065, h + 0.16], [u + 0.065, y - 0.065, h + 0.16], [u + 0.065, y + 0.065, h + 0.16], [u - 0.065, y + 0.065, h + 0.16]])} fill={MAT.stoneLight} />,
    );
  }
  return <g data-role="courtyard" data-seed={seed}>{out}</g>;
}

// ---------------------------------------------------------------------------
// Farm building
// ---------------------------------------------------------------------------

/**
 * The farm: a long barn with a big cart door, a lower lean-to on one side and a
 * higher cross-gable on the other, so the roofline steps twice. Thatch rather
 * than tile, because that is what a working barn is thatched with.
 */
export function FarmBuilding({ x = 0, y = 0, seed = 0, lit = true }) {
  const timber = MAT.plaster[3];
  const thatch = MAT.thatch;
  const W = 2.2;
  const D = 1.35;
  const H = 0.74;
  const R = 0.72;
  const leanW = 0.62;

  return (
    <g data-role="building" data-id="shop-farm" data-seed={seed}>
      <Ground x={x} y={y} w={W + leanW} d={D} o={0.15} />

      {/* --- the barn ------------------------------------------------------- */}
      <Wall axis="y" plane={x + W} u0={y} u1={y + D} z0={0} z1={H}
        fill={timber} pattern="timber" seed={seed} studs={3} />
      <Wall axis="x" plane={y + D} u0={x} u1={x + W} z0={0} z1={H}
        fill={timber} pattern="timber" seed={seed + 1} studs={4} />
      <Footing axis="x" plane={y + D} u0={x} u1={x + W} z0={0} h={0.1} seed={seed} />
      <Footing axis="y" plane={x + W} u0={y} u1={y + D} z0={0} h={0.1} seed={seed + 1} />
      {/* A big cart door with the leaf swung, and a smaller one beside it. */}
      <Door axis="x" plane={y + D} u={x + W * 0.66} z={0} w={0.42} h={0.5} seed={seed} open />
      <Door axis="x" plane={y + D} u={x + W * 0.28} z={0} w={0.24} h={0.36} seed={seed + 1} />
      <Window axis="y" plane={x + W} u={y + 0.42} z={0.34} w={0.18} h={0.2} shutters="open" lit={lit} seed={seed} />
      {/* Louvred vent high in the gable. */}
      <Vent x={x + W * 0.66} y={y + D} z={H + R * 0.42} seed={seed} />

      {/* Big thatched roof. */}
      <ThatchRoof x={x} y={y} w={W} d={D} z={H} rise={R} seed={seed} />
      <ThatchRidge x={x - 0.16} y={y + D / 2} w={W + 0.32} z={H + R} />

      {/* A higher cross-gable over the cart door, stepped up from the main roof. */}
      <CrossGable x={x + W * 0.66} y={y + D} w={0.72} z={H + R * 0.42} rise={0.44} face={thatch} seed={seed} barn />

      {/* --- attached lean-to ----------------------------------------------- */}
      <Wall axis="y" plane={x + W + leanW} u0={y + D * 0.2} u1={y + D} z0={0} z1={H * 0.62}
        fill={shade(timber, -0.08)} pattern="timber" seed={seed + 2} studs={1} />
      <Wall axis="x" plane={y + D} u0={x + W} u1={x + W + leanW} z0={0} z1={H * 0.62}
        fill={shade(timber, -0.08)} pattern="timber" seed={seed + 3} studs={1} />
      <LeanTo axis="x" plane={y + D} u0={x + W} u1={x + W + leanW}
        zHigh={H * 0.66} zLow={H * 0.3} depth={D * 0.8} face={thatch} seed={seed} detail={0.8} />

      {/* --- dressing: hay, cart, fence -------------------------------------- */}
      <Haystack x={x - 0.28} y={y + D - 0.3} z={0} r={0.16} h={0.22} seed={seed} />
      <Haystack x={x - 0.16} y={y + D - 0.5} z={0} r={0.13} h={0.18} seed={seed + 1} />
      <Cart x={x + 0.16} y={y + D + 0.26} z={0} seed={seed} />
      <FenceRun x={x - 0.34} y={y + D + 0.2} w={0.9} z={0} seed={seed} />
      <Barrel x={x + W + leanW - 0.12} y={y + 0.06} z={0} r={0.07} h={0.16} seed={seed} />
      <Crate x={x + 0.06} y={y + 0.1} z={0} w={0.14} h={0.12} seed={seed} />
      <SignBoard x={x + W * 0.28} y={y + D + 0.1} z={0} w={0.26} h={0.24} device="arrow" seed={seed} />
      <Scarecrow x={x + W + leanW + 0.2} y={y + D * 0.4} z={0} seed={seed} />
      <Weeds x={x + 0.4} y={y + 0.02} seed={seed + 3} />
    </g>
  );
}

/** A thatched roof: courses of straw bundles rather than tiles. */
function ThatchRoof({ x, y, w, d, z, rise, seed }) {
  const out = [];
  const overhang = 0.17;
  const rx0 = x - overhang;
  const rx1 = x + w + overhang;
  const ry0 = y - overhang;
  const ry1 = y + d + overhang;
  const ym = y + d / 2;
  const zr = z + rise;
  const rows = Math.max(4, Math.round(rise * 16));
  const cols = Math.max(6, Math.round(w * 7));

  for (let r = 0; r < rows; r += 1) {
    const t0 = r / rows;
    const t1 = (r + 1) / rows;
    const yy0 = ry1 + (ym - ry1) * t0;
    const yy1 = ry1 + (ym - ry1) * t1;
    const zz0 = z + rise * t0;
    const zz1 = z + rise * t1;
    for (let c = 0; c < cols; c += 1) {
      const stag = r % 2 === 0 ? 0 : 0.5;
      const u0 = rx0 + ((rx1 - rx0) * (c - stag)) / cols;
      const u1 = rx0 + ((rx1 - rx0) * (c + 1 - stag)) / cols;
      const a = Math.max(rx0, u0);
      const b = Math.min(rx1, u1);
      if (b - a < 0.02) continue;
      const k = Math.abs(((r * 23 + c * 31 + Math.round(seed * 7)) % 6) - 3) * 0.035;
      out.push(
        <polygon key={`${r}-${c}`} points={P3([[a, yy0, zz0], [b, yy0, zz0], [b, yy1, zz1], [a, yy1, zz1]])} fill={shade(MAT.thatch, k - 0.06)} />,
      );
      // The lip of each course of straw overhangs the one below.
      out.push(
        <polygon key={`l${r}-${c}`} points={P3([[a, yy0, zz0], [b, yy0, zz0], [b, yy0 - 0.02, zz0 - 0.012], [a, yy0 - 0.02, zz0 - 0.012]])} fill={MAT.thatchDark} />,
      );
    }
  }
  // Barge boards along both rakes.
  for (const [u, dir] of [[rx0, 1], [rx1, -1]]) {
    const a = iso(u, ry1, z - 0.02, Z_HEIGHT);
    const b = iso(u, ym, zr, Z_HEIGHT);
    out.push(<path key={`bb${u}`} d={`M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)}`} stroke={MAT.beam} strokeWidth={2.6} strokeLinecap="round" />);
  }
  // Gable ends.
  out.push(
    <polygon key="gf" points={P3([[rx0, ry0, z], [rx0, ry1, z], [rx0, ym, zr]])} fill={shade(MAT.plaster[3], -0.2)} />,
  );
  out.push(
    <polygon key="gn" points={P3([[rx1, ry0, z], [rx1, ry1, z], [rx1, ym, zr]])} fill={MAT.plaster[3]} />,
  );
  return <g data-role="thatch-roof">{out}</g>;
}


/** A louvred vent in a barn gable ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ventilation, and a good silhouette break. */
function Vent({ x, y, z, seed }) {
  const out = [];
  const w = 0.2;
  const h = 0.14;
  out.push(
    <polygon key="fr" points={wallRect("x", y, x - w / 2 - 0.02, x + w / 2 + 0.02, z - 0.02, z + h + 0.02, 0.02)} fill={MAT.beamDark} />,
  );
  const slats = 4;
  for (let i = 0; i < slats; i += 1) {
    const zz = z + (h * i) / slats;
    out.push(
      <polygon key={`s${i}`} points={wallRect("x", y, x - w / 2, x + w / 2, zz, zz + 0.018, 0.03)} fill={i % 2 ? MAT.beam : MAT.beamLight} />,
    );
  }
  return <g data-role="vent" data-seed={seed}>{out}</g>;
}

/** A conical haystack with a cap and a pole. */
function Haystack({ x, y, z, r, h, seed }) {
  const out = [];
  const steps = 12;
  for (let i = 0; i < steps; i += 1) {
    const a0 = (Math.PI * 2 * i) / steps;
    const a1 = (Math.PI * 2 * (i + 1)) / steps;
    const mid = (a0 + a1) / 2;
    const k = Math.cos(mid - Math.PI * 1.15) * 0.28;
    const p0 = iso(x + Math.cos(a0) * r, y + Math.sin(a0) * r, z, Z_HEIGHT);
    const p1 = iso(x + Math.cos(a1) * r, y + Math.sin(a1) * r, z, Z_HEIGHT);
    const p2 = iso(x + Math.cos(a1) * r * 0.86, y + Math.sin(a1) * r * 0.86, z + h * 0.45, Z_HEIGHT);
    const p3 = iso(x + Math.cos(a0) * r * 0.86, y + Math.sin(a0) * r * 0.86, z + h * 0.45, Z_HEIGHT);
    out.push(<polygon key={`b${i}`} points={`${fmt(p0)} ${fmt(p1)} ${fmt(p2)} ${fmt(p3)}`} fill={shade(MAT.hay, k - 0.04)} />);
    const q0 = iso(x + Math.cos(a0) * r * 0.42, y + Math.sin(a0) * r * 0.42, z + h * 0.82, Z_HEIGHT);
    const q1 = iso(x + Math.cos(a1) * r * 0.42, y + Math.sin(a1) * r * 0.42, z + h * 0.82, Z_HEIGHT);
    out.push(<polygon key={`t${i}`} points={`${fmt(p3)} ${fmt(p2)} ${fmt(q1)} ${fmt(q0)}`} fill={shade(MAT.hay, k + 0.08)} />);
    // Straw texture: a few strands on the lit side.
    if (i % 3 === 0) {
      out.push(
        <path key={`s${i}`} d={`M${round(p0.x)},${round(p0.y)} L${round(p3.x)},${round(p3.y)}`} stroke={MAT.hayDark} strokeWidth={0.6} opacity={0.5} />,
      );
    }
  }
  // Cap and pole.
  const tip = iso(x, y, z + h, Z_HEIGHT);
  out.push(<ellipse key="cap" cx={round(tip.x)} cy={round(tip.y)} rx={round(r * 0.2)} ry={round(r * 0.1)} fill={MAT.hayDark} />);
  out.push(<path key="pole" d={`M${round(tip.x)},${round(tip.y)} L${round(tip.x)},${round(tip.y - 9)}`} stroke={MAT.beam} strokeWidth={1.8} />);
  return <g data-role="haystack" data-seed={seed}>{out}</g>;
}


/** A hay cart: two spoked wheels, shafts, sides and a load of straw. */
function Cart({ x, y, z, seed }) {
  const out = [];
  const w = 0.34;
  const d = 0.2;
  const hz = 0.1;
  const wr = 0.075;
  // Bed.
  out.push(
    <polygon key="bed" points={P3([[x, y, hz], [x + w, y, hz], [x + w, y + d, hz], [x, y + d, hz]])} fill={MAT.beamLight} />,
  );
  // Sides.
  out.push(
    <polygon key="s1" points={P3([[x, y + d, hz], [x + w, y + d, hz], [x + w, y + d, hz + 0.09], [x, y + d, hz + 0.09]])} fill={MAT.beam} />,
  );
  out.push(
    <polygon key="s2" points={P3([[x, y, hz], [x, y + d, hz], [x, y + d, hz + 0.09], [x, y, hz + 0.09]])} fill={MAT.beamDark} />,
  );
  // Load of straw.
  out.push(
    <polygon key="load" points={P3([[x + 0.03, y + 0.03, hz + 0.05], [x + w - 0.03, y + 0.03, hz + 0.05], [x + w - 0.03, y + d - 0.03, hz + 0.05], [x + 0.03, y + d - 0.03, hz + 0.05]])} fill={MAT.hay} />,
  );
  out.push(
    <polygon key="loadt" points={P3([[x + 0.05, y + 0.05, hz + 0.09], [x + w - 0.05, y + 0.05, hz + 0.09], [x + w - 0.05, y + d - 0.05, hz + 0.09], [x + 0.05, y + d - 0.05, hz + 0.09]])} fill={MAT.hayDark} />,
  );
  // Wheels, as spoked discs.
  for (const u of [x + 0.06, x + w - 0.06]) {
    const c = iso(u, y + d + 0.02, wr * 0.55, Z_HEIGHT);
    out.push(<ellipse key={`w${round(u)}`} cx={round(c.x)} cy={round(c.y)} rx={round(wr * 30 * 0.5)} ry={round(wr * 30 * 0.5)} fill="none" stroke={MAT.beamDark} strokeWidth={2.6} />);
    out.push(<ellipse key={`wi${round(u)}`} cx={round(c.x)} cy={round(c.y)} rx={round(wr * 30 * 0.22)} ry={round(wr * 30 * 0.22)} fill={MAT.beamDark} />);
    for (let k = 0; k < 4; k += 1) {
      const a = (Math.PI * k) / 4;
      out.push(
        <path key={`s${round(u)}-${k}`} d={`M${round(c.x)},${round(c.y)} L${round(c.x + Math.cos(a) * wr * 30 * 0.5)},${round(c.y + Math.sin(a) * wr * 30 * 0.5)}`} stroke={MAT.beamDark} strokeWidth={1.2} />,
      );
    }
  }
  // Shafts out the front.
  for (const s of [-1, 1]) {
    const a = iso(x + w + 0.22, y + d * 0.5 + s * 0.035, hz - 0.02, Z_HEIGHT);
    const b = iso(x + w, y + d * 0.5 + s * 0.035, hz - 0.02, Z_HEIGHT);
    out.push(<path key={`sh${s}`} d={`M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)}`} stroke={MAT.beam} strokeWidth={2.2} strokeLinecap="round" />);
  }
  return <g data-role="cart" data-seed={seed}>{out}</g>;
}

/** A post-and-rail fence run in front of a building. */
function FenceRun({ x, y, w, z, seed }) {
  const out = [];
  const posts = Math.max(3, Math.round(w / 0.2));
  for (let i = 0; i <= posts; i += 1) {
    const u = x + (w * i) / posts;
    out.push(<path key={`p${i}`} d={`M${round(iso(u, y, z, Z_HEIGHT).x)},${round(iso(u, y, z, Z_HEIGHT).y)} L${round(iso(u, y, z + 0.14, Z_HEIGHT).x)},${round(iso(u, y, z + 0.14, Z_HEIGHT).y)}`} stroke={MAT.beam} strokeWidth={2.6} strokeLinecap="round" />);
  }
  for (const zz of [0.05, 0.115]) {
    out.push(
      <path key={`r${zz}`} d={`M${round(iso(x, y, z + zz, Z_HEIGHT).x)},${round(iso(x, y, z + zz, Z_HEIGHT).y)} L${round(iso(x + w, y, z + zz, Z_HEIGHT).x)},${round(iso(x + w, y, z + zz, Z_HEIGHT).y)}`} stroke={MAT.beamWarm} strokeWidth={2} />,
    );
  }
  return <g data-role="fence" data-seed={seed}>{out}</g>;
}

/** A scarecrow in the field beyond the barn. */
function Scarecrow({ x, y, z, seed }) {
  const out = [];
  const postH = 0.34;
  out.push(<path key="post" d={`M${round(iso(x, y, 0, Z_HEIGHT).x)},${round(iso(x, y, 0, Z_HEIGHT).y)} L${round(iso(x, y, postH, Z_HEIGHT).x)},${round(iso(x, y, postH, Z_HEIGHT).y)}`} stroke={MAT.beam} strokeWidth={2.6} strokeLinecap="round" />);
  // Cross arm.
  const a = iso(x - 0.11, y, postH * 0.78, Z_HEIGHT);
  const b = iso(x + 0.11, y, postH * 0.78, Z_HEIGHT);
  out.push(<path key="arm" d={`M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)}`} stroke={MAT.beam} strokeWidth={2.2} strokeLinecap="round" />);
  // Shirt and head.
  const t = iso(x, y, postH, Z_HEIGHT);
  out.push(<path key="shirt" d={`M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)} L${round(t.x + 4)},${round(t.y + 2)} L${round(t.x - 4)},${round(t.y + 2)} Z`} fill="#8a6a4a" />);
  out.push(<circle key="head" cx={round(t.x)} cy={round(t.y - 4)} r={4} fill="#d8bd8a" />);
  out.push(<path key="hat" d={`M${round(t.x - 6)},${round(t.y - 7)} L${round(t.x + 6)},${round(t.y - 7)} L${round(t.x + 3)},${round(t.y - 12)} L${round(t.x - 3)},${round(t.y - 12)} Z`} fill={MAT.thatch} />);
  // Straw hands.
  out.push(<circle key="hl" cx={round(a.x)} cy={round(a.y + 2)} r={2.6} fill={MAT.hay} />);
  out.push(<circle key="hr" cx={round(b.x)} cy={round(b.y + 2)} r={2.6} fill={MAT.hay} />);
  return <g data-role="scarecrow" data-seed={seed}>{out}</g>;
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
