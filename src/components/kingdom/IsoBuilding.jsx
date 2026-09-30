// Isometric building generator.
//
// Hand-drawing 28 isometric buildings would give 28 slightly different drawing
// styles, which is exactly what made the old side-view kingdom feel like a set
// of unrelated stickers. Instead every structure is generated from parameters —
// size, colours, roof, and a list of features — so the whole village shares one
// construction grammar and reads as a single place.
//
// Each building also returns a `baseY`, the point in its own SVG where its
// footing meets the ground, so the village can plant it on the terrain.

import { path as _path, pts as _pts, boxFaces, gableFaces, boxTones, shade, HALF_W, HALF_H, Z_HEIGHT } from "./iso";

// Every building is drawn in grid units, and height needs the vertical
// exaggeration described in iso.js — without it a two-storey house renders as a
// sliver beside its own roof. Wrapping the two projection helpers here means no
// call site has to remember to pass the factor.
const P = (list) => _pts(list, Z_HEIGHT);
const L = (list, close = true) => _path(list, close, Z_HEIGHT);

// -+\n// Reusable pieces// ---------------------------------------------------------------------------
// Reusable pieces 
// ---------------------------------------------------------------------------

/** A plain extruded box — the workhorse for walls, plinths and towers. */
function IsoBox({ x, y, z, w, d, h, base, stroke, strokeWidth = 1 }) {
  const f = boxFaces(x, y, z, w, d, h);
  const t = boxTones(base);
  return (
    <g>
      <polygon points={P(f.front)} fill={t.front} stroke={t.line} strokeWidth={strokeWidth} />
      <polygon points={P(f.right)} fill={t.right} stroke={t.line} strokeWidth={strokeWidth} />
      <polygon points={P(f.top)} fill={t.top} stroke={t.line} strokeWidth={strokeWidth} />
    </g>
  );
}

/** A pitched roof drawn over a box. */
function IsoRoof({ x, y, z, w, d, h, rise, base }) {
  const f = gableFaces(x, y, z, w, d, h, rise);
  const t = boxTones(base);
  return (
    <g>
      <polygon points={P(f.back)} fill={shade(base, -0.34)} stroke={t.line} strokeWidth={1} />
      <polygon points={P(f.end)} fill={shade(base, -0.2)} stroke={t.line} strokeWidth={1} />
      <polygon points={P(f.slope)} fill={t.top} stroke={t.line} strokeWidth={1} />
      {/* ridge highlight */}
      <path
        d={L([[x, y + d / 2, z + h + rise], [x + w, y + d / 2, z + h + rise]], false)}
        stroke={shade(base, 0.3)}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

/** A window on the front (+y) wall, as a small skewed quad. */
function FrontWindow({ x, y, z, w = 0.32, h = 0.34, lit = false }) {
  const y2 = y + 0.001;
  return (
    <polygon
      points={P([
        [x, y2, z],
        [x + w, y2, z],
        [x + w, y2, z + h],
        [x, y2, z + h],
      ])}
      fill={lit ? "#ffd98a" : "#3d4a63"}
      stroke="#2a3145"
      strokeWidth={0.6}
    />
  );
}

/** A window on the right (+x) wall. */
function SideWindow({ x, y, z, d = 0.3, h = 0.34, lit = false }) {
  return (
    <polygon
      points={P([
        [x, y, z],
        [x, y + d, z],
        [x, y + d, z + h],
        [x, y, z + h],
      ])}
      fill={lit ? "#ffd98a" : "#3d4a63"}
      stroke="#2a3145"
      strokeWidth={0.6}
    />
  );
}

/** A door on the front wall. */
function FrontDoor({ x, y, z, w = 0.4, h = 0.6 }) {
  return (
    <polygon
      points={P([
        [x, y, z],
        [x + w, y, z],
        [x + w, y, z + h],
        [x, y, z + h],
      ])}
      fill="#6b4326"
      stroke="#4a2d19"
      strokeWidth={0.8}
    />
  );
}

/** Crenellations along a wall top — reads as "castle" from any distance. */
function Crenellations({ x, y, z, w, d, base }) {
  const t = boxTones(base);
  const n = Math.max(2, Math.round(w * 2));
  const step = w / n;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const cx = x + i * step + step * 0.18;
    const cw = step * 0.64;
    out.push(
      <polygon
        key={`f${i}`}
        points={P([
          [cx, y + d, z],
          [cx + cw, y + d, z],
          [cx + cw, y + d, z + 0.26],
          [cx, y + d, z + 0.26],
        ])}
        fill={t.front}
        stroke={t.line}
        strokeWidth={0.7}
      />
    );
  }
  return <g>{out}</g>;
}

/** A slim flag on a pole. */
function Flag({ x, y, z, color, h = 1.1 }) {
  return (
    <g>
      <path
        d={L([[x, y, z], [x, y, z + h]], false)}
        stroke="#6b5a3a"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <polygon
        points={P([
          [x, y, z + h],
          [x + 0.42, y, z + h - 0.16],
          [x, y, z + h - 0.32],
        ])}
        fill={color}
      />
    </g>
  );
}

/** A conical roof, approximated as a pyramid — used on towers. */
function Cone({ x, y, z, size, h, base }) {
  const t = boxTones(base);
  const cx = x + size / 2;
  const cy = y + size / 2;
  return (
    <g>
      <polygon
        points={P([
          [x, y + size, z],
          [x + size, y + size, z],
          [cx, cy, z + h],
        ])}
        fill={t.front}
        stroke={t.line}
        strokeWidth={1}
      />
      <polygon
        points={P([
          [x + size, y, z],
          [x + size, y + size, z],
          [cx, cy, z + h],
        ])}
        fill={t.right}
        stroke={t.line}
        strokeWidth={1}
      />
      <polygon
        points={P([
          [x, y, z],
          [x + size, y, z],
          [x + size, y + size, z],
          [x, y + size, z],
        ])}
        fill={t.top}
        stroke={t.line}
        strokeWidth={1}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

/**
 * Return a building's shapes, projected through the same iso() as the village.
 *
 * There is deliberately no <svg> wrapper here: a nested SVG carries its own
 * viewBox origin, which offsets each building away from the grid it is meant to
 * stand on. Emitting the shapes directly means the village only has to wrap
 * them in a translate(), and the two coordinate spaces are guaranteed identical.
 */
export function IsoBuildingShapes({ id }) {
  const spec = SPECS[id] || SPECS.cottage;
  return spec.draw();
}

/** Standalone rendering, for use outside the village (previews, shop cards). */
export default function IsoBuilding({ id }) {
  const spec = SPECS[id] || SPECS.cottage;
  return (
    <svg
      viewBox={`${spec.vb[0]} ${spec.vb[1]} ${spec.vb[2]} ${spec.vb[3]}`}
      width={spec.vb[2]}
      height={spec.vb[3]}
      style={{ overflow: "visible" }}
      aria-hidden="true"
      focusable="false"
    >
      <g>{spec.draw()}</g>
    </svg>
  );
}

// Shared palettes so the village looks like one place.
const WALL = "#e8d5b7";
const WALL_WARM = "#dfc39f";
const TIMBER = "#6b4a2c";
const ROOF_RED = "#c1503f";
const ROOF_BLUE = "#4a6fa5";
const ROOF_ORANGE = "#d98a3c";
const ROOF_BROWN = "#8a5a34";
const ROOF_GREEN = "#5a8a5f";
const ROOF_GREY = "#7d8595";
const STONE = "#b9b3a6";
const STONE_DARK = "#8d877b";

/** helper: half-timbered wall panel (the reference look) */
function Timber({ x, y, z, w, h, base = WALL }) {
  const t = boxTones(base);
  return (
    <g>
      <polygon points={P([[x, y, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h]])} fill={t.front} />
      {/* vertical studs */}
      {Array.from({ length: Math.max(2, Math.round(w * 2)) }, (_, i) => {
        const cx = x + (i + 0.5) * (w / Math.max(2, Math.round(w * 2)));
        return (
          <path
            key={i}
            d={L([[cx, y, z], [cx, y, z + h]], false)}
            stroke={TIMBER}
            strokeWidth={1.6}
            opacity={0.5}
          />
        );
      })}
      {/* horizontal beam */}
      <path
        d={L([[x, y, z + h * 0.55], [x + w, y, z + h * 0.55]], false)}
        stroke={TIMBER}
        strokeWidth={2}
        opacity={0.6}
      />
    </g>
  );
}

const SPECS = {
  // --- Greenwood Village ---------------------------------------------------
  cottage: {
    vb: [-70, -190, 200, 210],
    draw: () => (
      <>
        <IsoBox x={0} y={0} z={0} w={1.6} d={1.4} h={1.1} base={WALL} />
        <Timber x={0.1} y={1.4} z={0.15} w={1.4} h={0.8} />
        <FrontDoor x={0.62} y={1.4} z={0.1} w={0.4} h={0.62} />
        <FrontWindow x={0.14} y={1.4} z={0.24} w={0.3} h={0.34} lit />
        <FrontWindow x={1.16} y={1.4} z={0.24} w={0.3} h={0.34} />
        <IsoBox x={1.28} y={0.34} z={1.1} w={0.24} d={0.24} h={0.62} base={STONE} />
        <IsoRoof x={-0.1} y={-0.1} z={1.1} w={1.8} d={1.6} h={0} rise={0.62} base={ROOF_BROWN} />
      </>
    ),
  },
  well: {
    vb: [-70, -170, 190, 190],
    draw: () => (
      <>
        <IsoBox x={0.2} y={0.2} z={0} w={1.2} d={1.2} h={0.42} base={STONE} />
        <IsoBox x={0.12} y={0.12} z={0.42} w={1.36} d={1.36} h={0.1} base={STONE_DARK} />
        {/* posts + little roof */}
        <path d={L([[0.3, 0.3, 0.5], [0.3, 0.3, 1.35]], false)} stroke={TIMBER} strokeWidth={3} />
        <path d={L([[1.3, 0.3, 0.5], [1.3, 0.3, 1.35]], false)} stroke={TIMBER} strokeWidth={3} />
        <path d={L([[0.3, 1.3, 0.5], [0.3, 1.3, 1.35]], false)} stroke={TIMBER} strokeWidth={3} />
        <path d={L([[1.3, 1.3, 0.5], [1.3, 1.3, 1.35]], false)} stroke={TIMBER} strokeWidth={3} />
        <IsoRoof x={0.05} y={0.05} z={1.3} w={1.5} d={1.5} h={0} rise={0.44} base={ROOF_RED} />
      </>
    ),
  },
  bakery: {
    vb: [-70, -210, 210, 225],
    draw: () => (
      <>
        <IsoBox x={0} y={0} z={0} w={1.8} d={1.5} h={1.25} base={WALL_WARM} />
        <Timber x={0.08} y={1.5} z={0.12} w={1.64} h={0.95} />
        <FrontDoor x={0.7} y={1.5} z={0.08} w={0.42} h={0.66} />
        <FrontWindow x={0.16} y={1.5} z={0.5} w={0.34} h={0.36} lit />
        <FrontWindow x={1.3} y={1.5} z={0.5} w={0.34} h={0.36} lit />
        {/* oven chimney with a warm glow */}
        <IsoBox x={1.4} y={0.3} z={1.25} w={0.3} d={0.3} h={0.7} base={STONE_DARK} />
        <IsoRoof x={-0.1} y={-0.1} z={1.25} w={2} d={1.7} h={0} rise={0.66} base={ROOF_RED} />
      </>
    ),
  },
  market: {
    vb: [-80, -200, 220, 210],
    draw: () => (
      <>
        {/* stall posts + striped awning */}
        {[[0.15, 0.15], [1.85, 0.15], [0.15, 1.45], [1.85, 1.45]].map(([px, py], i) => (
          <path key={i} d={L([[px, py, 0], [px, py, 1.05]], false)} stroke={TIMBER} strokeWidth={3.4} />
        ))}
        <polygon
          points={P([[0, 0, 1.05], [2, 0, 1.05], [2, 1.6, 1.05], [0, 1.6, 1.05]])}
          fill={ROOF_ORANGE}
          opacity={0.95}
        />
        <polygon
          points={P([[0, 0, 1.05], [2, 0, 1.05], [2, 0, 1.28], [0, 0, 1.28]])}
          fill={ROOF_RED}
        />
        {/* counter + crates */}
        <IsoBox x={0.2} y={0.3} z={0} w={1.6} d={0.8} h={0.5} base={WALL_WARM} />
        <IsoBox x={0.3} y={1.1} z={0} w={0.4} d={0.4} h={0.34} base={ROOF_BROWN} />
        <IsoBox x={1.2} y={1.15} z={0} w={0.36} d={0.36} h={0.3} base={ROOF_BROWN} />
      </>
    ),
  },
  schoolhouse: {
    vb: [-80, -230, 230, 240],
    draw: () => (
      <>
        <IsoBox x={0} y={0} z={0} w={2} d={1.6} h={1.3} base={WALL} />
        <Timber x={0.08} y={1.6} z={0.12} w={1.84} h={1} />
        <FrontDoor x={0.8} y={1.6} z={0.1} w={0.44} h={0.7} />
        <FrontWindow x={0.18} y={1.6} z={0.55} w={0.36} h={0.4} lit />
        <FrontWindow x={1.46} y={1.6} z={0.55} w={0.36} h={0.4} lit />
        <IsoRoof x={-0.1} y={-0.1} z={1.3} w={2.2} d={1.8} h={0} rise={0.68} base={ROOF_BLUE} />
        {/* bell tower */}
        <IsoBox x={0.8} y={0.4} z={1.3} w={0.5} d={0.5} h={0.8} base={WALL_WARM} />
        <Cone x={0.78} y={0.38} z={2.1} size={0.54} h={0.62} base={ROOF_BLUE} />
      </>
    ),
  },
  townhall: {
    vb: [-90, -270, 250, 275],
    draw: () => (
      <>
        {/* two storeys */}
        <IsoBox x={0} y={0} z={0} w={2.3} d={1.8} h={1.1} base={WALL} />
        <IsoBox x={0.2} y={0.2} z={1.1} w={1.9} d={1.4} h={0.9} base={WALL_WARM} />
        {/* columns at the front */}
        {Array.from({ length: 4 }, (_, i) => {
          const cx = 0.25 + i * 0.6;
          return (
            <polygon
              key={i}
              points={P([[cx, 1.8, 0.1], [cx + 0.16, 1.8, 0.1], [cx + 0.16, 1.8, 1.1], [cx, 1.8, 1.1]])}
              fill="#efe6d2"
              stroke="#b9ac92"
              strokeWidth={0.6}
            />
          );
        })}
        <FrontDoor x={1.0} y={1.8} z={0.08} w={0.5} h={0.78} />
        <FrontWindow x={0.3} y={1.8} z={1.3} w={0.36} h={0.42} lit />
        <FrontWindow x={1.6} y={1.8} z={1.3} w={0.36} h={0.42} lit />
        <SideWindow x={2.3} y={0.4} z={1.3} d={0.32} h={0.42} lit />
        <IsoRoof x={0.05} y={0.05} z={2.0} w={2.2} d={1.6} h={0} rise={0.7} base={ROOF_GREY} />
        <Flag x={1.1} y={0.75} z={2.7} color={ROOF_RED} h={0.7} />
      </>
    ),
  },

  // --- Riverstone Crossing -------------------------------------------------
  dock: {
    vb: [-90, -160, 240, 175],
    draw: () => (
      <>
        {/* planks running out over the water */}
        <polygon points={P([[0, 0, 0.1], [2.4, 0, 0.1], [2.4, 1.1, 0.1], [0, 1.1, 0.1]])} fill={ROOF_BROWN} />
        {Array.from({ length: 6 }, (_, i) => (
          <path
            key={i}
            d={L([[0.2 + i * 0.4, 0, 0.1], [0.2 + i * 0.4, 1.1, 0.1]], false)}
            stroke="#6b4a2c"
            strokeWidth={1.2}
            opacity={0.6}
          />
        ))}
        {/* mooring posts */}
        {[0.15, 2.2].map((px, i) => (
          <path key={i} d={L([[px, 1.05, 0.1], [px, 1.05, 0.62]], false)} stroke="#5a3d22" strokeWidth={4} />
        ))}
        <IsoBox x={0.2} y={-0.1} z={0.1} w={0.9} d={0.7} h={0.55} base={WALL_WARM} />
        <IsoRoof x={0.14} y={-0.16} z={0.65} w={1.02} d={0.82} h={0} rise={0.3} base={ROOF_RED} />
      </>
    ),
  },
  mill: {
    vb: [-90, -270, 240, 280],
    draw: () => (
      <>
        <IsoBox x={0.2} y={0.2} z={0} w={1.4} d={1.4} h={1.7} base={WALL} />
        {/* conical cap */}
        <Cone x={0.16} y={0.16} z={1.7} size={1.48} h={0.72} base={ROOF_BROWN} />
        {/* sails */}
        <g transform={`translate(${(0.2 + 1.4) * HALF_W - (0.2) * HALF_W}, 0)`}>
          <path
            d={L([[1.62, 0.9, 1.35], [1.62, 0.9, 2.3]], false)}
            stroke={TIMBER}
            strokeWidth={3}
          />
          {[0, 1, 2, 3].map((i) => {
            const a = (i * Math.PI) / 2;
            return (
              <polygon
                key={i}
                points={P([
                  [1.62, 0.9, 1.82],
                  [1.62 + Math.cos(a) * 0.78, 0.9 + Math.sin(a) * 0.78, 1.82],
                  [1.62 + Math.cos(a + 0.5) * 0.7, 0.9 + Math.sin(a + 0.5) * 0.7, 1.82],
                ])}
                fill="#f2e3c2"
                stroke="#b9a67f"
                strokeWidth={0.8}
              />
            );
          })}
        </g>
      </>
    ),
  },
  bridge: {
    vb: [-100, -170, 250, 180],
    draw: () => (
      <>
        <polygon points={P([[0, 0.2, 0.16], [2.5, 0.2, 0.16], [2.5, 0.9, 0.16], [0, 0.9, 0.16]])} fill={ROOF_BROWN} />
        <polygon points={P([[0, 0.2, 0.02], [2.5, 0.2, 0.02], [2.5, 0.9, 0.02], [0, 0.9, 0.02]])} fill="#5a3d22" />
        {/* railings */}
        {[0.2, 2.35].map((py, i) => (
          <g key={i}>
            <path d={L([[0, py, 0.5], [2.5, py, 0.5]], false)} stroke="#6b4a2c" strokeWidth={2.4} />
            {Array.from({ length: 5 }, (_, k) => (
              <path
                key={k}
                d={L([[0.25 + k * 0.5, py, 0.16], [0.25 + k * 0.5, py, 0.5]], false)}
                stroke="#6b4a2c"
                strokeWidth={2}
              />
            ))}
          </g>
        ))}
      </>
    ),
  },
  fishery: {
    vb: [-90, -190, 230, 200],
    draw: () => (
      <>
        <IsoBox x={0} y={0} z={0} w={1.7} d={1.4} h={1.05} base={WALL} />
        <Timber x={0.08} y={1.4} z={0.12} w={1.54} h={0.8} />
        <FrontDoor x={0.66} y={1.4} z={0.08} w={0.4} h={0.62} />
        <FrontWindow x={0.16} y={1.4} z={0.28} w={0.32} h={0.34} lit />
        {/* drying rack */}
        <path d={L([[0.3, 1.75, 0], [0.3, 1.75, 0.8]], false)} stroke={TIMBER} strokeWidth={2.6} />
        <path d={L([[1.4, 1.75, 0], [1.4, 1.75, 0.8]], false)} stroke={TIMBER} strokeWidth={2.6} />
        <path d={L([[0.3, 1.75, 0.8], [1.4, 1.75, 0.8]], false)} stroke={TIMBER} strokeWidth={2} />
        <IsoRoof x={-0.1} y={-0.1} z={1.05} w={1.9} d={1.6} h={0} rise={0.6} base={ROOF_BLUE} />
      </>
    ),
  },
  inn: {
    vb: [-90, -250, 240, 260],
    draw: () => (
      <>
        <IsoBox x={0} y={0} z={0} w={2} d={1.6} h={1.15} base={WALL} />
        <IsoBox x={0.15} y={0.15} z={1.15} w={1.1} d={1} h={0.75} base={WALL_WARM} />
        <Timber x={0.08} y={1.6} z={0.12} w={1.84} h={0.9} />
        <FrontDoor x={0.8} y={1.6} z={0.08} w={0.46} h={0.72} />
        <FrontWindow x={0.2} y={1.6} z={0.3} w={0.36} h={0.38} lit />
        <FrontWindow x={1.44} y={1.6} z={0.3} w={0.36} h={0.38} lit />
        <SideWindow x={2.0} y={0.4} z={1.35} d={0.3} h={0.36} lit />
        <IsoRoof x={-0.1} y={-0.1} z={1.15} w={2.2} d={1.8} h={0} rise={0.62} base={ROOF_RED} />
        {/* hanging sign */}
        <path d={L([[1.9, 1.6, 0.9], [2.3, 1.6, 0.9]], false)} stroke="#5a3d22" strokeWidth={2} />
      </>
    ),
  },

  // --- Highland Keep -------------------------------------------------------
  watchtower: {
    vb: [-70, -320, 190, 330],
    draw: () => (
      <>
        <IsoBox x={0.2} y={0.2} z={0} w={0.9} d={0.9} h={2.3} base={STONE} />
        <Crenellations x={0.2} y={0.2} z={2.3} w={0.9} d={0.9} base={STONE} />
        <SideWindow x={1.1} y={0.45} z={1.6} d={0.28} h={0.36} lit />
        <Cone x={0.1} y={0.1} z={2.56} size={1.1} h={0.6} base={ROOF_GREY} />
      </>
    ),
  },
  barracks: {
    vb: [-100, -230, 250, 240],
    draw: () => (
      <>
        <IsoBox x={0} y={0} z={0} w={2.2} d={1.5} h={1.15} base={STONE} />
        {Array.from({ length: 4 }, (_, i) => (
          <FrontWindow key={i} x={0.16 + i * 0.52} y={1.5} z={0.4} w={0.3} h={0.36} lit={i % 2 === 0} />
        ))}
        <FrontDoor x={0.92} y={1.5} z={0.08} w={0.4} h={0.66} />
        <IsoRoof x={-0.1} y={-0.1} z={1.15} w={2.4} d={1.7} h={0} rise={0.6} base={ROOF_GREY} />
        {/* banner */}
        <Flag x={1.05} y={0.7} z={1.75} color={ROOF_RED} h={0.6} />
      </>
    ),
  },
  chapel: {
    vb: [-90, -290, 230, 300],
    draw: () => (
      <>
        <IsoBox x={0.1} y={0.1} z={0} w={1.5} d={1.5} h={1.5} base={STONE} />
        <Cone x={0.05} y={0.05} z={1.5} size={1.6} h={0.95} base={ROOF_BLUE} />
        {/* little steeple */}
        <IsoBox x={0.72} y={0.72} z={2.4} w={0.28} d={0.28} h={0.5} base={STONE_DARK} />
        <CrossIcon x={0.86} y={0.86} z={2.9} h={0.34} />
        <FrontWindow x={0.7} y={1.6} z={0.5} w={0.34} h={0.5} lit />
      </>
    ),
  },
  greatkeep: {
    vb: [-110, -330, 270, 340],
    draw: () => (
      <>
        <IsoBox x={0} y={0} z={0} w={2.4} d={1.8} h={1.5} base={STONE} />
        <IsoBox x={0.5} y={0.5} z={1.5} w={1.4} d={0.9} h={0.9} base={STONE_DARK} />
        <Crenellations x={0} y={0} z={1.5} w={2.4} d={1.8} base={STONE} />
        <FrontDoor x={1.0} y={1.8} z={0.08} w={0.5} h={0.86} />
        <FrontWindow x={0.4} y={1.8} z={0.6} w={0.32} h={0.44} lit />
        <FrontWindow x={1.7} y={1.8} z={0.6} w={0.32} h={0.44} lit />
        <Cone x={0.44} y={0.44} z={2.4} size={1.52} h={0.7} base={ROOF_BLUE} />
        <Flag x={1.2} y={0.95} z={3.1} color={ROOF_ORANGE} h={0.7} />
      </>
    ),
  },

  // --- Crystal Caverns ----------------------------------------------------
  mine: {
    vb: [-90, -230, 240, 240],
    draw: () => (
      <>
        {/* rock face */}
        <polygon points={P([[0, 0, 0], [1.9, 0, 0], [1.9, 1.5, 1.5], [0, 1.5, 1.5]])} fill={STONE_DARK} />
        <polygon points={P([[0, 1.5, 0], [1.9, 1.5, 0], [1.9, 1.5, 1.5], [0, 1.5, 1.5]])} fill={STONE} />
        {/* tunnel mouth */}
        <polygon
          points={P([[0.5, 1.5, 0], [1.4, 1.5, 0], [1.4, 1.5, 0.85], [0.5, 1.5, 0.85]])}
          fill="#1c1726"
        />
        <IsoBox x={0.15} y={1.4} z={0.8} w={0.3} d={0.3} h={0.24} base={STONE_DARK} />
        <IsoBox x={1.45} y={1.4} z={0.8} w={0.3} d={0.3} h={0.24} base={STONE_DARK} />
        {/* cart on rails */}
        <polygon points={P([[0.1, 2.1, 0.05], [0.8, 2.1, 0.05], [0.8, 2.5, 0.05], [0.1, 2.5, 0.05]])} fill={ROOF_BROWN} />
        <polygon points={P([[0.1, 2.1, 0.42], [0.8, 2.1, 0.42], [0.8, 2.5, 0.42], [0.1, 2.5, 0.42]])} fill="#5a3d22" />
      </>
    ),
  },
  gemcutter: {
    vb: [-100, -250, 250, 260],
    draw: () => (
      <>
        <IsoBox x={0} y={0} z={0} w={2} d={1.6} h={1.2} base="#b6aecd" />
        <Timber x={0.08} y={1.6} z={0.12} w={1.84} h={0.92} />
        <FrontDoor x={0.8} y={1.6} z={0.08} w={0.44} h={0.68} />
        <FrontWindow x={0.2} y={1.6} z={0.32} w={0.34} h={0.36} lit />
        <FrontWindow x={1.46} y={1.6} z={0.32} w={0.34} h={0.36} lit />
        <IsoRoof x={-0.1} y={-0.1} z={1.2} w={2.2} d={1.8} h={0} rise={0.68} base="#7f6bb5" />
        {/* a cut gem on the ridge */}
        <polygon
          points={P([[0.9, 0.7, 1.88], [1.15, 0.7, 1.88], [1.02, 0.7, 2.14]])}
          fill="#c9b8ff"
        />
      </>
    ),
  },
  bridgeoflight: {
    vb: [-110, -250, 270, 260],
    draw: () => (
      <>
        <polygon points={P([[0, 0.3, 0.2], [2.6, 0.3, 0.2], [2.6, 1.0, 0.2], [0, 1.0, 0.2]])} fill="#e6dcf7" />
        <polygon points={P([[0, 0.3, 0.05], [2.6, 0.3, 0.05], [2.6, 1.0, 0.05], [0, 1.0, 0.05]])} fill="#8f7fc0" />
        {[0.3, 2.3].map((py, i) => (
          <path key={i} d={L([[0, py, 0.62], [2.6, py, 0.62]], false)} stroke="#f2ecff" strokeWidth={2.6} />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <g key={i}>
            <path d={L([[0.4 + i * 0.7, 0.3, 0.2], [0.4 + i * 0.7, 0.3, 0.95]], false)} stroke="#d9c8ff" strokeWidth={2} />
            <circle cx={(0.4 + i * 0.7 - 0.3) * HALF_W} cy={(0.3 + 0.3) * HALF_H - 1.1} r={4} fill="#e0d2ff" opacity={0.9} />
          </g>
        ))}
      </>
    ),
  },
  cathedral: {
    vb: [-110, -340, 270, 350],
    draw: () => (
      <>
        <IsoBox x={0.1} y={0.1} z={0} w={1.9} d={1.7} h={1.6} base="#c4bce0" />
        <Cone x={0.05} y={0.05} z={1.6} size={2} h={1.05} base="#7f6bb5" />
        <IsoBox x={0.85} y={0.85} z={2.5} w={0.3} d={0.3} h={0.55} base="#8f7fc0" />
        <Cone x={0.8} y={0.8} z={3.05} size={0.4} h={0.5} base="#c9b8ff" />
        <FrontWindow x={0.35} y={1.8} z={0.55} w={0.3} h={0.5} lit />
        <FrontWindow x={1.5} y={1.8} z={0.55} w={0.3} h={0.5} lit />
        <FrontDoor x={0.9} y={1.8} z={0.06} w={0.46} h={0.76} />
        <CircleGem x={1.0} y={1.0} z={2.42} r={5} />
      </>
    ),
  },

  // --- Dragon Peak ---------------------------------------------------------
  camp: {
    vb: [-90, -200, 240, 210],
    draw: () => (
      <>
        {/* tents */}
        {[[0.1, 0.2], [1.15, 0.5]].map(([tx, ty], i) => (
          <g key={i}>
            <polygon
              points={P([[tx, ty, 0], [tx + 0.9, ty, 0], [tx + 0.45, ty + 0.45, 0.8]])}
              fill={i === 0 ? ROOF_RED : ROOF_BROWN}
              stroke="#5a3d22"
              strokeWidth={1}
            />
            <polygon
              points={P([[tx, ty, 0], [tx + 0.9, ty, 0], [tx + 0.45, ty + 0.45, 0.8]])}
              fill={i === 0 ? shade(ROOF_RED, -0.2) : shade(ROOF_BROWN, -0.2)}
              opacity={0.35}
            />
          </g>
        ))}
        {/* campfire */}
        <polygon points={P([[1.5, 1.7, 0], [2.2, 1.7, 0], [2.2, 2.1, 0], [1.5, 2.1, 0]])} fill="#5a3d22" />
        <polygon points={P([[1.68, 1.9, 0.05], [1.86, 1.9, 0.05], [1.94, 1.9, 0.4], [1.77, 1.9, 0.4]])} fill="#ff9a3c" />
      </>
    ),
  },
  lair: {
    vb: [-100, -230, 250, 240],
    draw: () => (
      <>
        <polygon points={P([[0, 0, 0], [2, 0, 0], [2, 1.6, 1.2], [0, 1.6, 1.2]])} fill="#6b5a52" />
        <polygon points={P([[0, 1.6, 0], [2, 1.6, 0], [2, 1.6, 1.2], [0, 1.6, 1.2]])} fill="#877468" />
        <polygon points={P([[0.5, 1.6, 0], [1.4, 1.6, 0], [1.4, 1.6, 0.8], [0.5, 1.6, 0.8]])} fill="#2a1a14" />
        {/* dragon egg */}
        <polygon points={P([[1.5, 1.9, 0.02], [1.78, 1.9, 0.02], [1.64, 1.9, 0.46]])} fill="#9ad3c0" />
      </>
    ),
  },
  observatory: {
    vb: [-100, -300, 250, 310],
    draw: () => (
      <>
        <IsoBox x={0.2} y={0.2} z={0} w={1.5} d={1.5} h={1.2} base="#a89bb8" />
        <Cone x={0.1} y={0.1} z={1.2} size={1.7} h={0.9} base={ROOF_RED} />
        {/* dome + telescope slit */}
        <polygon points={P([[0.5, 0.9, 1.55], [1.4, 0.9, 1.55], [1.4, 0.9, 2.2], [0.5, 0.9, 2.2]])} fill="#4a3f5c" />
        <polygon points={P([[0.7, 1.2, 1.6], [0.7, 1.2, 2.3], [0.5, 1.2, 2.3], [0.5, 1.2, 1.6]])} fill="#cfc4e0" />
      </>
    ),
  },
  throne: {
    vb: [-80, -240, 210, 250],
    draw: () => (
      <>
        {/* dais */}
        <IsoBox x={0.1} y={0.1} z={0} w={1.8} d={1.6} h={0.3} base={STONE_DARK} />
        <IsoBox x={0.2} y={0.2} z={0.3} w={1.6} d={1.4} h={0.24} base={STONE} />
        {/* throne */}
        <IsoBox x={0.7} y={0.5} z={0.54} w={0.6} d={0.6} h={0.2} base={ROOF_RED} />
        <IsoBox x={0.7} y={0.5} z={0.74} w={0.6} d={0.16} h={0.9} base={ROOF_RED} />
        <Cone x={0.4} y={0.2} z={0.54} size={1.2} h={0} base={ROOF_ORANGE} />
        <Flag x={0.95} y={0.55} z={1.64} color={ROOF_RED} h={0.5} />
      </>
    ),
  },
};

/** Small cross for the chapel steeple. */
function CrossIcon({ x, y, z, h }) {
  return (
    <g stroke="#f0d98a" strokeWidth={2.4} strokeLinecap="round">
      <path d={L([[x, y, z], [x, y, z + h]], false)} />
      <path d={L([[x - 0.1, y, z + h * 0.65], [x + 0.1, y, z + h * 0.65]], false)} />
    </g>
  );
}

/** Floating gem, drawn on screen space (it hangs in the air). */
function CircleGem({ x, y, z, r }) {
  const p = { x: (x - y) * HALF_W, y: (x + y) * HALF_H - z };
  return <circle cx={p.x} cy={p.y} r={r} fill="#d9c8ff" opacity={0.9} />;
}

export { SPECS as ISO_SPECS };
