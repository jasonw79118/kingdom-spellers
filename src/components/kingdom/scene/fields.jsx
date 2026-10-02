// Farmland.
//
// The fields used to be four-cornered polygons on exact grid lines, one per
// fieldPlan entry. That is why the scene audit found precisely eight
// cell-aligned quads and why the kingdom read as a board with crop rectangles on
// it: a real field is bounded by whatever the ground and the previous owners
// left behind, and its rows follow the plough, not the cell.
//
// So a field here is:
//
//   * an irregular outline, never a rectangle - a blob, so the boundary wanders
//   * ploughed rows trimmed to that outline, so they stop at the hedge line
//     instead of running off into the next field
//   * a hedgerow around it, with a gap and a five-bar gate
//   * a crop stage, so the farms are not all the same age: standing grain,
//     ripening barley, young green, cut stubble with bales, and fallow ground
//
// The hedgerow is emitted back to front, because the painter's order in an
// isometric view is ascending gx+gy and nothing else. A hedge drawn in one
// piece puts the far side over the near side, which is the same class of bug as
// the castle tower that painted over the hall.

import { shade } from "../iso";
import { at, px, L, blob, rng } from "./geometry";

/** Is a grid point inside a closed ring? */
function pointInRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * The part of the segment a..b that stays inside `ring`.
 *
 * Rows are ploughed across the field and then stopped at the boundary. Without
 * this the rows run to the corner of the reserved plot and stick out past the
 * hedge, which looks like the hedge was drawn on afterwards.
 */
function trimToRing(ring, ax, ay, bx, by, steps = 60) {
  let lo = null;
  let hi = null;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (pointInRing(ring, ax + (bx - ax) * t, ay + (by - ay) * t)) {
      if (lo === null) lo = t;
      hi = t;
    }
  }
  if (lo === null) return null;
  // Pull the ends in a touch so the row tucks under the hedge rather than
  // touching its outer edge.
  const pad = 0.04;
  const a = lo + pad;
  const b = hi - pad;
  if (b - a < 0.05) return null;
  return [ax + (bx - ax) * a, ay + (by - ay) * a, ax + (bx - ax) * b, ay + (by - ay) * b];
}

/**
 * The field's boundary.
 *
 * Deliberately a blob and not a rectangle. This is the single change that takes
 * the fields off the grid lattice, and it is worth being blunt about why: an
 * axis-parallel quad in an isometric scene is not a stylistic weakness, it is
 * the one shape that reveals the underlying cell grid. The scene audit counts
 * them (`check 9`) precisely because they cannot be disguised by colour or by
 * detail added on top - the shape itself gives the grid away.
 */
export function fieldOutline(x, y, w, d, seed) {
  // Sized from the plot but not equal to it, so the hedge never lands exactly on
  // a cell boundary and the field breathes around its reservation.
  const rw = (w * 0.5 + 0.16) * (0.9 + ((seed * 37) % 17) / 100);
  const rd = (d * 0.5 + 0.16) * (0.9 + ((seed * 53) % 19) / 100);
  const cx = x + w / 2;
  const cy = y + d / 2;
  // blob() returns a ring of radius ~1 about (cx, cy), so scaling the offsets
  // by the semi-axis is what gives the field its size and aspect.
  return blob(cx, cy, 1, { seed: seed * 13 + 7, wobble: 0.3, lobes: 9, steps: 7 }).map(
    ([bx, by]) => [cx + (bx - cx) * rw, cy + (by - cy) * rd],
  );
}

/** Project a grid ring to screen, draping it over the terrain height. */
function drape(ring, zAt) {
  return ring
    .map(([gx, gy]) => {
      const p = at(gx, gy, px(zAt(gx, gy)));
      return `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`;
    })
    .join(" ");
}

const drapePath = (ring, zAt) => {
  const pts = ring.map(([gx, gy]) => at(gx, gy, px(zAt(gx, gy))));
  return `M${pts.map((p) => `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`).join(" L")}`;
};

// ---------------------------------------------------------------------------
// Crops
// ---------------------------------------------------------------------------

/**
 * What is growing, and how it should be drawn.
 *
 * `head` is the distinguishing mark: ripe grain carries a heavy drooping ear,
 * barley a stiff upright one, young green crop has none at all yet. Without a
 * silhouette difference between the stages every field is the same green
 * scribble at a different colour.
 */
const CROPS = {
  grain: { soil: "#8a6f42", tone: "#c9a227", stalk: "#9c7a1e", h: 0.2, head: "droop", dens: 7 },
  barley: { soil: "#8f7a4c", tone: "#d8c07a", stalk: "#a89050", h: 0.22, head: "upright", dens: 7 },
  green: { soil: "#7d7345", tone: "#5f9c3c", stalk: "#4a7d2c", h: 0.13, head: "leaf", dens: 6 },
  stubble: { soil: "#93794a", tone: "#a98f56", stalk: "#8a7040", h: 0.07, head: "none", dens: 9 },
  fallow: { soil: "#7a6242", tone: "#6d7a45", stalk: "#5d6b3a", h: 0.06, head: "weed", dens: 4 },
};

/** One clump of crop, standing in a ploughed row. */
function Crop({ gx, gy, zAt, crop, rand, index }) {
  const c = CROPS[crop];
  const a = at(gx, gy, px(zAt(gx, gy)));
  const h = c.h * (0.78 + rand() * 0.44) * 40;
  const lean = (rand() - 0.5) * 3.4;
  const base = `${a.x},${a.y}`;
  const out = [
    <path key="s" d={`M${base} Q${a.x + lean * 0.4},${a.y - h * 0.55} ${a.x + lean},${a.y - h}`}
      stroke={c.stalk} strokeWidth={1.3} strokeLinecap="round" fill="none" />,
  ];
  if (c.head === "droop") {
    // A ripe ear hangs over, which is what tells you it is ready to cut.
    out.push(
      <ellipse key="h" cx={a.x + lean + 1.6} cy={a.y - h + 3.4} rx={1.5} ry={3.6}
        fill={c.tone} transform={`rotate(28 ${a.x + lean + 1.6} ${a.y - h + 3.4})`} />,
      <ellipse key="h2" cx={a.x + lean + 0.4} cy={a.y - h + 1.4} rx={1} ry={2.4} fill={c.tone} />,
    );
  } else if (c.head === "upright") {
    out.push(
      <ellipse key="h" cx={a.x + lean} cy={a.y - h - 2.2} rx={1.1} ry={4} fill={c.tone} />,
      <path key="a" d={`M${a.x + lean},${a.y - h - 5} l0.9,2.4`} stroke={c.tone} strokeWidth={0.9} />,
    );
  } else if (c.head === "leaf") {
    out.push(
      <path key="l1" d={`M${base} q-4.4,-3 -6.4,-6.6`} stroke={c.tone} strokeWidth={1.5} fill="none" strokeLinecap="round" />,
      <path key="l2" d={`M${base} q4.2,-2.6 6.2,-6`} stroke={c.tone} strokeWidth={1.5} fill="none" strokeLinecap="round" />,
      <ellipse key="e" cx={a.x + lean} cy={a.y - h} rx={1.8} ry={2.6} fill={c.tone} />,
    );
  } else if (c.head === "weed") {
    out.push(
      <path key="w1" d={`M${base} l${(rand() - 0.5) * 7},${-h * 2.4}`} stroke={c.tone} strokeWidth={1.1} />,
      <ellipse key="w2" cx={a.x + (rand() - 0.5) * 5} cy={a.y - h * 1.8} rx={2.2} ry={1.5} fill={c.tone} />,
    );
  }
  return <g data-role="crop-clump" data-i={index}>{out}</g>;
}

// ---------------------------------------------------------------------------
// Hedge and gate
// ---------------------------------------------------------------------------

/**
 * The hedgerow, emitted back to front.
 *
 * Sorting the lobes by gx+gy is not a detail here. One hedge drawn as a single
 * group paints its far lobes over its near ones and the hedge turns inside out
 * in the middle of the field, which is exactly the failure the castle audit
 * caught on the keep.
 */
function Hedgerow({ ring, zAt, color, rand, gapIndex }) {
  const lobes = [];
  const n = Math.max(14, ring.length);
  for (let i = 0; i < n; i += 1) {
    const [gx, gy] = ring[Math.floor((i / n) * ring.length)];
    // Two lobes skipped for the gate, and a couple of natural gaps besides.
    const isGap = Math.abs(i - gapIndex) <= 1 || (i % 11 === 4 && i !== gapIndex);
    if (isGap) continue;
    const s = 0.78 + rand() * 0.5;
    const a = at(gx, gy, px(zAt(gx, gy)));
    lobes.push({
      depth: gx + gy,
      node: (
        <g data-role="hedge-lobe" data-s={s.toFixed(2)}>
          <ellipse cx={a.x} cy={a.y - 4 * s} rx={9 * s} ry={7.6 * s} fill={i % 2 ? color : shade(color, 0.1)} />
          <ellipse cx={a.x - 3 * s} cy={a.y - 9 * s} rx={5.4 * s} ry={4.4 * s} fill={shade(color, 0.2)} />
        </g>
      ),
    });
  }
  lobes.sort((a, b) => a.depth - b.depth);
  return <g data-role="hedgerow">{lobes.map((l, i) => <g key={i}>{l.node}</g>)}</g>;
}

/** A five-bar gate in the hedge, hung between two posts. */
function FieldGate({ gx, gy, zAt, color }) {
  const a = at(gx, gy, px(zAt(gx, gy)));
  const h = 17;
  const w = 15;
  const out = [
    <path key="pl" d={L([[gx, gy, zAt(gx, gy)], [gx, gy, zAt(gx, gy) + h / 40]], false)} stroke="#6b4a2c" strokeWidth={2.6} strokeLinecap="round" />,
    <path key="pr" d={L([[gx + 0.42, gy + 0.02, zAt(gx, gy)], [gx + 0.42, gy + 0.02, zAt(gx, gy) + h / 40]], false)} stroke="#6b4a2c" strokeWidth={2.6} strokeLinecap="round" />,
  ];
  for (let i = 0; i < 4; i += 1) {
    const t = 0.12 + i * 0.2;
    out.push(
      <path
        key={`b${i}`}
        d={L([
          [gx + 0.03, gy + 0.005, zAt(gx, gy) + (h * t) / 40],
          [gx + 0.39, gy + 0.02, zAt(gx, gy) + (h * t) / 40],
        ], false)}
        stroke={i % 2 ? "#7d5a35" : color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />,
    );
  }
  return (
    <g data-role="gate">
      {out}
      <ellipse cx={a.x} cy={a.y - 1} rx={11} ry={3} fill="#2f3a24" opacity={0.18} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// The field
// ---------------------------------------------------------------------------

/**
 * One field.
 *
 * `zAt` is a height function rather than a number, because a field that sits on
 * one flat plane while the hill under it rises is one of the ways the scene
 * announces that it was assembled rather than grown. Every corner, row and
 * clump samples the terrain it is standing on.
 */
export function Field({ x, y, w, d, dir = "x", crop = "grain", zAt = () => 0, seed = 0, hedge = "#4e8b4a" }) {
  const rand = rng(seed * 977 + 17);
  const c = CROPS[crop] || CROPS.grain;
  const ring = fieldOutline(x, y, w, d, seed);

  // The gate goes on the boundary point nearest the village, which is where a
  // field gate would actually be put.
  const VILLAGE = [7.6, 6.3];
  let gapIndex = 0;
  let bestD = Infinity;
  ring.forEach(([gx, gy], i) => {
    const dd = Math.hypot(gx - VILLAGE[0], gy - VILLAGE[1]);
    if (dd < bestD) { bestD = dd; gapIndex = i; }
  });
  const [gateX, gateY] = ring[gapIndex];

  // Ploughed rows across the field, trimmed to the hedge line.
  const rows = [];
  const rowCount = Math.max(4, Math.round((dir === "x" ? d : w) * 5));
  for (let i = 0; i < rowCount; i += 1) {
    const t = (i + 0.5) / rowCount;
    let seg;
    if (dir === "x") {
      seg = trimToRing(ring, x - 0.2, y + d * t, x + w + 0.2, y + d * t);
    } else {
      seg = trimToRing(ring, x + w * t, y - 0.2, x + w * t, y + d + 0.2);
    }
    if (!seg) continue;
    const [x0, y0, x1, y1] = seg;
    // A row is not a ruler-straight line: the plough wanders a little, and the
    // wobble is what stops nine parallel strokes reading as a barcode.
    const mid = [];
    const steps = 5;
    for (let k = 0; k <= steps; k += 1) {
      const u = k / steps;
      const wob = Math.sin(u * 5.1 + i * 1.7) * 0.028 + (rand() - 0.5) * 0.018;
      const gx = x0 + (x1 - x0) * u + (dir === "y" ? wob : 0);
      const gy = y0 + (y1 - y0) * u + (dir === "x" ? wob : 0);
      mid.push([gx, gy]);
    }
    rows.push(mid);
  }

  const clumps = [];
  rows.forEach((mid, ri) => {
    for (let k = 0; k < c.dens; k += 1) {
      const u = (k + 0.5) / c.dens + (rand() - 0.5) * 0.1;
      if (u < 0 || u > 1) continue;
      const idx = Math.min(mid.length - 2, Math.floor(u * (mid.length - 1)));
      const f = u * (mid.length - 1) - idx;
      const gx = mid[idx][0] + (mid[idx + 1][0] - mid[idx][0]) * f;
      const gy = mid[idx][1] + (mid[idx + 1][1] - mid[idx][1]) * f;
      clumps.push({ gx, gy, i: clumps.length, depth: gx + gy, ri });
    }
  });

  return (
    <g data-role="field" data-crop={crop} data-dir={dir} data-rows={rows.length}>
      {/* turned-over soil */}
      <polygon points={drape(ring, zAt)} fill={c.soil} />
      {/* a lighter worked strip inside the hedge, so the field has a border */}
      <polygon
        points={drape(ring.map(([gx, gy]) => [
          (x + w / 2) + (gx - (x + w / 2)) * 0.9,
          (y + d / 2) + (gy - (y + d / 2)) * 0.9,
        ]), zAt)}
        fill={shade(c.soil, 0.1)}
      />
      <g data-role="furrow">
        {rows.map((mid, i) => (
          <path
            key={i}
            d={drapePath(mid, zAt)}
            stroke={i % 2 ? c.stalk : shade(c.stalk, -0.2)}
            strokeWidth={2.1}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
        ))}
      </g>
      {/* crops, back to front */}
      <g data-role="crop-rows">
        {clumps
          .slice()
          .sort((a, b) => a.depth - b.depth)
          .map((cl) => (
            <Crop key={cl.i} gx={cl.gx} gy={cl.gy} zAt={zAt} crop={crop} rand={rand} index={cl.i} />
          ))}
      </g>
      <Hedgerow ring={ring} zAt={zAt} color={hedge} rand={rand} gapIndex={gapIndex} />
      <FieldGate gx={gateX} gy={gateY} zAt={zAt} color="#8a7040" />
      {/* hay bales on the cut stubble, so "stubble" reads as work finished */}
      {crop === "stubble" && [0.3, 0.68].map((t, i) => {
        const bz = zAt(x + w * t, y + d * 0.5);
        const b = at(x + w * t, y + d * 0.5, px(bz));
        return (
          <g key={i} data-role="haybale">
            <ellipse cx={b.x} cy={b.y - 6} rx={6.4} ry={5.6} fill="#d9c37e" />
            <ellipse cx={b.x - 1.6} cy={b.y - 7.6} rx={4} ry={3.4} fill="#ecd9a2" />
            <path d={`M${b.x},${b.y - 11} v11`} stroke="#a89050" strokeWidth={1.1} />
          </g>
        );
      })}
    </g>
  );
}

export { CROPS };