// Vegetation.
//
// The previous pass scattered 150 trees of two kinds at random, which read as
// "clusters of green circles" and swamped the buildings. Here:
//
//   * each species has its own silhouette — oak, pine, birch, and a young tree
//   * crowns are built from 3–5 overlapping lobes, never one circle
//   * sizes vary within a species, and old trees are deliberately rare
//   * woodland is placed as CLUSTERS in a belt outside the settlement, so the
//     village keeps isolated planted trees, hedges and gardens instead
//
// Lighting is consistent: light comes from the upper left, so the highlight lobe
// always sits up and to the left of the crown's centre.

import { shade } from "../iso";
import { P, L, at, px, rng, blob, screenPts } from "./geometry";
import { MAT } from "./palette";

/** Screen position of a tree's canopy anchor. */
const anchor = (x, y, z) => at(x, y, px(z));

/**
 * A broadleaf tree. `lean` shifts the crown so a stand of them doesn't line up.
 */
function Broadleaf({ x, y, z = 0, s = 1, deep, light, seed = 0 }) {
  const rand = rng(seed + 11);
  const a = anchor(x, y, z);
  const trunkH = (0.5 + rand() * 0.16) * s;
  const r = 20 * s;
  const lean = (rand() - 0.5) * 8 * s;
  const lobes = [
    { dx: -0.34, dy: -0.2, k: 0.72, c: light },
    { dx: 0.3, dy: -0.08, k: 0.66, c: shade(deep, -0.12) },
    { dx: 0.02, dy: 0.22, k: 0.7, c: deep },
    { dx: -0.05, dy: -0.42, k: 0.62, c: light },
  ];
  return (
    <g>
      <path d={L([[x, y, z], [x, y, z + trunkH]], false)} stroke="#6b4a2c" strokeWidth={3.4 * s} strokeLinecap="round" />
      {lobes.map((l, i) => (
        <ellipse
          key={i}
          cx={a.x + lean + l.dx * r}
          cy={a.y - px(trunkH) + l.dy * r}
          rx={r * l.k}
          ry={r * l.k * 0.82}
          fill={l.c}
        />
      ))}
      <ellipse cx={a.x + lean - r * 0.3} cy={a.y - px(trunkH) - r * 0.5} rx={r * 0.34} ry={r * 0.26} fill={shade(light, 0.22)} />
    </g>
  );
}

/** A conifer: stacked skirts, narrower and darker than a broadleaf. */
function Conifer({ x, y, z = 0, s = 1, deep, light, seed = 0 }) {
  const rand = rng(seed + 29);
  const a = anchor(x, y, z);
  const trunkH = 0.2 * s;
  const tiers = 3 + (rand() > 0.55 ? 1 : 0);
  const h = 30 * s;
  const out = [];
  for (let i = 0; i < tiers; i += 1) {
    const t = i / tiers;
    const yy = a.y - px(trunkH) - h * t * 0.86;
    const w = (13 - i * 2.2) * s;
    const th = (16 - i * 2) * s;
    out.push(
      <polygon
        key={i}
        points={`${a.x - w},${yy} ${a.x},${yy - th} ${a.x + w},${yy} ${a.x + w * 0.62},${yy + 3 * s} ${a.x - w * 0.62},${yy + 3 * s}`}
        fill={i % 2 ? deep : shade(deep, -0.1)}
      />,
    );
    // the lit left flank of each skirt
    out.push(
      <polygon
        key={`h${i}`}
        points={`${a.x - w},${yy} ${a.x},${yy - th} ${a.x - w * 0.1},${yy + 2 * s} ${a.x - w * 0.66},${yy + 2.4 * s}`}
        fill={i % 2 ? light : shade(light, -0.14)}
        opacity={0.75}
      />,
    );
  }
  return (
    <g>
      <path d={L([[x, y, z], [x, y, z + trunkH]], false)} stroke="#5a3f28" strokeWidth={3 * s} strokeLinecap="round" />
      {out}
    </g>
  );
}

/** A birch: slim white trunk with a light, airy crown. */
function Birch({ x, y, z = 0, s = 1, deep, light, seed = 0 }) {
  const rand = rng(seed + 41);
  const a = anchor(x, y, z);
  const trunkH = (0.62 + rand() * 0.14) * s;
  const r = 15 * s;
  return (
    <g>
      <path d={L([[x, y, z], [x, y, z + trunkH]], false)} stroke="#e8e2d2" strokeWidth={2.6 * s} strokeLinecap="round" />
      {[0.3, 0.52, 0.7].map((t, i) => (
        <path key={i} d={L([[x - 0.1, y, z + trunkH * t], [x + 0.08, y, z + trunkH * t]], false)} stroke="#5a4a3c" strokeWidth={1.5 * s} />
      ))}
      <ellipse cx={a.x - r * 0.28} cy={a.y - px(trunkH) - r * 0.4} rx={r * 0.78} ry={r * 0.72} fill={light} />
      <ellipse cx={a.x + r * 0.36} cy={a.y - px(trunkH) - r * 0.16} rx={r * 0.6} ry={r * 0.6} fill={deep} />
      <ellipse cx={a.x - r * 0.42} cy={a.y - px(trunkH) - r * 0.66} rx={r * 0.36} ry={r * 0.3} fill={shade(light, 0.24)} />
    </g>
  );
}

/** A young tree or a pollarded sapling — for village greens and gardens. */
function Sapling({ x, y, z = 0, s = 1, deep, light, seed = 0 }) {
  const rand = rng(seed + 53);
  const a = anchor(x, y, z);
  const trunkH = (0.22 + rand() * 0.1) * s;
  const r = 10 * s;
  return (
    <g>
      <path d={L([[x, y, z], [x, y, z + trunkH]], false)} stroke="#6b4a2c" strokeWidth={2.2 * s} strokeLinecap="round" />
      <ellipse cx={a.x} cy={a.y - px(trunkH) - r * 0.3} rx={r} ry={r * 0.85} fill={deep} />
      <ellipse cx={a.x - r * 0.34} cy={a.y - px(trunkH) - r * 0.56} rx={r * 0.6} ry={r * 0.5} fill={light} />
    </g>
  );
}

/**
 * Pick a species. Real woodland is mostly mixed: a few dominant trees, some
 * mid-story, some young ones filling gaps.
 */
export function speciesFor(rand) {
  const r = rand();
  if (r < 0.4) return "oak";
  if (r < 0.72) return "pine";
  if (r < 0.88) return "birch";
  return "young";
}

/**
 * One tree, of any species.
 *
 * Every tree is tagged with `data-role="tree"`, its species and its scale so
 * the scene can be audited: the brief requires seven-plus distinct kinds and a
 * size distribution where big trees are rare, and those are properties of the
 * rendered DOM, not of the source. See scripts/audit-scene.mjs.
 */
export function Tree({ x, y, z = 0, s = 1, kind = "oak", p, seed = 0 }) {
  const deep = kind === "pine" ? p.pine : kind === "birch" ? p.birch : p.oak;
  const light = kind === "pine" ? p.pineLight : kind === "birch" ? shade(p.birch, 0.14) : p.oakLight;
  const tag = { "data-role": "tree", "data-kind": kind, "data-s": s.toFixed(3), "data-gx": x.toFixed(3), "data-gy": y.toFixed(3) };
  if (kind === "pine") return <g {...tag}><Conifer x={x} y={y} z={z} s={s} deep={deep} light={light} seed={seed} /></g>;
  if (kind === "birch") return <g {...tag}><Birch x={x} y={y} z={z} s={s} deep={deep} light={light} seed={seed} /></g>;
  if (kind === "young") return <g {...tag}><Sapling x={x} y={y} z={z} s={s} deep={deep} light={light} seed={seed} /></g>;
  return <g {...tag}><Broadleaf x={x} y={y} z={z} s={s} deep={deep} light={light} seed={seed} /></g>;
}

/**
 * Scatter a woodland cluster. Trees are packed around a seed point with a
 * falloff, so the result has a dense middle and a ragged edge — which is what
 * makes a wood look like a wood instead of a grid of trees.
 */
export function woodland({ cx, cy, radius, count, rand, p, avoid, seed = 0, kinds = null }) {
  const out = [];
  let placed = 0;
  for (let i = 0; i < count * 8 && placed < count; i += 1) {
    // sqrt keeps the cluster dense in the middle without clumping dead-centre
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * radius;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.8;
    if (x < 0 || y < 0) continue;
    if (avoid && avoid(x, y)) continue;
    // big trees are rare; most of a wood is smaller stuff
    const roll = rand();
    const s = roll < 0.12 ? 0.95 + rand() * 0.3 : roll < 0.45 ? 0.7 + rand() * 0.2 : 0.5 + rand() * 0.18;
    const kind = kinds ? kinds[Math.floor(rand() * kinds.length)] : speciesFor(rand);
    out.push({ x, y, s, kind, seed: seed + placed });
    placed += 1;
  }
  return out;
}

/** Low scrub for a forest edge or a river bank. */
export function Shrub({ x, y, z = 0, s = 1, color, seed = 0 }) {
  const a = at(x, y, px(z));
  const rand = rng(seed + 7);
  const r = 7 * s;
  return (
    <g data-role="shrub" data-s={s.toFixed(3)}>
      {[
        { dx: -0.3, dy: 0.1, k: 0.8 },
        { dx: 0.34, dy: 0.12, k: 0.72 },
        { dx: 0.02, dy: -0.2, k: 0.86 },
      ].map((l, i) => (
        <ellipse
          key={i}
          cx={a.x + l.dx * r + (rand() - 0.5) * 2}
          cy={a.y + l.dy * r}
          rx={r * l.k}
          ry={r * l.k * 0.78}
          fill={i === 2 ? shade(color, 0.16) : color}
        />
      ))}
    </g>
  );
}

/** A clipped hedge — a run of small lobes, used for gardens and field edges. */
export function Hedge({ x, y, len = 2, angle = 0, z = 0, color }) {
  const steps = Math.max(2, Math.round(len * 3));
  const out = [];
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1) - 0.5;
    const hx = x + Math.cos(angle) * t * len;
    const hy = y + Math.sin(angle) * t * len;
    const a = at(hx, hy, px(z));
    out.push(<ellipse key={i} cx={a.x} cy={a.y - 7} rx={9} ry={7.5} fill={i % 2 ? color : shade(color, 0.12)} />);
    out.push(<ellipse key={`h${i}`} cx={a.x - 3} cy={a.y - 11} rx={5} ry={4} fill={shade(color, 0.2)} />);
  }
  return <g>{out}</g>;
}

/** Reeds along the water's edge, so the river doesn't end in a clean line. */
export function Reeds({ x, y, z = 0, s = 1, color = "#6f8f52", seed = 0 }) {
  const a = at(x, y, px(z));
  const rand = rng(seed + 3);
  // Tagged so the scene audit can see them. They were emitted as a bare <g>
  // with no role, which meant a whole riverside dressing drew correctly and was
  // invisible to every instrument - the audit reported `reeds: 0` on a scene with
  // a dozen reed clumps along its river. An instrument that cannot see the thing
  // it measures will quietly pass a check that is not being made.
  return (
    <g data-role="reeds" data-s={s.toFixed(3)} data-gx={x.toFixed(3)} data-gy={y.toFixed(3)} stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none">
      {Array.from({ length: 4 }, (_, i) => {
        const dx = (rand() - 0.5) * 8;
        const h = 6 + rand() * 7;
        return <path key={i} d={`M${a.x + dx},${a.y} Q${a.x + dx + 2},${a.y - h * 0.6} ${a.x + dx + 1},${a.y - h}`} />;
      })}
    </g>
  );
}

/** A boulder or outcrop, for rocky ground and river shallows. */
export function Rock({ x, y, z = 0, s = 1, color = "#8f8879", seed = 0 }) {
  const a = at(x, y, px(z));
  const rand = rng(seed + 17);
  const r = 6 * s;
  const ring = blob(0, 0, 1, { seed, wobble: 0.3, lobes: 6, steps: 4 });
  return (
    <g data-role="rock" data-s={s.toFixed(3)}>
      <polygon
        points={ring.map(([dx, dy]) => `${a.x + dx * r * 1.2},${a.y + dy * r * 0.8 - r * 0.2}`).join(" ")}
        fill={color}
      />
      <ellipse cx={a.x - r * 0.3} cy={a.y - r * 0.6} rx={r * 0.5} ry={r * 0.36} fill={shade(color, 0.2)} />
    </g>
  );
}

/** A small flower patch. Many of these, in a handful of colours. */
export function Flowers({ x, y, z = 0, s = 1, color, seed = 0 }) {
  const a = at(x, y, px(z));
  const rand = rng(seed + 23);
  return (
    <g data-role="flowers">
      {Array.from({ length: 3 }, (_, i) => (
        <g key={i}>
          <path
            d={`M${a.x + (rand() - 0.5) * 12},${a.y} L${a.x + (rand() - 0.5) * 12},${a.y - 5}`}
            stroke="#4e9159"
            strokeWidth={1.2}
          />
          <circle
            cx={a.x + (rand() - 0.5) * 12}
            cy={a.y - 6}
            r={1.9}
            fill={i === 0 ? color : i === 1 ? "#ffffff" : color}
          />
        </g>
      ))}
    </g>
  );
}
