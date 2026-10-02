// The land: coastline, relief, water and roads.
//
// This is what stops the kingdom reading as a square board. Nothing here draws
// a tile. The ground is one irregular closed outline with a soil-and-rock crust
// at the cut edge; relief is painted as soft raised mounds; the river is a
// band of varying width; the roads are curves that fork and meet in a plaza.

import { shade } from "../iso";
import {
  P, L, blob, catmull, ribbon, screenPts, screenRing, dropRing, shrink, fbm2, rng, px,
} from "./geometry";

// How thick the land's cut edge is, in screen pixels.
export const CRUST = 46;

export const N = 15;
const MID = N / 2;

/**
 * The coastline. A wobbling ring inside the playfield, so the visible land is
 * an organic island and the square grid stays entirely internal.
 */
export function coastline(seed) {
  return blob(MID, MID, MID * 0.94, { seed, wobble: 0.16, lobes: 11, steps: 7 });
}

/** Is a grid point on land? Used to clip scatter and keep the sea honest. */
export function makeLandTest(coast) {
  return (x, y) => {
    let inside = false;
    for (let i = 0, j = coast.length - 1; i < coast.length; j = i, i += 1) {
      const [xi, yi] = coast[i];
      const [xj, yj] = coast[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

// ---------------------------------------------------------------------------
// Relief
// ---------------------------------------------------------------------------

/**
 * Raised ground. Each mound is a closed blob with a shaded skirt and a flat
 * top, which is how a painter suggests a hill in a fixed isometric view.
 * `terrainZ` reads the same list, so objects sit on the surface instead of
 * floating above or sinking into it.
 */
export function makeRelief(theme, seed) {
  const hills = [
    // The castle mound: the highest ground, at the back of the map, so the
    // keep dominates everything in front of it.
    { cx: 4.6, cy: 3.4, r: 3.5, h: 1.55, key: true },
    // A second rise on the far side, to stop the land reading as one dome.
    { cx: 11.2, cy: 2.6, r: 2.6, h: 0.62 },
    { cx: 3.2, cy: 9.4, r: 3.1, h: 0.4 },
    { cx: 12.4, cy: 8.8, r: 2.4, h: 0.34 },
  ];
  const out = hills.map((h, i) => ({
    ...h,
    ring: blob(h.cx, h.cy, h.r, { seed: seed * 31 + i * 7, wobble: 0.2, lobes: 8, steps: 6 }),
  }));
  return {
    hills: out,
    /** Elevation at a grid point, in grid-height units. */
    at(x, y) {
      let z = 0;
      for (const h of out) {
        const d = Math.hypot(x - h.cx, y - h.cy) / h.r;
        if (d < 1) z += h.h * (1 - d * d) * (3 - 2 * d) ** 0.5;
      }
      // A little rolling noise so the flats are never dead level.
      z += (fbm2(x * 0.34, y * 0.34, seed) - 0.5) * 0.16;
      return Math.max(0, z);
    },
  };
}

// ---------------------------------------------------------------------------
// The land itself
// ---------------------------------------------------------------------------

/**
 * Ground cover: the tonal patchwork that stops the island being one flat fill.
 *
 * The island used to be a single `p.grass` polygon under everything, which is
 * why the land read as a board: not because the shape was wrong but because
 * there was nothing on it to look at. Real ground is mown here, rough there,
 * bare on the ridge, damp beside the water - and those changes are what tell the
 * eye the ground has depth before a single building is placed on it.
 *
 * Every patch is a blob, never a quad, for the reason the fields were changed:
 * an axis-parallel quad is the one shape that reveals the underlying cell grid.
 * All patches are drapes of flat fill on the ground plane, drawn inside
 * `<Terrain>` before the river, roads and buildings, so depth-sorting is not
 * involved and there is nothing to invert.
 */
function GroundCover({ p, coast, mid, seed }) {
  const rand = rng(seed + 91);
  const onLand = makeLandTest(coast);
  // Kept clear of the settlement core: the village green is mown turf, and a
  // tussocky patch under the market square reads as a mistake.
  const KEEP_CLEAR = [
    { x: 7.6, y: 6.3, r: 2.6 }, // plaza and its buildings
    { x: 4.6, y: 3.4, r: 3.0 }, // castle mound
  ];
  const patches = [];
  // Several passes at falling radius, coarse to fine. Coarse patches give the
  // island large regions of tone; fine ones break up the seams between them.
  for (const [count, rMin, rMax] of [[26, 1.1, 2.9], [40, 0.5, 1.1], [54, 0.22, 0.5]]) {
    for (let i = 0; i < count * 14; i += 1) {
      const cx = mid + (rand() - 0.5) * mid * 2.1;
      const cy = mid + (rand() - 0.5) * mid * 2.1;
      if (!onLand(cx, cy)) continue;
      const r = rMin + rand() * (rMax - rMin);
      // Keep patches fully inland of the coast so none of them poke out into
      // the sea and break the silhouette.
      let clear = true;
      for (let k = 0; k < 12 && clear; k += 1) {
        const a = (k / 12) * Math.PI * 2;
        if (!onLand(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 1.15)) clear = false;
      }
      if (!clear) continue;
      for (const c of KEEP_CLEAR) {
        if (Math.hypot(cx - c.x, cy - c.y) < c.r) { clear = false; break; }
      }
      if (!clear) continue;
      // The patch's own noise decides its tone, so neighbouring patches of the
      // same family still differ, and the distribution is not striped.
      const v = fbm2(cx * 0.42, cy * 0.42, seed + 5);
      let fill;
      if (v < 0.42) fill = shade(p.grassDark, -0.06); // rough, tussocky grass
      else if (v < 0.56) fill = shade(p.grass, 0.1); // pale dry meadow
      else if (v < 0.66) fill = "#b8a25e"; // sun-bleached stubble
      else if (v < 0.74) fill = shade(p.oak, 0.16); // moss and clover
      else fill = p.grass;
      patches.push({ cx, cy, r, fill, v });
      if (patches.length >= count) break;
    }
  }
  // Coarse before fine, so a small patch is never buried under a large one that
  // was painted after it.
  patches.sort((a, b) => b.r - a.r);
  return (
    <g data-role="ground-cover">
      {patches.map((q, i) => (
        <polygon
          key={i}
          points={screenRing(blob(q.cx, q.cy, q.r, { seed: seed * 5 + i * 11, wobble: 0.34, lobes: 9, steps: 6 }))}
          fill={q.fill}
          opacity={q.r > 1 ? 0.5 : q.r > 0.4 ? 0.36 : 0.28}
        />
      ))}
    </g>
  );
}

export function Terrain({ p, coast, relief, mid, seed = 1 }) {
  const ring = screenRing(coast, 0);

  return (
    <g data-role="terrain">
      {/* rock, then soil, then grass: a cut edge that reads as a landmass */}
      <polygon points={dropRing(ring, CRUST)} fill={p.rock} />
      <polygon points={dropRing(ring, CRUST * 0.55)} fill={p.soil} />
      <polygon points={ring} fill={p.grass} />

      {/* a pale fringe of shingle just inside the cut, so the coast isn't a
          hard line where grass meets soil */}
      <polygon points={screenRing(shrink(coast, 0.965, mid, mid))} fill={shade(p.grass, 0.14)} />

      <GroundCover p={p} coast={coast} mid={mid} seed={seed} />

      <polygon points={ring} fill="none" stroke={p.grassDark} strokeWidth={1.6} opacity={0.55} />

      {relief.hills.map((h, i) => (
        <Hillside key={i} h={h} p={p} />
      ))}
    </g>
  );
}

/**
 * A mound.
 *
 * This was two flat fills - one skirt, one top - which is enough to say "there
 * is a hill here" and not enough to say it has a shape. The light comes from
 * the upper left, so the two slopes of every hill differ, and the crest needs a
 * highlight to read as an edge rather than a seam.
 *
 * The bands are contour rings lifted by height, not decoration: they sit at
 * fractions of `h`, so they stay correct if the hill's height changes.
 */
function Hillside({ h, p }) {
  const base = screenRing(h.ring, 0);
  const top = screenRing(h.ring, px(h.h));
  // Skirt: the outline wrapped twice, so the band between them is the slope.
  const skirt = `${base} ${top.split(" ").reverse().join(" ")}`;
  const bands = [];
  const BANDS = 4;
  for (let i = 1; i <= BANDS; i += 1) {
    const t = i / (BANDS + 1);
    bands.push({
      t,
      points: screenRing(shrink(h.ring, 1 - t * 0.86, h.cx, h.cy), px(h.h * t)),
    });
  }
  return (
    <g data-role="hill" data-h={h.h.toFixed(2)}>
      <polygon points={skirt} fill={shade(p.grass, -0.13)} />
      {/* the sunward flank, lifted a little more than the shaded one */}
      <polygon
        points={`${base} ${screenRing(h.ring, px(h.h * 0.5)).split(" ").reverse().join(" ")}`}
        fill={shade(p.grass, 0.04)}
        opacity={0.5}
      />
      {bands.map((b, i) => (
        <polygon
          key={i}
          points={b.points}
          fill={i % 2 ? shade(p.grass, 0.06) : shade(p.grass, -0.03)}
          opacity={0.45}
        />
      ))}
      <polygon points={top} fill={shade(p.grass, 0.07)} />
      {/* crest highlight: the top outline, brightened, where it catches light */}
      <polygon
        points={screenRing(shrink(h.ring, 0.82, h.cx, h.cy), px(h.h))}
        fill={shade(p.grass, 0.15)}
        opacity={0.5}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

/**
 * The river. A single curve sampled into a band whose width swells and
 * narrows, with a damp bank either side. The banks are what sell it: a river
 * with a clean edge reads as a painted stripe.
 */
export function makeRiver(seed) {
  return catmull(
    [
      [-1.2, 6.4],
      [1.6, 7.4],
      [4.4, 7.0],
      [6.8, 8.2],
      [9.2, 9.4],
      [12.0, 9.0],
      [14.2, 10.2],
      [16.6, 10.0],
    ],
    14,
  );
}

const riverWidth = (t) => 0.62 + Math.sin(t * Math.PI) * 0.5 + Math.sin(t * 7.3) * 0.12;

export function River({ p, path: riverPath }) {
  return (
    <g data-role="river">
      {/* damp, marshy ground either side of the water */}
      <polygon points={screenPts(ribbon(riverPath, (t) => riverWidth(t) + 0.75, 0))} fill={shade(p.grassDark, 0.1)} opacity={0.5} />
      <polygon points={screenPts(ribbon(riverPath, (t) => riverWidth(t) + 0.3, 0))} fill={shade(p.grass, -0.12)} opacity={0.55} />
      {/* the water itself, deep in the middle */}
      <polygon points={screenPts(ribbon(riverPath, riverWidth, 0))} fill={p.waterDeep} />
      <polygon points={screenPts(ribbon(riverPath, (t) => riverWidth(t) * 0.72, 0))} fill={p.water} />
      <polygon points={screenPts(ribbon(riverPath, (t) => riverWidth(t) * 0.3, 0))} fill={p.waterLight} opacity={0.7} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------

/**
 * The road network. One road enters at the south-west gate, winds up to the
 * market square, and forks: a branch climbs to the castle, another runs east
 * along the lane, and a track drops to the bridge. Nothing follows a grid line.
 */
/**
 * The road network. One road enters at the south-west gate, winds up to the
 * market square, and forks: a branch climbs to the castle, another runs east
 * along the lane, and a track drops to the bridge.
 *
 * These control points used to be nearly collinear - they described a gentle
 * diagonal, and the scene audit measured the resulting lanes at 9 to 33 degrees
 * of total turning, so they drew as straight lines with a slight bend and the
 * map read as a diagram with paths on it. A country lane wanders because it
 * follows field boundaries, hedges and water; the control points now do too,
 * with each leg pushed sideways off the straight line between its neighbours.
 * Nothing follows a grid line, and no leg is parallel to another.
 */
export function makeRoads() {
  // The lane enters at the south-west gate, runs east along the southern
  // boundary, climbs the gap between two fields, passes west of the square and
  // comes in over its northern side. Long legs between reversals, so it reads as
  // a route between places rather than a squiggle.
  const lane = catmull(
    // Endpoints sit inside the coast, checked with makeLandTest rather than by
    // eye: a road that relies on the land clip to hide its tail still renders as
    // a road stopping in open water, and whether that happens depends on the
    // kingdom's seed. These are the most seaward points that stayed dry for every
    // seed sampled, with the lane's half-width to spare.
    [
      [1.2, 11.6],
      [2.8, 13.2],
      [5.6, 13.4], // along the southern boundary, below the fields
      [7.4, 12.6],
      [8.0, 10.6], // climbs north up the gap between two fields
      [7.4, 8.6],
      [5.8, 7.9], // bends west of the square
      [3.9, 8.2],
      [2.4, 7.2],
      [2.0, 5.6], // and round the north-west shoulder
      [4.0, 4.4],
      [6.6, 4.0],
      [8.8, 4.3], // approaching the square from the north
      [10.4, 5.5],
      [11.8, 6.3],
      [13.4, 5.9], // and out to the east edge, short of the water
    ],
    14,
  );
  const castleSpur = catmull(
    [[6.9, 5.9], [6.0, 5.5], [5.5, 4.6], [4.6, 4.3], [4.0, 3.5], [3.7, 2.8]],
    12,
  );
  const bridgeTrack = catmull(
    [[7.3, 6.8], [6.9, 7.7], [7.5, 8.3], [7.1, 9.4], [7.7, 10.3], [7.2, 11.4]],
    12,
  );
  // The farm track leaves the lane and serves the two western fields, doubling
  // back along the headland before dropping to their gates so it reads as a track
  // rather than a stub.
  const farmTrack = catmull(
    [
      [6.4, 11.5], [5.2, 12.2], [4.0, 12.6], [2.8, 12.3],
      [2.2, 11.6], [2.5, 10.9], [3.1, 10.4],
    ],
    10,
  );
  return { lane, castleSpur, bridgeTrack, farmTrack };
}

function RoadBand({ pts, w, p, name }) {
  return (
    <g data-role="road" data-road={name}>
      <polygon points={screenPts(ribbon(pts, w + 0.14, 0))} fill={p.roadEdge} opacity={0.85} />
      <polygon points={screenPts(ribbon(pts, w, 0))} fill={p.road} />
      <polygon points={screenPts(ribbon(pts, (t) => w * (0.42 + t * 0.1), 0))} fill={shade(p.road, 0.16)} opacity={0.8} />
    </g>
  );
}

export function Roads({ p, roads, paved }) {
  // Roads are dirt early and stone once the settlement is established, so the
  // kingdom visibly improves as the player builds.
  const road = paved ? { ...p, road: "#c9c2b2", roadEdge: "#8f8879" } : p;
  return (
    <g>
      <RoadBand pts={roads.lane} w={0.52} p={road} name="lane" />
      <RoadBand pts={roads.castleSpur} w={0.4} p={road} name="castle-spur" />
      <RoadBand pts={roads.bridgeTrack} w={0.34} p={road} name="bridge-track" />
      <RoadBand pts={roads.farmTrack} w={0.3} p={road} name="farm-track" />
    </g>
  );
}

/** A worn plaza where the lanes meet — the visual centre of the settlement. */
export function Plaza({ x, y, p, r = 2.1 }) {
  const ring = blob(x, y, r, { seed: 91, wobble: 0.14, lobes: 9, steps: 6 });
  return (
    <g data-role="plaza" data-gx={x} data-gy={y}>
      <polygon points={screenRing(ring)} fill={shade(p.road, -0.1)} />
      <polygon points={screenRing(blob(x, y, r * 0.86, { seed: 91, wobble: 0.14, lobes: 9, steps: 6 }))} fill={p.road} />
    </g>
  );
}

/** A stone bridge where the road crosses the river. */
/**
 * A stone bridge where the road crosses the river.
 *
 * This was the last holder of the grid: two abutment slabs and nine deck steps,
 * every one of them an exact axis-parallel rectangle in grid space, which the
 * scene audit counted as three offending quads. The deck is genuinely a straight
 * span, but a real one tapers and its stones are rough, and the abutments are
 * cut masonry shoulders, not rectangles - so the fix is to draw masonry rather
 * than to shrink the shapes under the area floor. Nothing here is scaled down
 * to dodge the check.
 *
 * The deck tapers: widest at the abutments, narrowest at the crown. That is both
 * how an arch carries load and what guarantees no single step is exactly
 * axis-parallel.
 */
export function Bridge({ x, y, p, span = 2.5, deck = 0.46 }) {
  const w = 0.9;
  const yA = y - span / 2;
  const yB = y + span / 2;
  const arch = (t) => Math.sin(t * Math.PI) * 0.22;
  /** Half-width at position t along the span: tapers toward the crown. */
  const halfAt = (t) => (w / 2) * (1 - Math.sin(t * Math.PI) * 0.16);
  const mid = x + w / 2;
  /** A rough masonry shoulder: jittered outline, not a slab. */
  const abutment = (ay0, ay1, seed, flip) => {
    const pts = [];
    const n = 7;
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const yy = ay0 + (ay1 - ay0) * t;
      // Both long edges wander; the outer end sits proud of the bank.
      const wob = Math.sin(t * 6.1 + seed) * 0.05 + Math.sin(t * 11 + seed * 2) * 0.028;
      pts.push([x - 0.18 - wob, yy + (i === n || i === 0 ? 0 : 0)]);
    }
    for (let i = n; i >= 0; i -= 1) {
      const t = i / n;
      const yy = ay0 + (ay1 - ay0) * t;
      const wob = Math.sin(t * 5.3 + seed * 1.7) * 0.055 + Math.sin(t * 13 + seed) * 0.03;
      pts.push([x + w + 0.18 + wob, yy + flip * (t > 0.8 ? 0.06 : 0)]);
    }
    return pts;
  };
  const STEPS = 9;
  return (
    <g data-role="bridge">
      {/* abutments: cut masonry shoulders where the deck meets each bank */}
      <polygon points={P(abutment(yA - 0.3, yA + 0.12, 1.3, 1))} fill={p.stoneDark} />
      <polygon points={P(abutment(yB - 0.12, yB + 0.3, 4.1, -1))} fill={p.stone} />
      {/* coursed stone on the near face of each abutment, so the shoulder has
          joints rather than being one flat colour */}
      {[0.2, 0.55, 0.82].map((t, i) => (
        <path
          key={i}
          d={L([
            [x - 0.16, yA - 0.3 + 0.42 * t, 0.02],
            [x + w + 0.16, yA - 0.3 + 0.42 * t, 0.02],
          ], false)}
          stroke={shade(p.stoneDark, -0.18)}
          strokeWidth={1.1}
          opacity={0.55}
        />
      ))}
      {/* arched deck, stepped so the arch reads, and tapered toward the crown */}
      {Array.from({ length: STEPS }, (_, i) => {
        const t0 = i / STEPS;
        const t1 = (i + 1) / STEPS;
        const h0 = halfAt(t0);
        const h1 = halfAt(t1);
        return (
          <polygon
            key={i}
            points={P([
              [mid - h0, yA + span * t0, deck + arch(t0)],
              [mid + h0, yA + span * t0, deck + arch(t0)],
              [mid + h1, yA + span * t1, deck + arch(t1)],
              [mid - h1, yA + span * t1, deck + arch(t1)],
            ])}
            fill={i % 2 ? p.stone : p.stoneLight}
          />
        );
      })}
      {/* the arch's voussoirs, marked on the near flank */}
      {Array.from({ length: 7 }, (_, i) => {
        const t = (i + 0.5) / 7;
        const gy = yA + span * t;
        return (
          <path
            key={i}
            d={L([[mid - halfAt(t), gy, deck + arch(t)], [mid + halfAt(t), gy, deck + arch(t)]])}
            stroke={shade(p.stoneDark, -0.1)}
            strokeWidth={1}
            opacity={0.4}
          />
        );
      })}
      {/* parapets, following the same taper as the deck */}
      {[0, 1].map((side) => (
        <g key={side}>
          <path
            d={L(
              Array.from({ length: 10 }, (_, i) => {
                const t = i / 9;
                return [mid + (side ? 1 : -1) * halfAt(t), yA + span * t, deck + arch(t)];
              }),
              false,
            )}
            stroke={p.stoneDark}
            strokeWidth={3.4}
            strokeLinecap="round"
          />
          {[0.1, 0.35, 0.6, 0.85].map((t, k) => (
            <path
              key={k}
              d={L([
                [mid + (side ? 1 : -1) * halfAt(t), yA + span * t, deck + arch(t)],
                [mid + (side ? 1 : -1) * halfAt(t), yA + span * t, deck + arch(t) + 0.34],
              ], false)}
              stroke={p.stoneDark}
              strokeWidth={2.8}
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
    </g>
  );
}
