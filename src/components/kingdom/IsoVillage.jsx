// Isometric village — the kingdom as a dense, living settlement.
//
// The composition follows a classic illustrated medieval village rather than a
// row of separate objects:
//
//   * the land is an ISLAND plateau with visible rock/soil sides, so the village
//     reads as a place with an edge rather than ground fading to infinity
//   * buildings are packed close together, the way a real village grows
//   * a multi-tower castle complex anchors the back
//   * a wide river runs through with several bridges
//   * filler cottages, sheds, stalls, fences, haystacks and carts fill the gaps
//     between the gameplay plots — these carry no game state and exist purely so
//     the settlement looks lived-in
//   * trees and hedgerows are dense
//
// Everything is drawn on one diamond grid and painted back-to-front by sorting
// on (gx + gy), which is what sells the depth.

import { useMemo } from "react";
import { path, pts, boxFaces, boxTones, shade, HALF_W, HALF_H, TILE_W, TILE_H } from "./iso";
import { IsoBuildingShapes } from "./IsoBuilding";
import PetArt from "./petArt";
import { KINGDOMS, PLOT, plotState } from "../../game/kingdom";

// The playable grid. Deliberately small so the buildings sit close together.
const N = 9;
const WIDTH = N * TILE_W;
const HEIGHT = N * TILE_H;

// How thick the island's crust is, in screen pixels.
const CRUST = 46;

const GROUND = {
  forest: { a: "#7cc07f", b: "#5da565", edge: "#4a8551", soil: "#8a6a4a", rock: "#9c8f7a", tree: "#3f7a4a", treeAlt: "#599b58" },
  river: { a: "#8fc98f", b: "#6fae72", edge: "#579055", soil: "#8a6a4a", rock: "#9c8f7a", tree: "#4a8f57", treeAlt: "#68a85f" },
  highland: { a: "#94b06a", b: "#7b9757", edge: "#63794a", soil: "#7d6a52", rock: "#9a9384", tree: "#41613f", treeAlt: "#597a4a" },
  cavern: { a: "#9b8fd0", b: "#8174bb", edge: "#6a5e9c", soil: "#6f6486", rock: "#8a80a8", tree: "#5b5299", treeAlt: "#6f65ad" },
  peak: { a: "#c98f6e", b: "#a87356", edge: "#8a5c44", soil: "#7a4a3a", rock: "#8f7365", tree: "#7a4a3a", treeAlt: "#96604a" },
};

const WATER = { a: "#86c6ea", b: "#4f9ccc" };

// ---------------------------------------------------------------------------
// Island
// ---------------------------------------------------------------------------

/**
 * The land as a raised block. The sides are drawn as real faces so the village
 * sits on something, with grass over soil over rock.
 */
function Island({ t }) {
  const z = CRUST;
  const top = [[0, 0, 0], [N, 0, 0], [N, N, 0], [0, N, 0]];
  return (
    <g>
      {/* the two visible sides */}
      <polygon points={pts([[0, N, 0], [N, N, 0], [N, N, -z * 0.45], [0, N, -z * 0.45]])} fill={t.soil} />
      <polygon points={pts([[N, 0, 0], [N, N, 0], [N, N, -z * 0.45], [N, 0, -z * 0.45]])} fill={shade(t.soil, -0.22)} />
      {/* rock below the soil */}
      <polygon points={pts([[0, N, -z * 0.45], [N, N, -z * 0.45], [N, N, -z], [0, N, -z]])} fill={t.rock} />
      <polygon points={pts([[N, 0, -z * 0.45], [N, N, -z * 0.45], [N, N, -z], [N, 0, -z]])} fill={shade(t.rock, -0.2)} />
      {/* grass top */}
      <polygon points={pts(top)} fill={t.a} />
      {/* mown bands, which read as fields rather than a flat green plane */}
      {Array.from({ length: 6 }, (_, i) => (
        <polygon
          key={i}
          points={pts([[0.5, 0.9 + i * 1.4, 0], [N - 0.5, 0.9 + i * 1.4, 0], [N - 0.5, 1.5 + i * 1.4, 0], [0.5, 1.5 + i * 1.4, 0]])}
          fill={t.b}
          opacity={0.2}
        />
      ))}
    </g>
  );
}

/** The river, wide enough to need bridges. */
function River() {
  const centre = (x) => 5.6 + Math.sin(x / 2.2) * 1.15;
  const top = [];
  const bottom = [];
  for (let x = -0.6; x <= N + 0.6; x += 0.4) {
    top.push([x, centre(x) - 0.95, -0.5]);
    bottom.push([x, centre(x) + 0.95, -0.5]);
  }
  return (
    <g>
      <polygon points={pts([...top, ...bottom.slice().reverse()])} fill={WATER.a} />
      <polygon
        points={pts(top.map((p) => [p[0], p[1] + 0.5, -0.45]).concat(bottom.map((p) => [p[0], p[1] - 0.1, -0.45]).reverse()))}
        fill={WATER.b}
        opacity={0.5}
      />
      {/* glints */}
      {Array.from({ length: 7 }, (_, i) => {
        const x = 0.9 + i * 1.25;
        return (
          <polygon
            key={i}
            points={pts([[x, centre(x) - 0.4, -0.42], [x + 0.7, centre(x) - 0.4, -0.42], [x + 0.7, centre(x) - 0.24, -0.42], [x, centre(x) - 0.24, -0.42]])}
            fill="#ffffff"
            opacity={0.35}
          />
        );
      })}
    </g>
  );
}

/** Roads: a main lane plus a spur up to the castle. */
function Roads() {
  const lane = [];
  for (let x = 0; x <= N; x += 0.5) lane.push([x, 6.6 + Math.sin(x / 2.2) * 1.15, 0.02]);
  const spur = [];
  for (let i = 0; i <= 6; i += 0.5) spur.push([2.6 + i * 0.42, 2.4 + i * 0.5, 0.02]);
  const band = (line, w) => pts([...line, ...line.slice().reverse().map((p) => [p[0], p[1] + w, p[2]])]);
  return (
    <g>
      <polygon points={band(lane, 0.55)} fill="#dcc79e" opacity={0.92} />
      <polygon points={band(spur, 0.4)} fill="#d8c39a" opacity={0.85} />
    </g>
  );
}

/** A raised mound the castle complex stands on. */
function CastleHill({ t }) {
  const cx = 2.9;
  const cy = 2.6;
  const rx = 2.5;
  const ry = 2.2;
  const h = 1.4;
  const ring = [];
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2;
    ring.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  const topRing = ring.map((p) => [p[0], p[1], h]);
  return (
    <g>
      <polygon points={pts(ring)} fill={shade(t.a, -0.06)} />
      <polygon
        points={pts([...ring.map((p) => [p[0], p[1], 0.02]), ...topRing.slice().reverse()])}
        fill={shade(t.a, -0.12)}
      />
      <polygon points={pts(topRing)} fill={shade(t.a, 0.14)} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Scenery
// ---------------------------------------------------------------------------

function Tree({ x, y, z = 0, scale = 1, color, alt, kind = "conifer" }) {
  const s = scale;
  if (kind === "round") {
    return (
      <g>
        <polygon
          points={pts([[x + 0.04 * s, y, z], [x + 0.18 * s, y, z], [x + 0.18 * s, y, z + 0.42 * s], [x + 0.04 * s, y, z + 0.42 * s]])}
          fill="#6b4a2c"
        />
        <ellipse
          cx={(x + 0.11 * s - y) * HALF_W}
          cy={(x + 0.11 * s + y) * HALF_H - z - 0.55 * s}
          rx={0.42 * s}
          ry={0.36 * s}
          fill={color}
        />
        <ellipse
          cx={(x + 0.11 * s - y) * HALF_W}
          cy={(x + 0.11 * s + y) * HALF_H - z - 0.42 * s}
          rx={0.3 * s}
          ry={0.24 * s}
          fill={alt}
        />
      </g>
    );
  }
  return (
    <g>
      <polygon
        points={pts([[x, y, z], [x + 0.15 * s, y, z], [x + 0.15 * s, y, z + 0.42 * s], [x, y, z + 0.42 * s]])}
        fill="#6b4a2c"
      />
      <polygon
        points={pts([
          [x - 0.05 * s, y, z + 0.3 * s],
          [x + 0.28 * s, y, z + 0.3 * s],
          [x + 0.115 * s, y + 0.115 * s, z + 1.15 * s],
        ])}
        fill={color}
      />
      <polygon
        points={pts([
          [x + 0.28 * s, y, z + 0.3 * s],
          [x + 0.28 * s, y + 0.15 * s, z + 0.3 * s],
          [x + 0.115 * s, y + 0.115 * s, z + 1.15 * s],
        ])}
        fill={alt}
      />
    </g>
  );
}

function Bush({ x, y, z = 0, scale = 1, color }) {
  return (
    <polygon
      points={pts([
        [x - 0.18 * scale, y, z],
        [x + 0.26 * scale, y, z],
        [x + 0.26 * scale, y + 0.2 * scale, z],
        [x - 0.18 * scale, y + 0.2 * scale, z],
        [x + 0.04 * scale, y + 0.1 * scale, z + 0.3 * scale],
      ])}
      fill={color}
    />
  );
}

/** Flower patch — tiny, but they are what make a field look tended. */
function Flowers({ x, y, z = 0, color }) {
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const ox = (i - 1) * 0.18;
        return (
          <circle
            key={i}
            cx={(x + ox - y) * HALF_W}
            cy={(x + ox + y) * HALF_H - z - 0.06}
            r={0.07}
            fill={color}
          />
        );
      })}
    </g>
  );
}

function WallSeg({ x, y, base, w = 0.8, h = 0.55 }) {
  const f = boxFaces(x, y, 0, w, 0.3, h);
  const t = boxTones(base);
  return (
    <g>
      <polygon points={pts(f.front, true, 18)} fill={t.front} stroke={t.line} strokeWidth={0.4} />
      <polygon points={pts(f.right, true, 18)} fill={t.right} stroke={t.line} strokeWidth={0.4} />
      <polygon points={pts(f.top, true, 18)} fill={t.top} stroke={t.line} strokeWidth={0.4} />
    </g>
  );
}

/** Low field walls and fences around the outside of the settlement. */
function Perimeter({ t }) {
  const segs = [];
  for (let i = 0; i < N; i += 0.9) {
    segs.push([i + 0.4, 0.35]);
    segs.push([0.35, i + 0.4]);
  }
  return (
    <g>
      {segs.map(([x, y], i) => (
        <WallSeg key={i} x={x} y={y} base={shade(t.edge, 0.24)} />
      ))}
    </g>
  );
}

/** A plot waiting to be built. */
function Plot({ x, y, state, tint, onClick, label }) {
  const base = state === PLOT.WILD ? shade(tint, -0.12) : "#cdb88f";
  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      role={onClick ? "button" : undefined}
      aria-label={label}
    >
      <polygon
        points={pts([[x, y, 0.03], [x + 1.6, y, 0.03], [x + 1.6, y + 1.4, 0.03], [x, y + 1.4, 0.03]])}
        fill={base}
        stroke={shade(base, -0.3)}
        strokeWidth={0.8}
        strokeDasharray={state === PLOT.WILD ? "3 2" : undefined}
      />
      {state === PLOT.WILD && (
        <g>
          <Tree x={x + 0.35} y={y + 0.35} scale={0.8} color={tint} alt={shade(tint, -0.2)} />
          <Tree x={x + 1.05} y={y + 0.95} scale={0.62} color={tint} alt={shade(tint, -0.2)} />
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Filler props — no game state, they just make it a village
// ---------------------------------------------------------------------------

function FillerHut({ x, y, z = 0, roof, wall }) {
  return (
    <g>
      <IsoBoxSmall x={x} y={y} z={z} w={0.9} d={0.8} h={0.5} base={wall} />
      <RoofSmall x={x - 0.08} y={y - 0.08} z={z + 0.5} w={1.06} d={0.96} rise={0.42} base={roof} />
    </g>
  );
}

function IsoBoxSmall({ x, y, z, w, d, h, base }) {
  const f = boxFaces(x, y, z, w, d, h);
  const t = boxTones(base);
  return (
    <g>
      <polygon points={pts(f.front, true, 20)} fill={t.front} stroke={t.line} strokeWidth={0.5} />
      <polygon points={pts(f.right, true, 20)} fill={t.right} stroke={t.line} strokeWidth={0.5} />
      <polygon points={pts(f.top, true, 20)} fill={t.top} stroke={t.line} strokeWidth={0.5} />
    </g>
  );
}

function RoofSmall({ x, y, z, w, d, rise, base }) {
  const x2 = x + w;
  const y2 = y + d;
  const ym = y + d / 2;
  const zr = z + rise;
  const t = boxTones(base);
  return (
    <g>
      <polygon
        points={pts([[x, y, z], [x2, y, z], [x2, ym, zr], [x, ym, zr]], 20)}
        fill={shade(base, -0.3)}
        stroke={t.line}
        strokeWidth={0.5}
      />
      <polygon
        points={pts([[x, ym, zr], [x2, ym, zr], [x2, y2, z], [x, y2, z]], 20)}
        fill={t.top}
        stroke={t.line}
        strokeWidth={0.5}
      />
    </g>
  );
}

function Haystack({ x, y, z = 0, s = 1 }) {
  return (
    <polygon
      points={pts([
        [x - 0.3 * s, y, z],
        [x + 0.45 * s, y, z],
        [x + 0.45 * s, y + 0.4 * s, z],
        [x - 0.3 * s, y + 0.4 * s, z],
        [x + 0.07 * s, y + 0.2 * s, z + 0.55 * s],
      ])}
      fill="#e3c977"
    />
  );
}

function Fence({ x, y, len = 3, z = 0 }) {
  return (
    <g>
      <polygon
        points={pts([[x, y, z + 0.3], [x + len, y, z + 0.3], [x + len, y + 0.07, z + 0.3], [x, y + 0.07, z + 0.3]])}
        fill="#8a6a45"
      />
      {Array.from({ length: Math.round(len) + 1 }, (_, i) => (
        <polygon
          key={i}
          points={pts([[x + i, y, z], [x + i + 0.08, y, z], [x + i + 0.08, y, z + 0.38], [x + i, y, z + 0.38]])}
          fill="#6b4a2c"
        />
      ))}
    </g>
  );
}

function Cart({ x, y, z = 0 }) {
  return (
    <g>
      <polygon
        points={pts([[x, y, z + 0.3], [x + 0.7, y, z + 0.3], [x + 0.7, y + 0.35, z + 0.3], [x, y + 0.35, z + 0.3]])}
        fill="#7a5334"
      />
      <circle cx={(x + 0.7 - y - 0.18) * HALF_W} cy={(x + 0.7 + y - 0.18) * HALF_H - z - 0.12} r={0.14} fill="#4a3524" />
      <circle cx={(x + 0.7 - y + 0.2) * HALF_W} cy={(x + 0.7 + y + 0.2) * HALF_H - z - 0.12} r={0.14} fill="#4a3524" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Gameplay plots, hand-placed so the settlement reads as a place: the castle
 * complex is up on the hill, the houses pack along the lane either side of it,
 * and the working buildings sit at the edges where they belong.
 */
const LAYOUT = {
  greenwoodcastle: [1.9, 1.7, 1.4, true],
  cottage: [4.6, 0.7, 0, false],
  bakery: [4.7, 2.2, 0, false],
  well: [6.6, 1.0, 0, false],
  market: [7.4, 2.5, 0, false],
  schoolhouse: [3.6, 4.0, 0, false],
  townhall: [5.4, 3.6, 0, false],

  rivercastle: [1.9, 1.7, 1.4, true],
  dock: [7.8, 1.3, 0, false],
  mill: [4.8, 0.8, 0, false],
  bridge: [6.9, 5.6, 0, false],
  fishery: [7.9, 0.5, 0, false],
  inn: [4.9, 3.0, 0, false],

  highlandcastle: [1.9, 1.7, 1.4, true],
  watchtower: [4.4, 0.7, 0, false],
  barracks: [5.2, 4.0, 0, false],
  chapel: [7.2, 1.6, 0, false],
  greatkeep: [4.8, 2.0, 0, false],

  crystalcastle: [1.9, 1.7, 1.4, true],
  mine: [4.4, 0.6, 0, false],
  gemcutter: [5.0, 3.2, 0, false],
  bridgeoflight: [6.9, 5.6, 0, false],
  cathedral: [4.7, 1.6, 0, false],

  dragoncastle: [1.9, 1.7, 1.4, true],
  camp: [4.6, 1.8, 0, false],
  lair: [5.2, 4.2, 0, false],
  observatory: [7.3, 1.4, 0, false],
  throne: [4.8, 3.0, 0, false],
};

// Filler cottages, sheds and props. Hard-coded rather than random so the village
// looks the same every visit — a child should recognise their own street.
const FILLER_HUTS = [
  [6.0, 0.5], [7.0, 0.4], [2.6, 5.4], [3.5, 6.2], [7.6, 4.4],
  [1.2, 4.4], [2.2, 6.6], [6.4, 3.0], [7.9, 3.4], [3.2, 2.9],
  [8.1, 2.0], [1.5, 6.9], [4.4, 6.6], [5.9, 6.4],
];
const FILLER_PROPS = [
  { kind: "hay", x: 3.9, y: 1.2 },
  { kind: "hay", x: 6.9, y: 4.3 },
  { kind: "cart", x: 5.2, y: 5.2 },
  { kind: "cart", x: 2.7, y: 3.4 },
  { kind: "fence", x: 3.4, y: 4.9, len: 2.4 },
  { kind: "fence", x: 6.1, y: 1.9, len: 2.0 },
  { kind: "fence", x: 1.4, y: 3.0, len: 2.6 },
];

export default function IsoVillage({ kingdomId, built = {}, onSelectPlot, companion }) {
  const kingdom = useMemo(
    () => KINGDOMS.find((k) => k.id === kingdomId) || KINGDOMS[0],
    [kingdomId]
  );
  const t = GROUND[kingdom.theme] || GROUND.forest;

  // Vegetation is dense but deterministic, and kept clear of the plots, the
  // river and the road so nothing overlaps a building.
  const scenery = useMemo(() => {
    const plotSpots = kingdom.buildings.map((b) => LAYOUT[b.id] || [5, 3, 0, false]);
    const clearOf = (x, y) => {
      for (const [px, py] of plotSpots) if (Math.abs(x - px) < 1.9 && Math.abs(y - py) < 1.8) return false;
      if (x > 0.3 && x < N - 0.3 && y > 0.3 && y < N - 0.3) {
        const riverY = 5.6 + Math.sin(x / 2.2) * 1.15;
        if (Math.abs(y - riverY) < 1.35) return false; // river
        if (Math.abs(y - (6.6 + Math.sin(x / 2.2) * 1.15)) < 0.55) return false; // road
      }
      return true;
    };

    let seed = kingdom.id * 7919 + 13;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    const trees = [];
    for (let i = 0; i < 260 && trees.length < 52; i += 1) {
      const x = 0.25 + rnd() * (N - 0.5);
      const y = 0.25 + rnd() * (N - 0.5);
      if (!clearOf(x, y)) continue;
      trees.push({ x, y, s: 0.55 + rnd() * 0.6, kind: rnd() > 0.55 ? "round" : "conifer" });
    }
    const bushes = [];
    for (let i = 0; i < 200 && bushes.length < 30; i += 1) {
      const x = 0.3 + rnd() * (N - 0.6);
      const y = 0.3 + rnd() * (N - 0.6);
      if (!clearOf(x, y)) continue;
      bushes.push({ x, y, s: 0.6 + rnd() * 0.6 });
    }
    const flowers = [];
    for (let i = 0; i < 120 && flowers.length < 14; i += 1) {
      const x = 0.5 + rnd() * (N - 1);
      const y = 0.5 + rnd() * (N - 1);
      if (!clearOf(x, y)) continue;
      flowers.push({ x, y, c: ["#ffd76a", "#ff9ec4", "#ffffff", "#c8a8ff"][Math.floor(rnd() * 4)] });
    }
    return { trees, bushes, flowers };
  }, [kingdom.id, kingdom.buildings]);

  const items = useMemo(() => {
    const out = [];
    const push = (x, y, node, bias = 0) => out.push({ depth: x + y + bias, node });

    for (const tr of scenery.trees) {
      push(tr.x, tr.y, (
        <Tree
          x={tr.x}
          y={tr.y}
          scale={tr.s}
          kind={tr.kind}
          color={shade(t.tree, tr.kind === "round" ? 0.1 : 0)}
          alt={shade(t.tree, -0.22)}
        />
      ));
    }
    for (const b of scenery.bushes) push(b.x, b.y, <Bush x={b.x} y={b.y} scale={b.s} color={shade(t.tree, 0.14)} />);
    for (const f of scenery.flowers) push(f.x, f.y, <Flowers x={f.x} y={f.y} color={f.c} />);

    for (const [i, [x, y]] of FILLER_HUTS.entries()) {
      const roof = ["#c1503f", "#4a6fa5", "#d98a3c", "#8a5a34", "#5a8a5f"][i % 5];
      push(x, y, <FillerHut x={x} y={y} roof={roof} wall="#e8d5b7" />, 0.6);
    }
    for (const p of FILLER_PROPS) {
      if (p.kind === "hay") push(p.x, p.y, <Haystack x={p.x} y={p.y} s={1} />, 0.3);
      if (p.kind === "cart") push(p.x, p.y, <Cart x={p.x} y={p.y} />, 0.3);
      if (p.kind === "fence") push(p.x, p.y, <Fence x={p.x} y={p.y} len={p.len} />, 0.2);
    }

    for (const b of kingdom.buildings) {
      const [x, y, z] = LAYOUT[b.id] || [5, 3, 0, false];
      const state = plotState(built, b.id);
      if (state === PLOT.BUILT) {
        push(x, y, (
          <g>
            <polygon
              points={pts([
                [x - 0.15, y - 0.15, z + 0.01],
                [x + 1.95, y - 0.15, z + 0.01],
                [x + 1.95, y + 1.7, z + 0.01],
                [x - 0.15, y + 1.7, z + 0.01],
              ])}
              fill="#000"
              opacity={0.18}
            />
            <g transform={`translate(${HALF_W * (x - y)}, ${HALF_H * (x + y) - z * 40})`}>
              <IsoBuildingShapes id={b.id} />
            </g>
          </g>
        ), 1.2);
      } else {
        push(x, y, (
          <Plot
            x={x}
            y={y}
            state={state}
            tint={t.edge}
            onClick={onSelectPlot ? () => onSelectPlot(b) : undefined}
            label={`${state === PLOT.WILD ? "Wild land" : "Cleared land"} — ${b.name}`}
          />
        ), 0.4);
      }
    }

    out.sort((a, b) => a.depth - b.depth);
    return out;
  }, [kingdom, built, scenery, onSelectPlot, t]);

  const builtCount = kingdom.buildings.filter((b) => plotState(built, b.id) === PLOT.BUILT).length;

  return (
    <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", position: "relative", boxShadow: "var(--shadow)" }}>
      <svg
        viewBox={`${-WIDTH / 2 - 22} ${-HEIGHT / 2 - 6} ${WIDTH + 44} ${HEIGHT + 212}`}
        width="100%"
        style={{ display: "block" }}
        role="img"
        aria-label={`${kingdom.name}, ${builtCount} of ${kingdom.buildings.length} buildings built`}
      >
        <defs>
          <linearGradient id={`iso-sky-${kingdom.theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shade(t.a, 0.44)} />
            <stop offset="100%" stopColor={shade(t.a, 0.22)} />
          </linearGradient>
        </defs>

        <rect
          x={-WIDTH / 2 - 22}
          y={-HEIGHT / 2 - 6}
          width={WIDTH + 44}
          height={HEIGHT + 212}
          fill={`url(#iso-sky-${kingdom.theme})`}
        />

        <Island t={t} />
        <CastleHill t={t} />
        <River />
        <Roads />
        <Perimeter t={t} />

        {items.map((it, i) => (
          <g key={i}>{it.node}</g>
        ))}

        {companion && (
          <g
            style={{ animation: "ks-float 4s ease-in-out infinite" }}
            transform={`translate(${HALF_W * (6.2 - 4.3)}, ${HALF_H * (6.2 + 4.3) - 14})`}
          >
            <PetArt id={companion} size={54} label="Your companion" />
          </g>
        )}
      </svg>

      <div
        style={{
          position: "absolute", left: 12, bottom: 10,
          background: "rgba(255,255,255,0.86)", borderRadius: "var(--radius)",
          padding: "6px 12px", fontSize: "0.8rem", fontWeight: 700,
          color: "#2d2a32", boxShadow: "var(--shadow-sm)",
        }}
      >
        {kingdom.name} — {builtCount}/{kingdom.buildings.length} built
      </div>
    </div>
  );
}
