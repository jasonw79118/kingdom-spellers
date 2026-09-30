// Isometric village — the kingdom as a dense, living settlement.
//
// Composition follows a classic illustrated medieval village:
//
//   * the land is an ISLAND plateau with soil and rock showing at the cut edge,
//     so the village reads as a place with a border rather than ground fading
//     into infinity
//   * buildings are packed close together, the way a real village grows
//   * a multi-tower castle complex anchors the back of the valley
//   * a wide river curves through the lower third with bridges over it
//   * filler cottages, sheds, stalls, haystacks, fences and market awnings fill
//     the gaps between the gameplay plots. These carry no game state; they
//     exist so the settlement looks lived-in
//   * croft fields sit in the foreground
//
// Everything is drawn on one diamond grid and painted back-to-front by sorting
// on (gx + gy), which is what sells the depth.
//
// Two rules learned the hard way, both enforced by the helpers below:
//   * `polygon points=` needs the comma form (`pts`), never the `M…L…` path form
//   * strokes need `d={path(...)}`

import { useMemo } from "react";
import { path, pts, boxFaces, boxTones, shade, HALF_W, HALF_H, TILE_W, TILE_H, Z_HEIGHT } from "./iso";
import { IsoBuildingShapes } from "./IsoBuilding";
import PetArt from "./petArt";
import { KINGDOMS, PLOT, plotState } from "../../game/kingdom";

// Heights are grid units and need the vertical exaggeration described in
// iso.js. Without it a two-storey house renders as a sliver — that was the
// reason the first pass looked like a scatter of flat lids.
const P = (list) => pts(list, Z_HEIGHT);
const L = (list, close = true) => path(list, close, Z_HEIGHT);
/** A grid height expressed in screen pixels, for the hand-placed shapes. */
const px = (z) => z * Z_HEIGHT;

// The playable grid. Wide enough that the road, the river, the far-bank
// cottages and the croft terrace each get their own band without overlapping —
// at 12 tiles the scene could not hold all four.
const N = 14;
const WIDTH = N * TILE_W;
const HEIGHT = N * TILE_H;

// How thick the island's crust is, in screen pixels.
const CRUST = 44;

// Palette per territory, so each region still feels like itself.
const GROUND = {
  forest: { a: "#84c485", b: "#6aae6e", edge: "#4f8f56", soil: "#8a6a4a", rock: "#9c8f7a", tree: "#4e9159", treeLight: "#74b45c" },
  river: { a: "#95cf94", b: "#79b47a", edge: "#5a9a58", soil: "#8a6a4a", rock: "#9c8f7a", tree: "#579d5f", treeLight: "#7dbe62" },
  highland: { a: "#9bb870", b: "#849f60", edge: "#6b804c", soil: "#7d6a52", rock: "#9a9384", tree: "#4f7448", treeLight: "#719355" },
  cavern: { a: "#a49ad6", b: "#8b80bf", edge: "#6f63a0", soil: "#6f6486", rock: "#8a80a8", tree: "#6558a4", treeLight: "#8072c2" },
  peak: { a: "#cf9a78", b: "#b07e5e", edge: "#906247", soil: "#7a4a3a", rock: "#8f7365", tree: "#8a5644", treeLight: "#a87059" },
};

const WATER = { a: "#8ecdf0", b: "#4f9ccc" };

// Building colour sets. Kept warm and varied — a village where every roof is
// the same colour reads as a diagram, not a place.
const ROOFS = ["#c1503f", "#4a6fa5", "#d98a3c", "#8a5a34", "#5f8a55", "#a8503f", "#3f7f8a", "#c98f3a"];
const WALLS = ["#efe0c2", "#e8d5b7", "#e3d3bb", "#f0e4cd", "#e6dcc4"];
const TIMBER = "#6b4a2c";
const STONE_DARK = "#8f8879";
const STONE = "#b8b0a2";

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Build a ribbon polygon along a centreline — used for roads, rivers and field
 * strips. Sampling the centreline with a sine keeps the curves organic without
 * needing a spline library.
 */
function ribbon(sample, halfWidth, z) {
  const a = [];
  const b = [];
  for (const [x, y] of sample) {
    a.push([x, y - halfWidth, z]);
    b.push([x, y + halfWidth, z]);
  }
  return pts([...a, ...b.reverse()]);
}

/** Catmull-Rom through control points, so roads bend rather than kink. */
function smooth(control, steps = 12) {
  const out = [];
  for (let i = 0; i < control.length - 1; i += 1) {
    const p0 = control[Math.max(0, i - 1)];
    const p1 = control[i];
    const p2 = control[i + 1];
    const p3 = control[Math.min(control.length - 1, i + 2)];
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
  out.push(control[control.length - 1]);
  return out;
}

// The water's centreline, and the main lane above it. The bands are kept
// deliberately apart, and the settlement is arranged in rows BETWEEN them, so
// the road and the river both stay visible instead of being built over:
//   upper village 1.8 – 4.3
//   lane           4.3 – 6.6
//   lane frontage  6.7 – 7.8
//   river          8.1 – 11.1
//   far bank      11.4 – 12.5
//   crofts        12.8 – 13.8
const riverY = (x) => 9.6 + Math.sin(x / 3.2 + 0.4) * 0.7;
const laneY = (x) => 5.4 + Math.sin(x / 3.2 + 0.4) * 0.55;

const RIVER_PATH = smooth(Array.from({ length: 9 }, (_, i) => [i * (N / 8) - 0.5, riverY(i * (N / 8))]));
const LANE_PATH = smooth(Array.from({ length: 9 }, (_, i) => [i * (N / 8) - 0.5, laneY(i * (N / 8))]));

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

/** The land as a raised block: grass over soil over rock. */
function Island({ t }) {
  const top = [[0, 0, 0], [N, 0, 0], [N, N, 0], [0, N, 0]];
  return (
    <g>
      <polygon points={pts([[0, N, 0], [N, N, 0], [N, N, -CRUST * 0.45], [0, N, -CRUST * 0.45]])} fill={t.soil} />
      <polygon points={pts([[N, 0, 0], [N, N, 0], [N, N, -CRUST * 0.45], [N, 0, -CRUST * 0.45]])} fill={shade(t.soil, -0.24)} />
      <polygon points={pts([[0, N, -CRUST * 0.45], [N, N, -CRUST * 0.45], [N, N, -CRUST], [0, N, -CRUST]])} fill={t.rock} />
      <polygon points={pts([[N, 0, -CRUST * 0.45], [N, N, -CRUST * 0.45], [N, N, -CRUST], [N, 0, -CRUST]])} fill={shade(t.rock, -0.22)} />
      <polygon points={pts(top)} fill={t.a} />
    </g>
  );
}

/**
 * A gently raised mound the castle stands on. The top face is the same colour
 * as the grass — an earlier pass tinted it lighter, which read as a bald
 * plateau rather than a hill. Only the shaded skirt gives the rise away.
 */
function CastleHill({ t }) {
  const cx = 2.8;
  const cy = 2.4;
  const rx = 2.6;
  const ry = 2.3;
  const h = 1.5;
  const ring = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
  const topRing = ring.map((p) => [p[0], p[1], h]);
  return (
    <g>
      <polygon points={pts([...ring, ...topRing.slice().reverse()])} fill={shade(t.a, -0.16)} />
      <polygon points={pts(topRing)} fill={t.a} />
    </g>
  );
}

/** The river, carved slightly below the grass so it sits in the land. */
function River({ t }) {
  const half = 0.85;
  return (
    <g>
      {/* damp banks either side — a soft green, not a grey slab */}
      <polygon points={ribbon(RIVER_PATH, half + 0.42, 0.015)} fill={shade(t.edge, 0.16)} opacity={0.6} />
      <polygon points={ribbon(RIVER_PATH, half, 0.01)} fill={WATER.b} />
      <polygon points={ribbon(RIVER_PATH, half * 0.6, 0.008)} fill={WATER.a} />
    </g>
  );
}

/**
 * Curved lanes: the main road above the river, plus a spur up to the castle and
 * a track down to the ford. Each is drawn as three nested bands — a dark
 * earth edge, a packed surface, and a paler worn centre — because a single flat
 * tan ribbon disappears against the grass.
 */
function Roads() {
  const spur = smooth([[2.0, 4.4], [2.3, 3.7], [2.6, 3.1], [2.8, 2.7]]);
  const ford = smooth([[8.4, 7.4], [7.9, 8.4], [7.4, 9.4]]);
  return (
    <g>
      <polygon points={ribbon(LANE_PATH, 0.7, 0.03)} fill="#b99a6b" />
      <polygon points={ribbon(LANE_PATH, 0.58, 0.028)} fill="#d8c096" />
      <polygon points={ribbon(LANE_PATH, 0.34, 0.026)} fill="#e6d5b0" />
      <polygon points={ribbon(spur, 0.46, 0.032)} fill="#bfa070" />
      <polygon points={ribbon(spur, 0.34, 0.03)} fill="#dcc59b" />
      <polygon points={ribbon(ford, 0.42, 0.034)} fill="#bfa070" />
      <polygon points={ribbon(ford, 0.3, 0.032)} fill="#dcc59b" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Scenery
// ---------------------------------------------------------------------------

/**
 * A small timber-framed cottage — the filler building that makes it a village.
 *
 * The roof can ridge either way. That single switch does more for variety than
 * any amount of recolouring: a street where every ridge runs the same direction
 * reads as one object stamped out thirty times, and a real village has houses
 * turned at odd angles to the lane.
 */
function Cottage({ x, y, w = 1.5, d = 1.3, h = 0.9, roof, wall, seed = 0 }) {
  const wt = boxTones(wall);
  const rt = boxTones(roof);
  const over = 0.14; // roof overhang — the biggest single thing that makes a
  const rx = x - over; // roof read as a roof rather than a lid
  const ry = y - over;
  const rw = w + over * 2;
  const rd = d + over * 2;
  const alongX = seed % 2 === 0; // ridge runs east–west, or north–south
  const steep = 0.5 + (seed % 3) * 0.1; // taller houses, steeper pitch
  const storeys = seed % 5 === 0 ? 0.42 : 0; // a few are two-storey
  const wh = h + storeys;
  const f = boxFaces(x, y, 0, w, d, wh);
  const chimX = alongX ? rx + rw * (0.16 + (seed % 3) * 0.24) : rx + rw * 0.34;
  const chimY = alongX ? ry + rd * 0.3 : ry + rd * (0.18 + (seed % 3) * 0.2);

  return (
    <g>
      {/* footing */}
      <polygon points={P([[x - 0.1, y - 0.1, 0], [x + w + 0.1, y - 0.1, 0], [x + w + 0.1, y + d + 0.1, 0], [x - 0.1, y + d + 0.1, 0]])} fill={shade(wall, -0.2)} />

      {/* walls */}
      <polygon points={P(f.front)} fill={wt.front} stroke={wt.line} strokeWidth={0.7} />
      <polygon points={P(f.right)} fill={wt.right} stroke={wt.line} strokeWidth={0.7} />

      {/* timber framing on the front */}
      <g stroke={TIMBER} strokeWidth={1.5} opacity={0.75} fill="none">
        <path d={L([[x + 0.02, y + d, 0.06], [x + 0.02, y + d, wh - 0.06]], false)} />
        <path d={L([[x + w - 0.02, y + d, 0.06], [x + w - 0.02, y + d, wh - 0.06]], false)} />
        <path d={L([[x + 0.02, y + d, 0.06], [x + w - 0.02, y + d, 0.06]], false)} />
        <path d={L([[x + 0.02, y + d, wh - 0.06], [x + w - 0.02, y + d, wh - 0.06]], false)} />
        <path d={L([[x + w * 0.5, y + d, 0.06], [x + w * 0.5, y + d, wh - 0.06]], false)} />
        {storeys > 0 && <path d={L([[x + 0.02, y + d, wh * 0.5], [x + w - 0.02, y + d, wh * 0.5]], false)} />}
      </g>

      {/* door and windows */}
      <polygon points={P([[x + w * 0.42, y + d, 0.04], [x + w * 0.72, y + d, 0.04], [x + w * 0.72, y + d, 0.58], [x + w * 0.42, y + d, 0.58]])} fill="#6b4326" stroke="#4a2d19" strokeWidth={0.8} />
      <polygon points={P([[x + 0.1, y + d, 0.3], [x + 0.32, y + d, 0.3], [x + 0.32, y + d, 0.56], [x + 0.1, y + d, 0.56]])} fill="#ffd98a" stroke="#5a4a2c" strokeWidth={0.7} />
      <polygon points={P([[x + w - 0.32, y + d, 0.3], [x + w - 0.1, y + d, 0.3], [x + w - 0.1, y + d, 0.56], [x + w - 0.32, y + d, 0.56]])} fill="#ffd98a" stroke="#5a4a2c" strokeWidth={0.7} />
      <polygon points={P([[x + w, y + 0.3, 0.3], [x + w, y + 0.56, 0.3], [x + w, y + 0.56, 0.56], [x + w, y + 0.3, 0.56]])} fill="#ffd98a" stroke="#5a4a2c" strokeWidth={0.7} />
      {storeys > 0 && (
        <>
          <polygon points={P([[x + 0.14, y + d, wh * 0.62], [x + 0.36, y + d, wh * 0.62], [x + 0.36, y + d, wh * 0.86], [x + 0.14, y + d, wh * 0.86]])} fill="#ffd98a" stroke="#5a4a2c" strokeWidth={0.7} />
          <polygon points={P([[x + w - 0.36, y + d, wh * 0.62], [x + w - 0.14, y + d, wh * 0.62], [x + w - 0.14, y + d, wh * 0.86], [x + w - 0.36, y + d, wh * 0.86]])} fill="#ffd98a" stroke="#5a4a2c" strokeWidth={0.7} />
        </>
      )}

      {alongX ? (
        <g>
          {/* Ridge east–west. Slopes face north and south; the gable ends are
              WALL, with only a barge-board of roof colour along the rake —
              filling the whole triangle in roof colour makes the house read as
              a solid triangular sail rather than a building. */}
          <polygon points={P([[rx, ry + rd / 2, wh + steep], [rx + rw, ry + rd / 2, wh + steep], [rx, ry, wh], [rx + rw, ry, wh]])} fill={shade(roof, -0.34)} stroke={rt.line} strokeWidth={0.8} />
          <polygon points={P([[rx + rw, ry, wh], [rx + rw, ry + rd, wh], [rx + rw, ry + rd / 2, wh + steep]])} fill={wt.right} stroke={wt.line} strokeWidth={0.8} />
          <polygon points={P([[rx, ry + rd / 2, wh + steep], [rx + rw, ry + rd / 2, wh + steep], [rx + rw, ry + rd, wh], [rx, ry + rd, wh]])} fill={rt.top} stroke={rt.line} strokeWidth={0.8} />
          <polygon points={P([[rx, ry + rd, wh], [rx + rw, ry + rd, wh], [rx + rw, ry + rd, wh - 0.07], [rx, ry + rd, wh - 0.07]])} fill={shade(roof, -0.46)} />
          <path d={L([[rx, ry + rd / 2, wh + steep], [rx + rw, ry + rd / 2, wh + steep]], false)} stroke={shade(roof, 0.24)} strokeWidth={2} strokeLinecap="round" />
          {/* barge-boards and a collar tie on the visible gable */}
          <g stroke={roof} strokeWidth={2.6} fill="none" strokeLinecap="round">
            <path d={L([[rx + rw, ry, wh], [rx + rw, ry + rd / 2, wh + steep]], false)} />
            <path d={L([[rx + rw, ry + rd, wh], [rx + rw, ry + rd / 2, wh + steep]], false)} />
          </g>
          <path d={L([[rx + rw, ry + rd * 0.28, wh + steep * 0.44], [rx + rw, ry + rd * 0.72, wh + steep * 0.44]], false)} stroke={TIMBER} strokeWidth={1.4} />
        </g>
      ) : (
        <g>
          {/* Ridge north–south. Same treatment, gables front and back. */}
          <polygon points={P([[rx + rw / 2, ry, wh + steep], [rx + rw / 2, ry + rd, wh + steep], [rx, ry, wh], [rx, ry + rd, wh]])} fill={shade(roof, -0.34)} stroke={rt.line} strokeWidth={0.8} />
          <polygon points={P([[rx, ry + rd, wh], [rx + rw, ry + rd, wh], [rx + rw / 2, ry + rd, wh + steep]])} fill={wt.front} stroke={wt.line} strokeWidth={0.8} />
          <polygon points={P([[rx + rw / 2, ry, wh + steep], [rx + rw / 2, ry + rd, wh + steep], [rx + rw, ry, wh], [rx + rw, ry + rd, wh]])} fill={rt.top} stroke={rt.line} strokeWidth={0.8} />
          <polygon points={P([[rx + rw, ry, wh], [rx + rw, ry + rd, wh], [rx + rw, ry + rd, wh - 0.07], [rx + rw, ry, wh - 0.07]])} fill={shade(roof, -0.46)} />
          <path d={L([[rx + rw / 2, ry, wh + steep], [rx + rw / 2, ry + rd, wh + steep]], false)} stroke={shade(roof, 0.24)} strokeWidth={2} strokeLinecap="round" />
          <g stroke={roof} strokeWidth={2.6} fill="none" strokeLinecap="round">
            <path d={L([[rx, ry + rd, wh], [rx + rw / 2, ry + rd, wh + steep]], false)} />
            <path d={L([[rx + rw, ry + rd, wh], [rx + rw / 2, ry + rd, wh + steep]], false)} />
          </g>
          <path d={L([[rx + rw * 0.28, ry + rd, wh + steep * 0.44], [rx + rw * 0.72, ry + rd, wh + steep * 0.44]], false)} stroke={TIMBER} strokeWidth={1.4} />
        </g>
      )}

      {/* chimney, offset per house so the row doesn't look stamped */}
      <polygon
        points={P([
          [chimX, chimY, wh], [chimX + 0.22, chimY, wh],
          [chimX + 0.22, chimY, wh + 0.55], [chimX, chimY, wh + 0.55],
        ])}
        fill={STONE_DARK}
      />
    </g>
  );
}

/** Trees, in two clear silhouettes so a wood reads as mixed woodland. */
function Tree({ x, y, z = 0, scale = 1, color, light, kind = "conifer" }) {
  const s = scale;
  const trunk = 0.42 * s;
  const cx = x + 0.16 * s;

  if (kind === "round") {
    const sx = (cx - y) * HALF_W;
    const sy = (cx + y) * HALF_H - px(z);
    const u = TILE_W * 0.46 * s;
    return (
      <g>
        <polygon points={P([[x, y, z], [x + 0.24 * s, y, z], [x + 0.24 * s, y, z + trunk], [x, y, z + trunk]])} fill="#7a5636" />
        <ellipse cx={sx} cy={sy - 0.72 * px(s)} rx={u} ry={u * 0.72} fill={color} />
        <ellipse cx={sx - u * 0.52} cy={sy - 0.6 * px(s)} rx={u * 0.66} ry={u * 0.55} fill={light} />
        <ellipse cx={sx + u * 0.57} cy={sy - 0.58 * px(s)} rx={u * 0.57} ry={u * 0.48} fill={shade(color, -0.2)} />
        <ellipse cx={sx + u * 0.09} cy={sy - 0.92 * px(s)} rx={u * 0.55} ry={u * 0.44} fill={light} />
      </g>
    );
  }

  const tiers = [
    { z: 0.3, r: 0.44, h: 0.52 },
    { z: 0.66, r: 0.35, h: 0.48 },
    { z: 0.98, r: 0.24, h: 0.46 },
  ];
  return (
    <g>
      <polygon points={P([[x, y, z], [x + 0.22 * s, y, z], [x + 0.22 * s, y, z + trunk], [x, y, z + trunk]])} fill="#7a5636" />
      {tiers.map((t, i) => {
        const tz = z + t.z * s;
        const r = t.r * s;
        return (
          <g key={i}>
            <polygon points={P([[cx + r, y, tz], [cx + r, y + r * 0.8, tz], [cx, y + r * 0.4, tz + t.h * s]])} fill={light} />
            <polygon points={P([[cx, y + r * 0.8, tz], [cx - r, y, tz], [cx, y + r * 0.4, tz + t.h * s]])} fill={color} />
            <polygon points={P([[cx + r, y, tz], [cx, y + r * 0.8, tz], [cx, y + r * 0.4, tz + t.h * s]])} fill={shade(color, -0.16)} />
          </g>
        );
      })}
    </g>
  );
}

function Bush({ x, y, z = 0, scale = 1, color }) {
  const sx = (x + 0.14 * scale - y) * HALF_W;
  const sy = (x + 0.14 * scale + y) * HALF_H - px(z);
  const u = 0.34 * scale * TILE_W;
  return (
    <g>
      <ellipse cx={sx} cy={sy - 0.2 * px(scale)} rx={u} ry={u * 0.58} fill={color} />
      <ellipse cx={sx - u * 0.47} cy={sy - 0.26 * px(scale)} rx={u * 0.66} ry={u * 0.46} fill={shade(color, 0.16)} />
    </g>
  );
}

/** Flower patch: tight clumps on short stems. */
function Flowers({ x, y, z = 0, color }) {
  const buds = [[-0.14, 0.08], [0.04, 0.14], [0.18, 0.04], [-0.04, 0.22]];
  return (
    <g>
      {buds.map(([ox, oy], i) => (
        <g key={i}>
          <path d={L([[x + ox, y + oy, z], [x + ox, y + oy, z + 0.1]], false)} stroke="#4f8a4a" strokeWidth={1.4} />
          <circle cx={(x + ox - (y + oy)) * HALF_W} cy={(x + ox + (y + oy)) * HALF_H - px(z) - 5} r={3} fill={color} />
        </g>
      ))}
    </g>
  );
}

/**
 * A croft: a strip of tilled soil with a standing crop in rows. The rows have to
 * follow the iso axes and the whole plot has to be small — a large flat block of
 * colour reads as a tarpaulin, not a field.
 */
function Field({ x, y, w, d, crop = "#b8a344" }) {
  const rows = [];
  const n = Math.max(3, Math.round(d / 0.42));
  const gap = (d - 0.34) / n;
  for (let i = 0; i < n; i += 1) {
    const ry = y + 0.17 + i * gap;
    rows.push(
      <polygon key={i} points={P([[x + 0.14, ry, 0.02], [x + w - 0.14, ry, 0.02], [x + w - 0.14, ry + gap * 0.62, 0.02], [x + 0.14, ry + gap * 0.62, 0.02]])} fill={crop} />
    );
  }
  return (
    <g>
      <polygon points={P([[x, y, 0.01], [x + w, y, 0.01], [x + w, y + d, 0.01], [x, y + d, 0.01]])} fill="#8a6a45" />
      <polygon points={P([[x + 0.08, y + 0.08, 0.015], [x + w - 0.08, y + 0.08, 0.015], [x + w - 0.08, y + d - 0.08, 0.015], [x + 0.08, y + d - 0.08, 0.015]])} fill="#9c7c4e" />
      {rows}
      {/* headland, so the near edge reads as turned soil */}
      <polygon points={P([[x + 0.05, y + d - 0.2, 0.025], [x + w - 0.05, y + d - 0.2, 0.025], [x + w - 0.05, y + d - 0.08, 0.025], [x + 0.05, y + d - 0.08, 0.025]])} fill="#7d5f3c" />
    </g>
  );
}

function Fence({ x, y, len = 3, z = 0 }) {
  const posts = [];
  const n = Math.max(2, Math.round(len));
  for (let i = 0; i <= n; i += 1) {
    posts.push(
      <polygon key={i} points={P([[x + (len * i) / n, y, z], [x + (len * i) / n + 0.1, y, z], [x + (len * i) / n + 0.1, y, z + 0.4], [x + (len * i) / n, y, z + 0.4]])} fill="#7a5636" />
    );
  }
  return (
    <g>
      {posts}
      <polygon points={P([[x, y, z + 0.3], [x + len, y, z + 0.3], [x + len, y + 0.06, z + 0.3], [x, y + 0.06, z + 0.3]])} fill="#9a7a4e" />
    </g>
  );
}

/** A hedgerow, used to edge fields and the far bank. */
function Hedge({ x, y, len = 4 }) {
  const blobs = [];
  const n = Math.round(len / 0.55);
  for (let i = 0; i <= n; i += 1) {
    const bx = x + (len * i) / n;
    blobs.push(
      <ellipse key={i} cx={(bx - y) * HALF_W} cy={(bx + y) * HALF_H - 22} rx={22} ry={16} fill={i % 2 ? "#3f7a4a" : "#4d8f52"} />
    );
  }
  return <g>{blobs}</g>;
}

function Haystack({ x, y, z = 0, s = 1 }) {
  const sx = (x + 0.16 * s - y) * HALF_W;
  const sy = (x + 0.16 * s + y) * HALF_H - px(z);
  const u = 0.42 * s * TILE_W;
  return (
    <g>
      <ellipse cx={sx} cy={sy - 0.28 * px(s)} rx={u} ry={u * 0.76} fill="#d9bd6a" />
      <ellipse cx={sx - u * 0.24} cy={sy - 0.42 * px(s)} rx={u * 0.64} ry={u * 0.5} fill="#e8cf82" />
      <ellipse cx={sx} cy={sy - 0.04 * px(s)} rx={u * 1.04} ry={u * 0.3} fill={shade("#d9bd6a", -0.25)} />
    </g>
  );
}

/** A market stall: striped awning over a trestle. */
function Stall({ x, y, z = 0, awning = "#c1503f" }) {
  return (
    <g>
      <polygon points={P([[x, y, z + 0.44], [x + 1.1, y, z + 0.44], [x + 1.1, y + 0.6, z + 0.44], [x, y + 0.6, z + 0.44]])} fill="#a8814f" />
      <g stroke="#6b4a2c" strokeWidth={1.8}>
        <path d={L([[x + 0.05, y, z], [x + 0.05, y, z + 0.48]], false)} />
        <path d={L([[x + 1.05, y, z], [x + 1.05, y, z + 0.48]], false)} />
        <path d={L([[x + 0.05, y + 0.6, z], [x + 0.05, y + 0.6, z + 0.48]], false)} />
        <path d={L([[x + 1.05, y + 0.6, z], [x + 1.05, y + 0.6, z + 0.48]], false)} />
      </g>
      <polygon points={P([[x - 0.1, y - 0.1, z + 0.48], [x + 1.2, y - 0.1, z + 0.48], [x + 1.2, y + 0.3, z + 0.86], [x - 0.1, y + 0.3, z + 0.86]])} fill={shade(awning, -0.26)} />
      <polygon points={P([[x - 0.1, y + 0.3, z + 0.86], [x + 1.2, y + 0.3, z + 0.86], [x + 1.2, y + 0.7, z + 0.48], [x - 0.1, y + 0.7, z + 0.48]])} fill={awning} />
    </g>
  );
}

/** A wooden cart. */
function Cart({ x, y, z = 0 }) {
  return (
    <g>
      <polygon points={P([[x, y, z + 0.28], [x + 0.78, y, z + 0.28], [x + 0.78, y + 0.42, z + 0.28], [x, y + 0.42, z + 0.28]])} fill="#8a5f3a" />
      <polygon points={P([[x, y, z + 0.28], [x, y + 0.42, z + 0.28], [x, y + 0.42, z + 0.54], [x, y, z + 0.54]])} fill={shade("#8a5f3a", -0.2)} />
      <circle cx={(x + 0.78 - y - 0.2) * HALF_W} cy={(x + 0.78 + y - 0.2) * HALF_H - px(z) - 8} r={7} fill="#5a3f28" />
      <circle cx={(x + 0.78 - y + 0.24) * HALF_W} cy={(x + 0.78 + y + 0.24) * HALF_H - px(z) - 8} r={7} fill="#5a3f28" />
    </g>
  );
}

/**
 * A timber bridge over the river, on the line of the track down to the ford.
 * Without it the water reads as a painted stripe rather than something the
 * village has to solve.
 */
function FordBridge() {
  const cx = 7.4;
  const y0 = riverY(cx);
  const half = 1.15;
  const w = 0.8;
  const yA = y0 - half;
  const yB = y0 + half;
  const deck = 0.42;
  return (
    <g>
      {/* stone abutments on each bank */}
      <polygon points={P([[cx - 0.1, yA - 0.2, 0], [cx + w, yA - 0.2, 0], [cx + w, yA + 0.1, 0], [cx - 0.1, yA + 0.1, 0]])} fill={STONE} />
      <polygon points={P([[cx - 0.1, yB - 0.1, 0], [cx + w, yB - 0.1, 0], [cx + w, yB + 0.2, 0], [cx - 0.1, yB + 0.2, 0]])} fill={STONE} />

      {/* deck, arched very slightly by stepping the planks */}
      {Array.from({ length: 7 }, (_, i) => {
        const t0 = yA + ((yB - yA) * i) / 7;
        const t1 = yA + ((yB - yA) * (i + 1)) / 7;
        const lift = 0.5 * (1 - Math.pow((i + 0.5) / 7 - 0.5, 2) * 4);
        return (
          <polygon
            key={i}
            points={P([[cx, t0, deck + lift], [cx + w, t0, deck + lift], [cx + w, t1, deck + lift], [cx, t1, deck + lift]])}
            fill={i % 2 ? "#a5793f" : "#966c38"}
          />
        );
      })}
      {/* stringers under the deck */}
      <polygon points={P([[cx - 0.06, yA, deck - 0.12], [cx, yA, deck - 0.12], [cx, yB, deck - 0.12], [cx - 0.06, yB, deck - 0.12]])} fill="#7a5636" />
      <polygon points={P([[cx + w, yA, deck - 0.12], [cx + w + 0.06, yA, deck - 0.12], [cx + w + 0.06, yB, deck - 0.12], [cx + w, yB, deck - 0.12]])} fill="#7a5636" />

      {/* handrails */}
      {[cx - 0.02, cx + w + 0.02].map((rx, i) => (
        <g key={i}>
          <path d={L([[rx, yA, deck + 0.42], [rx, yB, deck + 0.42]], false)} stroke="#7a5636" strokeWidth={2.4} />
          {[0, 1, 2, 3].map((k) => {
            const py = yA + ((yB - yA) * k) / 3;
            const lift = 0.5 * (1 - Math.pow(k / 3 - 0.5, 2) * 4);
            return <path key={k} d={L([[rx, py, deck + lift], [rx, py, deck + 0.46 + lift]], false)} stroke="#7a5636" strokeWidth={2} />;
          })}
        </g>
      ))}
    </g>
  );
}

/** A plot waiting to be built. */
function Plot({ x, y, state, tint, onClick, label }) {
  const base = state === PLOT.WILD ? shade(tint, -0.1) : "#c9b48c";
  return (
    <g onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }} role={onClick ? "button" : undefined} aria-label={label}>
      <polygon
        points={pts([[x, y, 0.04], [x + 1.7, y, 0.04], [x + 1.7, y + 1.5, 0.04], [x, y + 1.5, 0.04]])}
        fill={base}
        stroke={shade(base, -0.26)}
        strokeWidth={1.2}
        strokeDasharray={state === PLOT.WILD ? "4 3" : undefined}
        opacity={0.9}
      />
      {state === PLOT.WILD && (
        <g>
          <Tree x={x + 0.25} y={y + 0.25} scale={0.7} color={tint} light={shade(tint, 0.22)} kind="round" />
          <Tree x={x + 0.95} y={y + 0.8} scale={0.55} color={tint} light={shade(tint, 0.22)} kind="conifer" />
          <Bush x={x + 0.7} y={y + 0.3} scale={0.9} color={tint} />
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Gameplay plots, hand-placed so the settlement reads as a place: the castle
 * complex is up on the hill at the back, the houses pack along the lane on
 * either side of the river, and the working buildings sit where they belong.
 */
const LAYOUT = {
  greenwoodcastle: [1.8, 1.6, 1.5, true],
  cottage: [4.6, 4.4, 0, false],
  bakery: [6.0, 2.6, 0, false],
  well: [3.4, 6.0, 0, false],
  market: [7.0, 6.6, 0, false],
  schoolhouse: [10.6, 3.2, 0, false],
  townhall: [9.6, 6.6, 0, false],

  rivercastle: [1.8, 1.6, 1.5, true],
  dock: [12.6, 10.6, 0, false],
  mill: [6.2, 5.4, 0, false],
  bridge: [7.4, 9.6, 0, false],
  fishery: [11.0, 10.4, 0, false],
  inn: [5.0, 2.4, 0, false],

  highlandcastle: [1.8, 1.6, 1.5, true],
  watchtower: [5.4, 3.4, 0, false],
  barracks: [7.2, 5.2, 0, false],
  chapel: [11.0, 2.2, 0, false],
  greatkeep: [5.6, 1.8, 0, false],

  crystalcastle: [1.8, 1.6, 1.5, true],
  mine: [5.6, 2.8, 0, false],
  gemcutter: [6.0, 4.6, 0, false],
  bridgeoflight: [7.4, 9.6, 0, false],
  cathedral: [4.6, 1.6, 0, false],

  dragoncastle: [1.8, 1.6, 1.5, true],
  camp: [5.8, 3.2, 0, false],
  lair: [6.4, 5.0, 0, false],
  observatory: [11.2, 2.0, 0, false],
  throne: [5.0, 2.2, 0, false],
};

// Filler cottages: [x, y, w, d, wallHeight, variant].
//
// Hand-placed and deterministic so the village looks the same every visit — a
// child should recognise their own street. They are spread along BOTH grid axes
// (not in rows at a constant y, which reads as diagonal stripes) so the whole
// island diamond fills: an upper terrace to the right of the castle, a lane
// along the road, a few on the far left edge, and a terrace on the far bank.
const FILLER = [
  // upper terrace, right of the castle hill
  [5.8, 1.8, 1.3, 1.1, 0.75, 0], [7.2, 2.0, 1.2, 1.1, 0.7, 1],
  [8.6, 1.8, 1.3, 1.1, 0.8, 2], [10.0, 2.0, 1.2, 1.1, 0.7, 3],
  [11.4, 1.8, 1.3, 1.1, 0.75, 4], [12.8, 2.0, 1.2, 1.1, 0.7, 5],
  // second row, still north of the lane
  [5.2, 3.3, 1.3, 1.1, 0.75, 6], [6.6, 3.5, 1.2, 1.1, 0.7, 0],
  [8.0, 3.3, 1.3, 1.1, 0.8, 1], [9.4, 3.5, 1.2, 1.1, 0.7, 2],
  [10.8, 3.3, 1.3, 1.1, 0.75, 3], [12.2, 3.5, 1.2, 1.1, 0.7, 4],
  [13.4, 3.2, 1.0, 1.0, 0.7, 5],
  // left edge, either side of where the lane begins
  [1.1, 4.8, 1.2, 1.1, 0.7, 6], [1.3, 6.5, 1.2, 1.1, 0.7, 0],
  [2.9, 6.9, 1.2, 1.1, 0.7, 1],
  // lane frontage, on the south side of the road
  [4.2, 6.7, 1.3, 1.1, 0.75, 2], [5.6, 6.9, 1.2, 1.1, 0.7, 3],
  [7.0, 6.7, 1.3, 1.1, 0.8, 4], [8.4, 6.9, 1.2, 1.1, 0.7, 5],
  [9.8, 6.7, 1.3, 1.1, 0.75, 6], [11.2, 6.9, 1.2, 1.1, 0.7, 0],
  [12.6, 6.7, 1.2, 1.1, 0.7, 1],
  // far bank, north of the water
  [1.6, 11.3, 1.2, 1.1, 0.7, 2], [3.2, 11.3, 1.2, 1.1, 0.75, 3],
  [4.8, 11.3, 1.2, 1.1, 0.7, 4], [6.4, 11.3, 1.2, 1.1, 0.7, 5],
  [8.0, 11.3, 1.2, 1.1, 0.75, 6], [9.6, 11.3, 1.2, 1.1, 0.7, 0],
  [11.2, 11.3, 1.2, 1.1, 0.7, 1], [12.9, 11.3, 1.1, 1.0, 0.7, 2],
];

// A farmed terrace along the near edge, below the far-bank cottages.
const FIELDS = [
  [1.4, 12.8, 2.0, 1.0, "#8fa845"],
  [4.2, 12.82, 2.1, 1.0, "#a9a044"],
  [7.0, 12.8, 2.0, 1.0, "#b09340"],
  [9.8, 12.82, 2.0, 1.0, "#8fa845"],
  [12.4, 12.8, 1.3, 1.0, "#a9a044"],
];

const PROPS = [
  { kind: "stall", x: 6.6, y: 7.9, awning: "#c1503f" },
  { kind: "stall", x: 7.5, y: 7.8, awning: "#4a6fa5" },
  { kind: "stall", x: 7.1, y: 8.4, awning: "#d98a3c" },
  { kind: "cart", x: 4.6, y: 6.3 },
  { kind: "cart", x: 10.8, y: 6.3 },
  { kind: "cart", x: 2.4, y: 11.2 },
  { kind: "hay", x: 4.4, y: 8.2 },
  { kind: "hay", x: 10.2, y: 8.3 },
  { kind: "hay", x: 6.0, y: 8.1 },
  { kind: "hedge", x: 3.9, y: 12.95, len: 0.9 },
  { kind: "hedge", x: 6.7, y: 12.95, len: 0.9 },
  { kind: "hedge", x: 9.5, y: 12.95, len: 0.9 },
  { kind: "hedge", x: 0.8, y: 9.4, len: 2.2 },
  { kind: "hedge", x: 13.4, y: 9.4, len: 1.4 },
  { kind: "hedge", x: 5.2, y: 4.5, len: 2.4 },
  { kind: "fence", x: 2.6, y: 4.5, len: 1.8 },
  { kind: "fence", x: 6.8, y: 4.5, len: 1.8 },
];

// Footprint of each loose prop, used for collision.
const PROP_SIZE = {
  stall: [1.3, 0.8],
  cart: [0.9, 0.6],
  hay: [0.9, 0.7],
  fence: [0, 0.3],
  hedge: [0, 0.8],
};

/** Footprint of a drawn plot marker, in grid units. */
const PLOT_SIZE = [2.0, 1.8];

/**
 * Resolve decorative placement for a territory.
 *
 * The gameplay plots move per territory, so this cannot be hand-tuned once — it
 * has to run at render time. Everything is compared as an axis-aligned footprint
 * (the grid stays invisible to the player, but collision maths still needs one).
 * Order matters: plots win, then crofts (which are land, not objects), then
 * cottages, then loose props. Anything that would land on something already
 * placed is dropped rather than drawn overlapping.
 */
function resolvePlacements(plotSpots) {
  const rect = (x, y, w, d) => ({ cx: x + w / 2, cy: y + d / 2, w, d });
  const hits = (a, b, m = 0.08) =>
    Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 + m &&
    Math.abs(a.cy - b.cy) < (a.d + b.d) / 2 + m;

  const placed = plotSpots.map(([x, y]) => rect(x - 0.1, y - 0.1, PLOT_SIZE[0], PLOT_SIZE[1]));

  // 1. Crofts. Land, so they get first refusal after the plots.
  const cottageRects = FILLER.map(([x, y, w, d]) => rect(x, y, w, d));
  const fields = FIELDS.filter(([x, y, w, d]) => {
    const r = rect(x, y, w, d);
    return !placed.some((p) => hits(r, p)) && !cottageRects.some((c) => hits(r, c));
  });
  const fieldRects = fields.map(([x, y, w, d]) => rect(x, y, w, d));

  // 2. Cottages, in listed order.
  const fillers = [];
  FILLER.forEach(([x, y, w, d, h, seed]) => {
    const r = rect(x, y, w, d);
    if (placed.some((p) => hits(r, p))) return;
    if (fieldRects.some((f) => hits(r, f))) return;
    placed.push(r);
    fillers.push([x, y, w, d, h, seed]);
  });

  // 3. Loose props, which are small and yield to everything.
  const props = [];
  for (const p of PROPS) {
    const [dw, dd] = PROP_SIZE[p.kind] || [1.2, 0.8];
    const r = rect(p.x, p.y, p.len || dw, dd);
    if (placed.some((q) => hits(r, q))) continue;
    if (fieldRects.some((f) => hits(r, f))) continue;
    placed.push(r);
    props.push(p);
  }

  return { fillers, props, fields };
}

export default function IsoVillage({ kingdomId, built = {}, onSelectPlot, companion }) {
  const kingdom = useMemo(() => KINGDOMS.find((k) => k.id === kingdomId) || KINGDOMS[0], [kingdomId]);
  const t = GROUND[kingdom.theme] || GROUND.forest;

  // Decorative pieces first, resolved against this territory's gameplay plots,
  // then vegetation placed in whatever gaps are left.
  const layout = useMemo(() => {
    const spots = kingdom.buildings.map((b) => LAYOUT[b.id] || [5, 3, 0]);
    return resolvePlacements(spots);
  }, [kingdom.buildings]);

  // Vegetation is dense but deterministic, and kept clear of the plots, the
  // river, the roads and the crofts so nothing overlaps a building.
  const scenery = useMemo(() => {
    const spots = kingdom.buildings.map((b) => LAYOUT[b.id] || [5, 3, 0]);
    const blocked = (x, y) => {
      // Keep-out radii are the drawn footprint plus a little breathing room.
      // Too generous and the island ends up bare between the buildings, which
      // is the opposite of the packed, lived-in look we want.
      for (const [px, py] of spots) if (Math.abs(x - px) < 1.7 && Math.abs(y - py) < 1.6) return true;
      for (const [fx, fy, fw, fd] of layout.fields) {
        if (x > fx - 0.25 && x < fx + fw + 0.25 && y > fy - 0.25 && y < fy + fd + 0.25) return true;
      }
      for (const [cx, cy] of layout.fillers) {
        if (Math.abs(x - cx) < 1.15 && Math.abs(y - cy) < 1.1) return true;
      }
      for (const p of layout.props) {
        const w = p.len || 1.2;
        if (Math.abs(x - p.x) < 0.8 + w * 0.4 && Math.abs(y - p.y) < 0.9) return true;
      }
      if (x > 0.4 && x < N - 0.4 && y > 0.4 && y < N - 0.4) {
        if (Math.abs(y - riverY(x)) < 1.35) return true;
        if (Math.abs(y - laneY(x)) < 0.85) return true;
      }
      return false;
    };

    let seed = kingdom.id * 7919 + 13;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    const trees = [];
    for (let i = 0; i < 4000 && trees.length < 150; i += 1) {
      const x = 0.3 + rnd() * (N - 0.6);
      const y = 0.3 + rnd() * (N - 0.6);
      if (blocked(x, y)) continue;
      trees.push({ x, y, s: 0.6 + rnd() * 0.6, kind: rnd() > 0.42 ? "round" : "conifer" });
    }
    const bushes = [];
    for (let i = 0; i < 2000 && bushes.length < 80; i += 1) {
      const x = 0.35 + rnd() * (N - 0.7);
      const y = 0.35 + rnd() * (N - 0.7);
      if (blocked(x, y)) continue;
      bushes.push({ x, y, s: 0.6 + rnd() * 0.6 });
    }
    const flowers = [];
    for (let i = 0; i < 1600 && flowers.length < 40; i += 1) {
      const x = 0.5 + rnd() * (N - 1);
      const y = 0.5 + rnd() * (N - 1);
      if (blocked(x, y)) continue;
      flowers.push({ x, y, c: ["#ffd76a", "#ff9ec4", "#ffffff", "#c8a8ff"][Math.floor(rnd() * 4)] });
    }
    return { trees, bushes, flowers };
  }, [kingdom.id, kingdom.buildings, layout]);

  const items = useMemo(() => {
    const out = [];
    const push = (x, y, node, bias = 0) => out.push({ depth: x + y + bias, node });

    for (const f of layout.fields) push(f[0] + f[2] / 2, f[1] + f[3] / 2, <Field x={f[0]} y={f[1]} w={f[2]} d={f[3]} crop={f[4]} />, -0.6);

    for (const tr of scenery.trees) {
      push(tr.x, tr.y, (
        <Tree x={tr.x} y={tr.y} scale={tr.s} kind={tr.kind} color={t.tree} light={t.treeLight} />
      ));
    }
    for (const b of scenery.bushes) push(b.x, b.y, <Bush x={b.x} y={b.y} scale={b.s} color={t.tree} />);
    for (const f of scenery.flowers) push(f.x, f.y, <Flowers x={f.x} y={f.y} color={f.c} />);

    for (const [i, [x, y, w, d, h, seed]] of layout.fillers.entries()) {
      push(x, y, (
        <Cottage x={x} y={y} w={w} d={d} h={h} roof={ROOFS[i % ROOFS.length]} wall={WALLS[i % WALLS.length]} seed={seed} />
      ), 0.7);
    }

    for (const p of layout.props) {
      if (p.kind === "stall") push(p.x, p.y, <Stall x={p.x} y={p.y} awning={p.awning} />, 0.4);
      if (p.kind === "cart") push(p.x, p.y, <Cart x={p.x} y={p.y} />, 0.3);
      if (p.kind === "hay") push(p.x, p.y, <Haystack x={p.x} y={p.y} s={0.75} />, 0.3);
      if (p.kind === "fence") push(p.x, p.y, <Fence x={p.x} y={p.y} len={p.len} />, 0.1);
      if (p.kind === "hedge") push(p.x, p.y, <Hedge x={p.x} y={p.y} len={p.len} />, 0.1);
    }

    // The bridge spans the water, so it sorts by the near bank.
    push(7.4, riverY(7.4) - 1.2, <FordBridge />, 0.2);

    for (const b of kingdom.buildings) {
      const [x, y, z] = LAYOUT[b.id] || [5, 3, 0];
      const state = plotState(built, b.id);
      if (state === PLOT.BUILT) {
        push(x, y, (
          <g>
            <polygon
              points={pts([[x - 0.2, y - 0.2, z + 0.012], [x + 2.1, y - 0.2, z + 0.012], [x + 2.1, y + 1.9, z + 0.012], [x - 0.2, y + 1.9, z + 0.012]])}
              fill="#1c2a18"
              opacity={0.22}
            />
            <g transform={`translate(${HALF_W * (x - y)}, ${HALF_H * (x + y) - z * 40})`}>
              <IsoBuildingShapes id={b.id} />
            </g>
          </g>
        ), 1.4);
      } else {
        push(x, y, (
          <Plot
            x={x}
            y={y}
            state={state}
            tint={t.tree}
            onClick={onSelectPlot ? () => onSelectPlot(b) : undefined}
            label={`${state === PLOT.WILD ? "Wild land" : "Cleared land"} — ${b.name}`}
          />
        ), 0.5);
      }
    }

    out.sort((a, b) => a.depth - b.depth);
    return out;
  }, [kingdom, built, scenery, layout, onSelectPlot, t]);

  const builtCount = kingdom.buildings.filter((b) => plotState(built, b.id) === PLOT.BUILT).length;

  return (
    <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", position: "relative", boxShadow: "var(--shadow)" }}>
      <svg
        viewBox={`${-WIDTH / 2 - 26} -150 ${WIDTH + 52} 680`}
        width="100%"
        style={{ display: "block" }}
        role="img"
        aria-label={`${kingdom.name}, ${builtCount} of ${kingdom.buildings.length} buildings built`}
      >
        <defs>
          <radialGradient id={`iso-sky-${kingdom.theme}`} cx="0.5" cy="0.28" r="0.85">
            <stop offset="0%" stopColor={shade(t.a, 0.5)} />
            <stop offset="100%" stopColor={shade(t.a, 0.06)} />
          </radialGradient>
        </defs>

        <rect
          x={-WIDTH / 2 - 26}
          y={-150}
          width={WIDTH + 52}
          height={680}
          fill={`url(#iso-sky-${kingdom.theme})`}
        />

        <Island t={t} />
        <CastleHill t={t} />
        <River t={t} />
        <Roads />

        {items.map((it, i) => (
          <g key={i}>{it.node}</g>
        ))}

        {companion && (
          <g
            style={{ animation: "ks-float 4s ease-in-out infinite" }}
            transform={`translate(${HALF_W * (5.2 - 6.6)}, ${HALF_H * (5.2 + 6.6) - 12})`}
          >
            <PetArt id={companion} size={56} label="Your companion" />
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
