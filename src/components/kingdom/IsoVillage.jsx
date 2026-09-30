// Isometric village — the kingdom as a real place.
//
// Everything is drawn on one diamond grid and painted back-to-front by sorting
// on (gx + gy), which is what sells the depth. Compared with the old flat
// side-on strip, the village has: a hill the castle stands on, a river that
// actually runs through the settlement with bridges over it, roads connecting
// the houses, trees and hedgerows, a perimeter wall, and props that fill the
// gaps between plots.
//
// Because the grid is 3D, buildings can now sit *on* terrain at different
// heights instead of all sharing one ground line.

import { useMemo } from "react";
import {
  iso, path, pts, boxFaces, boxTones, shade, HALF_W, HALF_H, TILE_W, TILE_H,
} from "./iso";
import { IsoBuildingShapes } from "./IsoBuilding";
import PetArt from "./petArt";
import { KINGDOMS, PLOT, plotState, castleBuilt } from "../../game/kingdom";

const N = 13; // grid is 0..N in both axes
const WIDTH = N * TILE_W;
const HEIGHT = N * TILE_H;

// Terrain palette per territory, so each region still feels like itself.
const GROUND = {
  forest: { a: "#7cc07f", b: "#5da565", edge: "#4a8551", tree: "#3f7a4a", treeAlt: "#599b58" },
  river: { a: "#8fc98f", b: "#6fae72", edge: "#579055", tree: "#4a8f57", treeAlt: "#68a85f" },
  highland: { a: "#94b06a", b: "#7b9757", edge: "#63794a", tree: "#41613f", treeAlt: "#597a4a" },
  cavern: { a: "#9b8fd0", b: "#8174bb", edge: "#6a5e9c", tree: "#5b5299", treeAlt: "#6f65ad" },
  peak: { a: "#c98f6e", b: "#a87356", edge: "#8a5c44", tree: "#7a4a3a", treeAlt: "#96604a" },
};

const WATER = { a: "#7fc0e8", b: "#4f9ccc" };

// ---------------------------------------------------------------------------
// Terrain pieces
// ---------------------------------------------------------------------------

function Ground({ t }) {
  return (
    <>
      {/* grass slab, given thickness so the world reads as a solid block */}
      <polygon
        points={pts([[0, N, -14], [N, N, -14], [N, 0, -14], [0, 0, -14]])}
        fill={t.edge}
      />
      <polygon
        points={pts([[0, 0, 0], [N, 0, 0], [N, N, 0], [0, N, 0]])}
        fill={t.a}
      />
      {/* subtle field banding for texture */}
      {Array.from({ length: 7 }, (_, i) => {
        const gy = 1.4 + i * 1.6;
        return (
          <polygon
            key={i}
            points={pts([[0.4, gy, 0], [N - 0.4, gy, 0], [N - 0.4, gy + 0.7, 0], [0.4, gy + 0.7, 0]])}
            fill={t.b}
            opacity={0.16}
          />
        );
      })}
    </>
  );
}

/** The river: a band that runs across the grid, widening toward the viewer. */
function River() {
  const centre = (x) => 7.4 + Math.sin(x / 2.6) * 1.5;
  const half = 1.05;
  const top = [];
  const bottom = [];
  for (let x = -0.5; x <= N + 0.5; x += 0.5) {
    top.push([x, centre(x) - half, -0.4]);
    bottom.push([x, centre(x) + half, -0.4]);
  }
  return (
    <g>
      <polygon points={pts([...top, ...bottom.reverse()])} fill={WATER.a} />
      <polygon
        points={pts(
          top.map((p) => [p[0], p[1] + 0.35, -0.35]).concat(bottom.map((p) => [p[0], p[1] - 0.2, -0.35]).reverse())
        )}
        fill={WATER.b}
        opacity={0.55}
      />
    </g>
  );
}

/** A road that follows the river bank and links the settlement together. */
function Road() {
  const line = (offset) => {
    const out = [];
    for (let x = 0; x <= N; x += 0.6) {
      out.push([x, 5.1 + Math.sin(x / 2.6 + offset) * 1.5 + 2.5, 0.02]);
    }
    return out;
  };
  const a = line(0);
  const b = line(0).map((p) => [p[0], p[1] + 0.62, 0.02]);
  return (
    <polygon points={pts([...a, ...b.reverse()])} fill="#d8c39a" opacity={0.9} />
  );
}

/** A raised mound the castle stands on, at the back of the village. */
function CastleHill({ t }) {
  const cx = 3.2;
  const cy = 3.2;
  const r = 3.5;
  const h = 1.5;
  const ring = [];
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  const topRing = ring.map((p) => [p[0], p[1], h]);
  return (
    <g>
      <polygon points={pts([...ring, ...ring.slice().reverse()])} fill={t.b} opacity={0.35} />
      <polygon points={pts(topRing)} fill={shade(t.a, 0.12)} />
      <polygon
        points={pts([...ring.map((p) => [p[0], p[1], 0.02]), ...topRing.slice().reverse()])}
        fill={shade(t.a, -0.06)}
        opacity={0.9}
      />
      <polygon points={pts(topRing)} fill={shade(t.a, 0.1)} />
    </g>
  );
}

/** A conifer: trunk plus a couple of stacked cones. */
function Tree({ x, y, z = 0, scale = 1, color, alt }) {
  const s = 0.5 * scale;
  return (
    <g>
      <polygon
        points={pts([[x, y, z], [x + 0.16 * scale, y, z], [x + 0.16 * scale, y, z + 0.5 * scale], [x, y, z + 0.5 * scale]])}
        fill="#6b4a2c"
      />
      <polygon
        points={pts([
          [x - 0.02 * scale, y, z + 0.25 * scale],
          [x + 0.24 * scale, y, z + 0.25 * scale],
          [x + 0.11 * scale, y + 0.11 * scale, z + 1.15 * scale],
        ])}
        fill={color}
      />
      <polygon
        points={pts([
          [x + 0.24 * scale, y, z + 0.25 * scale],
          [x + 0.24 * scale, y + 0.16 * scale, z + 0.25 * scale],
          [x + 0.11 * scale, y + 0.11 * scale, z + 1.15 * scale],
        ])}
        fill={alt}
      />
    </g>
  );
}

/** A round bush — cheap filler that still sits correctly on the grid. */
function Bush({ x, y, z = 0, scale = 1, color }) {
  return (
    <polygon
      points={pts([
        [x - 0.2 * scale, y, z],
        [x + 0.3 * scale, y, z],
        [x + 0.3 * scale, y + 0.22 * scale, z],
        [x - 0.2 * scale, y + 0.22 * scale, z],
        [x + 0.05 * scale, y + 0.11 * scale, z + 0.34 * scale],
      ])}
      fill={color}
    />
  );
}

/** A low stone perimeter wall, built from short boxes around the edge. */
function Wall({ t }) {
  const segs = [];
  const push = (x, y) => segs.push([x, y]);
  // back and left edges (drawn first, they are furthest away)
  for (let i = 0; i < N; i += 1) {
    push(i + 0.5, 0.5);
    push(0.5, i + 0.5);
  }
  return (
    <g>
      {segs.map(([x, y], i) => (
        <WallSeg key={i} x={x} y={y} base={shade(t.edge, 0.2)} />
      ))}
    </g>
  );
}

function WallSeg({ x, y, base }) {
  const f = boxFaces(x, y, 0, 0.9, 0.34, 0.62);
  const t = boxTones(base);
  return (
    <g>
      <polygon points={pts(f.front)} fill={t.front} stroke={t.line} strokeWidth={0.5} />
      <polygon points={pts(f.right)} fill={t.right} stroke={t.line} strokeWidth={0.5} />
      <polygon points={pts(f.top)} fill={t.top} stroke={t.line} strokeWidth={0.5} />
    </g>
  );
}

/** A plot waiting to be built: cleared ground or wild scrub. */
function Plot({ x, y, state, wildGlyph, tint, onClick, label }) {
  const base = state === PLOT.WILD ? shade(tint, -0.1) : "#cbb68e";
  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      role={onClick ? "button" : undefined}
      aria-label={label}
    >
      <polygon
        points={pts([[x, y, 0.02], [x + 1.7, y, 0.02], [x + 1.7, y + 1.5, 0.02], [x, y + 1.5, 0.02]])}
        fill={base}
        stroke={shade(base, -0.25)}
        strokeWidth={0.8}
        strokeDasharray={state === PLOT.WILD ? "3 2" : undefined}
      />
      {state === PLOT.WILD && (
        <polygon
          points={pts([[x + 0.4, y + 0.4, 0.04], [x + 1.2, y + 0.4, 0.04], [x + 1.2, y + 1.0, 0.04], [x + 0.4, y + 1.0, 0.04]])}
          fill={shade(base, -0.18)}
          opacity={0.7}
        />
      )}
      {state === PLOT.CLEARED && (
        <g>
          {[0, 1].map((i) => (
            <path
              key={i}
              d={path([[x + 0.3, y + 0.5 + i * 0.5, 0.04], [x + 1.4, y + 0.5 + i * 0.5, 0.04]], false)}
              stroke={shade(base, -0.2)}
              strokeWidth={0.5}
              opacity={0.6}
            />
          ))}
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Village layout
// ---------------------------------------------------------------------------

/**
 * Where each building sits. Chosen by hand so the settlement reads as a place:
 * the castle is up on the hill, the houses cluster along the road, and the
 * odd jobs (market, dock) sit at the edges where they belong.
 */
const LAYOUT = {
  greenwoodcastle: [2.4, 2.2, 0, true],
  cottage: [5.6, 1.2, 0, false],
  bakery: [5.4, 3.3, 0, false],
  well: [7.4, 3.0, 0, false],
  market: [7.6, 1.0, 0, false],
  schoolhouse: [3.4, 5.4, 0, false],
  townhall: [5.6, 5.6, 0, false],

  rivercastle: [2.4, 2.2, 0, true],
  dock: [9.6, 3.0, 0, false],
  mill: [5.8, 1.4, 0, false],
  bridge: [8.2, 6.6, 0, false],
  fishery: [10.4, 1.4, 0, false],
  inn: [5.8, 4.6, 0, false],

  highlandcastle: [2.4, 2.2, 0, true],
  watchtower: [5.2, 1.2, 0, false],
  barracks: [5.6, 5.8, 0, false],
  chapel: [8.2, 2.2, 0, false],
  greatkeep: [5.6, 3.6, 0, false],

  crystalcastle: [2.4, 2.2, 0, true],
  mine: [5.2, 1.0, 0, false],
  gemcutter: [5.6, 4.8, 0, false],
  bridgeoflight: [8.2, 6.6, 0, false],
  cathedral: [5.6, 3.2, 0, false],

  dragoncastle: [2.4, 2.2, 0, true],
  camp: [5.4, 2.8, 0, false],
  lair: [5.6, 6.0, 0, false],
  observatory: [8.6, 2.6, 0, false],
  throne: [5.6, 4.4, 0, false],
};

export default function IsoVillage({ kingdomId, built = {}, onSelectPlot, justBuilt, companion }) {
  const kingdom = useMemo(
    () => KINGDOMS.find((k) => k.id === kingdomId) || KINGDOMS[0],
    [kingdomId]
  );
  const t = GROUND[kingdom.theme] || GROUND.forest;

  // Scenery is generated once per kingdom from a fixed seed, so it is stable
  // between renders but differs per territory.
  const scenery = useMemo(() => {
    const trees = [];
    const bushes = [];
    // Keep trees off the building footprints and the river.
    const blocked = (x, y) =>
      x < 9.6 && y < 9.6 && x > 0.4 && y > 0.4 && !(x > 6.2 && x < 9.0 && y > 5.6 && y < 8.6);
    let seed = kingdom.id * 7919;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 90 && trees.length < 26; i += 1) {
      const x = 0.6 + rnd() * (N - 1.4);
      const y = 0.6 + rnd() * (N - 1.4);
      if (!blocked(x, y)) continue;
      trees.push({ x, y, s: 0.75 + rnd() * 0.6, alt: rnd() > 0.5 });
    }
    for (let i = 0; i < 60 && bushes.length < 22; i += 1) {
      const x = 0.7 + rnd() * (N - 1.6);
      const y = 0.7 + rnd() * (N - 1.6);
      if (!blocked(x, y)) continue;
      bushes.push({ x, y, s: 0.7 + rnd() * 0.7 });
    }
    return { trees, bushes };
  }, [kingdom.id]);

  // Everything that needs depth sorting goes through here.
  const items = useMemo(() => {
    const out = [];

    for (const tr of scenery.trees) {
      out.push({
        depth: tr.x + tr.y,
        key: `t${tr.x.toFixed(2)}_${tr.y.toFixed(2)}`,
        draw: (
          <Tree
            x={tr.x}
            y={tr.y}
            scale={tr.s}
            color={tr.alt ? t.treeAlt : t.tree}
            alt={shade(tr.alt ? t.treeAlt : t.tree, -0.2)}
          />
        ),
      });
    }
    for (const b of scenery.bushes) {
      out.push({
        depth: b.x + b.y,
        key: `b${b.x.toFixed(2)}_${b.y.toFixed(2)}`,
        draw: <Bush x={b.x} y={b.y} scale={b.s} color={shade(t.tree, 0.08)} />,
      });
    }

    for (const b of kingdom.buildings) {
      const spot = LAYOUT[b.id] || [5.5, 3, 0, false];
      const [x, y, z, isCastle] = spot;
      const state = plotState(built, b.id);

      if (state === PLOT.BUILT) {
        out.push({
          depth: x + y + 2.2, // buildings sort in front of trees on their plot
          key: b.id,
          draw: (
            <g>
              {/* the building's own ground shadow, in the grid plane */}
              <polygon
                points={pts([
                  [x - 0.1, y - 0.1, z + 0.01],
                  [x + 2.0, y - 0.1, z + 0.01],
                  [x + 2.0, y + 1.8, z + 0.01],
                  [x - 0.1, y + 1.8, z + 0.01],
                ])}
                fill="#000"
                opacity={0.16}
              />
              <g transform={`translate(${iso(x, y, z).x}, ${iso(x, y, z).y})`}>
                <IsoBuildingShapes id={b.id} />
              </g>
            </g>
          ),
        });
      } else {
        out.push({
          depth: x + y,
          key: `${b.id}-plot`,
          draw: (
            <Plot
              x={x}
              y={y}
              state={state}
              wildGlyph={kingdom.wild}
              tint={t.edge}
              onClick={onSelectPlot ? () => onSelectPlot(b) : undefined}
              label={`${state === PLOT.WILD ? "Wild land" : "Cleared land"} — ${b.name}`}
            />
          ),
        });
      }
    }

    out.sort((a, b) => a.depth - b.depth);
    return out;
  }, [kingdom, built, scenery, onSelectPlot, t]);

  const builtCount = kingdom.buildings.filter((b) => plotState(built, b.id) === PLOT.BUILT).length;

  return (
    <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", position: "relative", boxShadow: "var(--shadow)" }}>
      <svg
        viewBox={`${-WIDTH / 2 - 24} -112 ${WIDTH + 48} ${HEIGHT + 166}`}
        width="100%"
        style={{ display: "block" }}
        role="img"
        aria-label={`${kingdom.name}, ${builtCount} of ${kingdom.buildings.length} buildings built`}
      >
        <defs>
          <linearGradient id={`iso-sky-${kingdom.theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shade(t.a, 0.42)} />
            <stop offset="100%" stopColor={shade(t.a, 0.2)} />
          </linearGradient>
        </defs>

        {/* sky behind the world block */}
        <rect x={-WIDTH / 2 - 24} y={-112} width={WIDTH + 48} height={HEIGHT + 166} fill={`url(#iso-sky-${kingdom.theme})`} />

        <Ground t={t} />
        <CastleHill t={t} />
        <River />
        <Road />
        <Wall t={t} />

        {items.map((it) => (
          <g key={it.key}>{it.draw}</g>
        ))}

        {/* the player's companion wandering the village */}
        {companion && (
          <g
            style={{ animation: "ks-float 4s ease-in-out infinite" }}
            transform={`translate(${(6.6 - 4.4) * HALF_W}, ${(6.6 + 4.4) * HALF_H - 10})`}
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
