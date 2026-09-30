// The land: coastline, relief, water and roads.
//
// This is what stops the kingdom reading as a square board. Nothing here draws
// a tile. The ground is one irregular closed outline with a soil-and-rock crust
// at the cut edge; relief is painted as soft raised mounds; the river is a
// band of varying width; the roads are curves that fork and meet in a plaza.

import { shade } from "../iso";
import {
  P, L, blob, catmull, ribbon, screenPts, screenRing, dropRing, shrink, fbm2, px,
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

export function Terrain({ p, coast, relief, mid }) {
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
      <polygon points={ring} fill="none" stroke={p.grassDark} strokeWidth={1.6} opacity={0.55} />

      {relief.hills.map((h, i) => (
        <Hillside key={i} h={h} p={p} />
      ))}
    </g>
  );
}

function Hillside({ h, p }) {
  const base = screenRing(h.ring, 0);
  const top = screenRing(h.ring, px(h.h));
  // Skirt: the outline wrapped twice, so the band between them is the slope.
  const skirt = `${base} ${top.split(" ").reverse().join(" ")}`;
  return (
    <g data-role="hill" data-h={h.h.toFixed(2)}>
      <polygon points={skirt} fill={shade(p.grass, -0.13)} />
      <polygon points={top} fill={shade(p.grass, 0.07)} />
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
export function makeRoads() {
  const lane = catmull(
    [
      [0.4, 12.2],
      [2.4, 10.2],
      [4.2, 8.6],
      [5.6, 7.4],
      [7.0, 6.4],
      [8.8, 5.6],
      [11.0, 5.0],
      [13.6, 4.6],
    ],
    14,
  );
  const castleSpur = catmull([[6.6, 6.0], [5.6, 5.0], [4.9, 4.2], [4.5, 3.6]], 12);
  const bridgeTrack = catmull([[7.0, 6.4], [7.2, 7.6], [7.4, 8.8], [7.5, 10.0], [7.6, 11.2]], 12);
  const farmTrack = catmull([[2.4, 10.2], [3.0, 11.4], [3.2, 12.6]], 10);
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
export function Bridge({ x, y, p, span = 2.5, deck = 0.46 }) {
  const w = 0.9;
  const yA = y - span / 2;
  const yB = y + span / 2;
  const arch = (t) => Math.sin(t * Math.PI) * 0.22;
  return (
    <g data-role="bridge">
      {/* abutments on both banks */}
      <polygon points={P([[x - 0.16, yA - 0.3, 0], [x + w + 0.16, yA - 0.3, 0], [x + w + 0.16, yA + 0.12, 0], [x - 0.16, yA + 0.12, 0]])} fill={p.stoneDark} />
      <polygon points={P([[x - 0.16, yB - 0.12, 0], [x + w + 0.16, yB - 0.12, 0], [x + w + 0.16, yB + 0.3, 0], [x - 0.16, yB + 0.3, 0]])} fill={p.stone} />
      {/* arched deck, stepped so the arch reads */}
      {Array.from({ length: 9 }, (_, i) => {
        const t0 = i / 9;
        const t1 = (i + 1) / 9;
        return (
          <polygon
            key={i}
            points={P([
              [x, yA + span * t0, deck + arch(t0)],
              [x + w, yA + span * t0, deck + arch(t0)],
              [x + w, yA + span * t1, deck + arch(t1)],
              [x, yA + span * t1, deck + arch(t1)],
            ])}
            fill={i % 2 ? p.stone : p.stoneLight}
          />
        );
      })}
      {/* parapets */}
      {[x - 0.04, x + w + 0.04].map((rx, i) => (
        <g key={i}>
          <path d={L([[rx, yA, deck + arch(0)], [rx, yB, deck + arch(1)]], false)} stroke={p.stoneDark} strokeWidth={3.4} strokeLinecap="round" />
          {[0.1, 0.35, 0.6, 0.85].map((t, k) => (
            <path key={k} d={L([[rx, yA + span * t, deck + arch(t)], [rx, yA + span * t, deck + arch(t) + 0.34]], false)} stroke={p.stoneDark} strokeWidth={2.8} strokeLinecap="round" />
          ))}
        </g>
      ))}
    </g>
  );
}
