// Villagers.
//
// Brief §15: small animated inhabitants that walk roads, cross bridges, stand
// at markets, work around farms. They must not dominate the scene, so a person
// is about 13px tall against a 96px cottage — visible enough to read as
// inhabited, small enough to be scenery.
//
// They are pure presentation. `t` is a single normalised clock value (0..1) the
// parent drives, so a whole crowd shares one timeline and the renderer stays a
// pure function of state — which keeps the scene snapshot testable.

import { shade } from "../iso";
import { at, px, rng } from "./geometry";

/** Where a villager is, given their anchor and position along their path. */
export function walkerPos(x, y, t, path) {
  const n = path.length - 1;
  const f = ((t % 1) + 1) % 1;
  const idx = f * n;
  const i = Math.floor(idx);
  const u = idx - i;
  const a = path[i];
  const b = path[Math.min(n, i + 1)];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, u];
}

const CLOTH = ["#c1503f", "#4a6fa5", "#d98a3c", "#7a5a8c", "#3f7f8a", "#8a5a34", "#6b7f3c"];
const SKIN = ["#f2c9a0", "#e0a878", "#c78a58", "#8a5a34"];

/**
 * A villager. `phase` shifts the walk cycle so a crowd isn't in lockstep, and
 * `facing` (0 = right, 1 = left) flips them.
 */
export function Villager({ x, y, z = 0, seed = 0, phase = 0, facing = 0, s = 1, carry = null }) {
  const g = at(x, y, px(z));
  const rand = rng(seed + 101);
  const cloth = CLOTH[Math.floor(rand() * CLOTH.length)];
  const skin = SKIN[Math.floor(rand() * SKIN.length)];
  const hair = ["#3d2a19", "#5a3f28", "#8a5a34", "#c9a86a"][Math.floor(rand() * 4)];
  // Two-frame walk cycle: one leg forward, one back.
  const swing = Math.sin((phase + seed * 0.37) * Math.PI * 2) > 0 ? 1 : -1;
  const bob = Math.abs(Math.cos((phase + seed * 0.37) * Math.PI * 2)) * 0.9 * s;
  const flip = facing ? -1 : 1;
  const u = 3.4 * s;

  return (
    <g data-role="villager" data-seed={seed}
      transform={`translate(${g.x} ${g.y}) scale(${flip} 1)`}>
      <ellipse cx={0} cy={1 * s} rx={3.4 * s} ry={1.5 * s} fill="#2c3a26" opacity={0.24} />
      <g transform={`translate(0 ${-bob})`}>
        {/* legs */}
        <g stroke={shade(cloth, -0.34)} strokeWidth={1.5 * s} strokeLinecap="round">
          <path d={`M${-0.7 * s},${-4.4 * s} L${-0.7 * s + swing * u * 0.6},${0}`} />
          <path d={`M${0.7 * s},${-4.4 * s} L${0.7 * s - swing * u * 0.6},${0}`} />
        </g>
        {/* body */}
        <path
          d={`M${-2.5 * s},${-4.2 * s} L${2.5 * s},${-4.2 * s} L${2.1 * s},${-9.2 * s} L${-2.1 * s},${-9.2 * s} Z`}
          fill={cloth}
        />
        <path d={`M${-2.5 * s},${-4.2 * s} L${-0.2 * s},${-4.2 * s} L${-0.2 * s},${-9.2 * s} L${-2.1 * s},${-9.2 * s} Z`} fill={shade(cloth, 0.18)} />
        {/* arm */}
        <path
          d={`M${1.6 * s},${-8.4 * s} L${2.9 * s},${-5.6 * s + swing * 1.2 * s}`}
          stroke={skin}
          strokeWidth={1.3 * s}
          strokeLinecap="round"
        />
        {/* head */}
        <circle cx={0.3 * s} cy={-11 * s} r={2.3 * s} fill={skin} />
        <path
          d={`M${-2 * s},${-11.6 * s} A${2.4 * s},${2.2 * s} 0 0 1 ${2.6 * s},${-11.6 * s} L${2.6 * s},${-12.2 * s} L${-2 * s},${-12.2 * s} Z`}
          fill={hair}
        />
        {carry === "basket" && (
          <ellipse cx={3.1 * s} cy={-4.6 * s + swing * 1.2 * s} rx={2.2 * s} ry={1.7 * s} fill="#a3714a" />
        )}
        {carry === "sack" && (
          <ellipse cx={-2.6 * s} cy={-5.4 * s} rx={2 * s} ry={2.4 * s} fill="#c9a86a" />
        )}
      </g>
    </g>
  );
}

/**
 * A crowd. `paths` are polylines in grid space; people walk along them at
 * different speeds and starting offsets, so the road has traffic.
 */
export function Crowd({ walkers, clock = 0, z = 0 }) {
  return (
    <g>
      {walkers.map((w, i) => {
        const [x, y, u] = walkerPos(w.path[0][0], w.path[0][1], clock * w.speed + w.offset, w.path);
        return (
          <Villager
            key={i}
            x={x}
            y={y}
            z={z + (w.z || 0)}
            seed={w.seed ?? i}
            phase={(clock * w.speed * 3 + w.offset) % 1}
            facing={Math.cos(u) >= 0 ? 0 : 1}
            s={w.s || 1}
            carry={w.carry}
          />
        );
      })}
    </g>
  );
}
