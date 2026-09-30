// Props: the small stuff.
//
// Brief's list, and all of it is here: carts, barrels, crates, hay stacks,
// wells, benches, signs, wagons, laundry, chickens, sheep, cows, flower gardens,
// campfires, wood piles, boats, fishing docks, scarecrows, fountains, statues,
// banners.
//
// None of it is interactive. It carries no game state. Its only job is to stop
// the kingdom looking like an architect's model with the furniture left out —
// because empty ground around a building is what makes a scene read as
// unfinished.
//
// Everything is drawn in screen space anchored to an isometric projection, so
// props sit on the ground correctly without needing a footprint.

import { shade } from "../iso";
import { P, L, at, px, rng } from "./geometry";
import { MAT } from "./palette";

/** Where a prop's ground anchor is, in screen pixels. */
const a = (x, y, z = 0) => at(x, y, px(z));

/** A soft contact shadow, so props sit on the grass instead of floating. */
function shadow(cx, cy, rx, ry, op = 0.2) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#2c3a26" opacity={op} />;
}

// ---------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------

export function Barrel({ x, y, z = 0, s = 1, tilt = 0 }) {
  const g = a(x, y, z);
  const w = 4.2 * s;
  const h = 8 * s;
  return (
    <g data-role="prop" data-prop="barrel" transform={`rotate(${tilt} ${g.x} ${g.y})`}>
      {shadow(g.x, g.y, w * 1.1, w * 0.5, 0.22)}
      <ellipse cx={g.x} cy={g.y - h} rx={w} ry={w * 0.5} fill="#8a5a34" />
      <path d={`M${g.x - w},${g.y - h} L${g.x - w * 1.12},${g.y} A${w * 1.12},${w * 0.5} 0 0 0 ${g.x + w * 1.12},${g.y} L${g.x + w},${g.y - h} Z`} fill="#a3714a" />
      <ellipse cx={g.x - w * 0.3} cy={g.y - h - w * 0.14} rx={w * 0.5} ry={w * 0.26} fill="#c08a5c" />
      <path d={`M${g.x - w * 1.05},${g.y - h * 0.62} L${g.x + w * 1.05},${g.y - h * 0.62}`} stroke="#5a3f28" strokeWidth={1.3 * s} />
      <path d={`M${g.x - w * 1.08},${g.y - h * 0.24} L${g.x + w * 1.08},${g.y - h * 0.24}`} stroke="#5a3f28" strokeWidth={1.3 * s} />
    </g>
  );
}

export function Crate({ x, y, z = 0, s = 1, stack = 1 }) {
  const g = a(x, y, z);
  const w = 4.6 * s;
  const h = 4.2 * s;
  return (
    <g data-role="prop" data-prop="crate">
      {shadow(g.x, g.y, w * 1.2, w * 0.55, 0.2)}
      {Array.from({ length: stack }, (_, i) => {
        const o = i * (h + 0.6) * s;
        const sw = i % 2 ? w * 0.82 : w;
        const jx = i % 2 ? 0.8 * s : -0.5 * s;
        return (
          <g key={i}>
            <polygon
              points={`${g.x + jx - sw},${g.y - o} ${g.x + jx},${g.y - o - sw * 0.5} ${g.x + jx + sw},${g.y - o} ${g.x + jx},${g.y - o + sw * 0.5}`}
              fill={i % 2 ? "#b08b52" : "#9c7846"}
            />
            <polygon
              points={`${g.x + jx + sw},${g.y - o} ${g.x + jx + sw * 0.62},${g.y - o - h} ${g.x + jx - sw * 0.06},${g.y - o - h * 0.5} ${g.x + jx + sw * 0.06},${g.y - o - sw * 0.5}`}
              fill={i % 2 ? "#8a6636" : "#7a592e"}
            />
            <polygon
              points={`${g.x + jx + sw * 0.06},${g.y - o - sw * 0.5} ${g.x + jx + sw * 0.62},${g.y - o - h} ${g.x + jx - sw * 0.06},${g.y - o - h * 0.5}`}
              fill={i % 2 ? "#c8a067" : "#b8914f"}
            />
            <path
              d={`M${g.x + jx + sw * 0.07},${g.y - o - sw * 0.5} L${g.x + jx + sw * 0.61},${g.y - o - h + 0.5}`}
              stroke="#6b4a2c"
              strokeWidth={0.9 * s}
            />
          </g>
        );
      })}
    </g>
  );
}

export function Haystack({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  const r = 9 * s;
  const h = 15 * s;
  return (
    <g data-role="prop" data-prop="haystack">
      {shadow(g.x, g.y, r * 1.5, r * 0.66, 0.2)}
      <ellipse cx={g.x} cy={g.y - r * 0.7} rx={r * 1.28} ry={r * 0.9} fill="#c9a86a" />
      <ellipse cx={g.x} cy={g.y - r * 0.9} rx={r * 1.1} ry={r * 0.8} fill={shade("#c9a86a", 0.08)} />
      <ellipse cx={g.x} cy={g.y - h} rx={r * 0.42} ry={r * 0.36} fill="#b18d4e" />
      <g stroke="#a8863f" strokeWidth={0.9 * s} opacity={0.6} fill="none">
        <path d={`M${g.x - r * 0.9},${g.y - r * 0.8} Q${g.x},${g.y - r * 1.5} ${g.x + r * 0.9},${g.y - r * 0.8}`} />
        <path d={`M${g.x - r * 1.1},${g.y - r * 0.3} Q${g.x},${g.y - r} ${g.x + r * 1.1},${g.y - r * 0.3}`} />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

/** A two-wheeled cart. One of the highest-value details per pixel. */
export function Cart({ x, y, z = 0, s = 1, loaded = false }) {
  const g = a(x, y, z);
  const w = 12 * s;
  const h = 5.5 * s;
  return (
    <g data-role="prop" data-prop="cart">
      {shadow(g.x, g.y, w * 1.5, w * 0.55, 0.2)}
      {/* bed */}
      <polygon
        points={`${g.x - w},${g.y - h * 1.5} ${g.x},${g.y - h * 2.1} ${g.x + w},${g.y - h * 1.5} ${g.x},${g.y - h * 0.9}`}
        fill="#8a5a34"
      />
      <polygon
        points={`${g.x - w},${g.y - h * 1.5} ${g.x},${g.y - h * 2.1} ${g.x},${g.y - h * 1.5} ${g.x - w},${g.y - h * 0.9}`}
        fill="#6b4a2c"
      />
      <polygon
        points={`${g.x + w},${g.y - h * 1.5} ${g.x},${g.y - h * 2.1} ${g.x},${g.y - h * 1.5} ${g.x + w},${g.y - h * 0.9}`}
        fill="#a3714a"
      />
      {/* wheels */}
      {[g.x - w * 0.72, g.x + w * 0.72].map((cx, i) => (
        <g key={i}>
          <ellipse cx={cx} cy={g.y - w * 0.34} rx={w * 0.3} ry={w * 0.34} fill="#5a3f28" />
          <ellipse cx={cx} cy={g.y - w * 0.34} rx={w * 0.19} ry={w * 0.22} fill="#a3714a" />
          <g stroke="#3d2a19" strokeWidth={0.9 * s}>
            <path d={`M${cx - w * 0.24},${g.y - w * 0.34} L${cx + w * 0.24},${g.y - w * 0.34}`} />
            <path d={`M${cx},${g.y - w * 0.34 - w * 0.3} L${cx},${g.y - w * 0.34 + w * 0.3}`} />
          </g>
        </g>
      ))}
      {/* shafts */}
      <g stroke="#6b4a2c" strokeWidth={1.6 * s} strokeLinecap="round">
        <path d={`M${g.x - w * 0.6},${g.y - h * 1.3} L${g.x - w * 1.9},${g.y - h * 0.5}`} />
        <path d={`M${g.x - w * 0.3},${g.y - h * 1.7} L${g.x - w * 1.9},${g.y - h * 0.6}`} />
      </g>
      {loaded && (
        <>
          <ellipse cx={g.x - w * 0.35} cy={g.y - h * 1.9} rx={w * 0.44} ry={w * 0.3} fill="#c9a86a" />
          <ellipse cx={g.x + w * 0.3} cy={g.y - h * 1.85} rx={w * 0.36} ry={w * 0.26} fill="#d9bb7c" />
        </>
      )}
    </g>
  );
}

/** A rowing boat, moored at the bank. */
export function Boat({ x, y, z = 0, s = 1, angle = 0 }) {
  const g = a(x, y, z);
  return (
    <g data-role="prop" data-prop="boat" transform={`rotate(${angle} ${g.x} ${g.y})`}>
      <ellipse cx={g.x} cy={g.y} rx={13 * s} ry={4.5 * s} fill="#5a3f28" />
      <ellipse cx={g.x} cy={g.y - 2 * s} rx={11.5 * s} ry={3.4 * s} fill="#a3714a" />
      <path d={`M${g.x - 9 * s},${g.y - 2 * s} L${g.x + 9 * s},${g.y - 3 * s}`} stroke="#7a592e" strokeWidth={1.4 * s} />
      <ellipse cx={g.x - 2 * s} cy={g.y - 3.4 * s} rx={4 * s} ry={1.6 * s} fill="#c8a067" />
    </g>
  );
}

/** A plank fishing dock reaching over the water. */
export function Dock({ x, y, z = 0, len = 1.6, w = 0.6 }) {
  return (
    <g data-role="prop" data-prop="dock">
      <polygon points={P([[x, y, z], [x + len, y, z], [x + len, y + w, z], [x, y + w, z]])} fill="#8a5a34" />
      <g stroke="#6b4a2c" strokeWidth={0.9} opacity={0.5}>
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={L([[x + (len / 6) * i, y, z], [x + (len / 6) * i, y + w, z]], false)} />
        ))}
      </g>
      {/* posts */}
      {[0, 1].map((i) => (
        <g key={i}>
          <path d={L([[x + len - 0.2 + i * 0.2, y + 0.08, z], [x + len - 0.2 + i * 0.2, y + 0.08, z - 0.22]], false)} stroke="#5a3f28" strokeWidth={2.4} />
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Structures
// ---------------------------------------------------------------------------

/** A stone well with a bucket on a rope. */
export function Well({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  const r = 7.5 * s;
  const h = 12 * s;
  return (
    <g data-role="prop" data-prop="well">
      {shadow(g.x, g.y, r * 1.5, r * 0.7, 0.22)}
      <ellipse cx={g.x} cy={g.y} rx={r} ry={r * 0.6} fill="#8f8879" />
      <ellipse cx={g.x} cy={g.y - 2.4 * s} rx={r * 0.66} ry={r * 0.4} fill="#2c3a33" />
      <path d={`M${g.x - r},${g.y - 2.4 * s} L${g.x - r},${g.y - h} L${g.x + r},${g.y - h} L${g.x + r},${g.y - 2.4 * s} A${r},${r * 0.6} 0 0 1 ${g.x - r},${g.y - 2.4 * s} Z`} fill="#b8b0a2" />
      <ellipse cx={g.x} cy={g.y - h} rx={r} ry={r * 0.6} fill="#cec7b8" />
      <ellipse cx={g.x} cy={g.y - h} rx={r * 0.6} ry={r * 0.36} fill="#2c3a33" />
      {/* posts and a little roof */}
      <g stroke="#6b4a2c" strokeWidth={2.2 * s} strokeLinecap="round">
        <path d={`M${g.x - r * 0.7},${g.y - h} L${g.x - r * 0.7},${g.y - h - 9 * s}`} />
        <path d={`M${g.x + r * 0.7},${g.y - h} L${g.x + r * 0.7},${g.y - h - 9 * s}`} />
      </g>
      <polygon
        points={`${g.x - r * 1.2},${g.y - h - 8 * s} ${g.x},${g.y - h - 15 * s} ${g.x + r * 1.2},${g.y - h - 8 * s} ${g.x + r * 0.9},${g.y - h - 6.4 * s} ${g.x - r * 0.9},${g.y - h - 6.4 * s}`}
        fill="#8a5a34"
      />
      <path d={`M${g.x},${g.y - h - 7 * s} L${g.x},${g.y - h + 1 * s}`} stroke="#6b4a2c" strokeWidth={1 * s} />
      <ellipse cx={g.x} cy={g.y - h + 2.4 * s} rx={2.4 * s} ry={2.8 * s} fill="#7a592e" />
    </g>
  );
}

/**
 * A market stall. The awning is built as a real pitched canopy: a ridge bar
 * above the counter, four corner posts, a front slope and a back slope, plus a
 * scalloped valance hanging off the front edge. Awnings drawn as a single
 * floating quad are what make old iso scenes look like coloured kites.
 */
export function Stall({ x, y, z = 0, awning = "#c1503f", s = 1, seed = 0 }) {
  const rand = rng(seed + 61);
  const g = a(x, y, z);
  const hw = 15 * s;   // half width
  const hd = 11 * s;   // half depth
  const postH = 17 * s;
  const ridgeH = postH + 6 * s;
  const left = g.x - hw;
  const right = g.x + hw;
  const front = g.y + hd;
  const back = g.y - hd;
  const ridgeFront = front - 7 * s;
  const ridgeBack = back - 4 * s;
  return (
    <g data-role="prop" data-prop="stall">
      {shadow(g.x, g.y + hd * 0.4, hw * 1.05, hd * 0.5, 0.2)}
      {/* four corner posts */}
      <g stroke="#6b4a2c" strokeWidth={2 * s} strokeLinecap="round" fill="none">
        <path d={`M${left},${front} L${left},${ridgeFront - 2 * s}`} />
        <path d={`M${right},${front} L${right},${ridgeFront - 2 * s}`} />
        <path d={`M${left},${back} L${left},${ridgeBack - 2 * s}`} />
        <path d={`M${right},${back} L${right},${ridgeBack - 2 * s}`} />
      </g>
      {/* counter */}
      <polygon
        points={`${left},${front - 8 * s} ${right},${front - 8 * s} ${right},${front - 4 * s} ${left},${front - 4 * s}`}
        fill="#a3714a"
      />
      <polygon
        points={`${left},${front - 4 * s} ${right},${front - 4 * s} ${right},${front} ${left},${front}`}
        fill="#7a592e"
      />
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx={left + ((i + 0.5) / 3) * hw * 2}
          cy={front - 9.4 * s}
          rx={2.6 * s}
          ry={1.8 * s}
          fill={["#d98a3c", "#c1503f", "#7f9c3c"][i % 3]}
        />
      ))}
      {/* canopy: back slope, then front slope, then the valance */}
      <polygon
        points={`${left},${ridgeBack} ${right},${ridgeBack} ${right},${ridgeFront - 4 * s} ${left},${ridgeFront - 4 * s}`}
        fill={shade(awning, 0.2)}
      />
      <polygon
        points={`${left},${ridgeFront - 4 * s} ${right},${ridgeFront - 4 * s} ${right},${front} ${left},${front}`}
        fill={awning}
      />
      {/* ridge highlight */}
      <path
        d={`M${left},${ridgeFront - 4 * s} L${right},${ridgeFront - 4 * s}`}
        stroke={shade(awning, 0.34)}
        strokeWidth={1.6 * s}
      />
      {/* scalloped valance, in alternating fabric stripes */}
      {Array.from({ length: 6 }, (_, i) => {
        const t0 = i / 6;
        const t1 = (i + 1) / 6;
        const x0 = left + (right - left) * t0;
        const x1 = left + (right - left) * t1;
        return (
          <g key={i}>
            <path
              d={`M${x0},${front} L${x1},${front} L${x1},${front + 4.4 * s} A${(x1 - x0) / 2},${2.4 * s} 0 0 1 ${x0},${front + 4.4 * s} Z`}
              fill={i % 2 ? awning : "#f2e6ca"}
            />
          </g>
        );
      })}
      {rand() > 0.5 && <ellipse cx={g.x + hw * 0.7} cy={g.y + hd * 0.3} rx={3.4 * s} ry={2.2 * s} fill="#8a5a34" />}
    </g>
  );
}

/** A post-and-rail fence run along a line of points. */
export function Fence({ points, z = 0, tone = "#7a5636" }) {
  if (points.length < 2) return null;
  const posts = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    posts.push(
      <g key={i}>
        <path d={L([[x0, y0, z], [x0, y0, z + 0.2]], false)} stroke={shade(tone, -0.2)} strokeWidth={2.2} strokeLinecap="round" />
        <path d={L([[x0, y0, z + 0.14], [x1, y1, z + 0.14]], false)} stroke={tone} strokeWidth={1.7} />
        <path d={L([[x0, y0, z + 0.06], [x1, y1, z + 0.06]], false)} stroke={tone} strokeWidth={1.7} />
      </g>,
    );
  }
  const last = points[points.length - 1];
  posts.push(
    <path key="end" d={L([[last[0], last[1], z], [last[0], last[1], z + 0.2]], false)} stroke={shade(tone, -0.2)} strokeWidth={2.2} strokeLinecap="round" />,
  );
  return <g data-role="fence">{posts}</g>;
}

/** A directional signpost. */
export function Signpost({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  return (
    <g data-role="prop" data-prop="signpost">
      {shadow(g.x, g.y, 4 * s, 1.8 * s, 0.2)}
      <path d={L([[x, y, z], [x, y, z + 0.42]], false)} stroke="#6b4a2c" strokeWidth={2.6 * s} strokeLinecap="round" />
      <polygon
        points={P([[x, y + 0.06, z + 0.4], [x + 0.42, y + 0.06, z + 0.4], [x + 0.42, y + 0.06, z + 0.5], [x, y + 0.06, z + 0.5]])}
        fill="#a3714a"
      />
      <polygon
        points={P([[x, y + 0.06, z + 0.32], [x - 0.34, y + 0.06, z + 0.32], [x - 0.34, y + 0.06, z + 0.42], [x, y + 0.06, z + 0.42]])}
        fill="#8a5a34"
      />
    </g>
  );
}

/** A village bench. */
export function Bench({ x, y, z = 0, s = 1, angle = 0 }) {
  const g = a(x, y, z);
  return (
    <g data-role="prop" data-prop="bench" transform={`rotate(${angle} ${g.x} ${g.y})`}>
      {shadow(g.x, g.y, 7 * s, 2.4 * s, 0.16)}
      <polygon points={`${g.x - 7 * s},${g.y - 3 * s} ${g.x + 7 * s},${g.y - 3 * s} ${g.x + 7 * s},${g.y - 5 * s} ${g.x - 7 * s},${g.y - 5 * s}`} fill="#8a5a34" />
      <path d={`M${g.x - 5 * s},${g.y - 2 * s} L${g.x - 5 * s},${g.y}`} stroke="#5a3f28" strokeWidth={1.6 * s} />
      <path d={`M${g.x + 5 * s},${g.y - 2 * s} L${g.x + 5 * s},${g.y}`} stroke="#5a3f28" strokeWidth={1.6 * s} />
    </g>
  );
}

/** A stack of firewood. */
export function Woodpile({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  return (
    <g data-role="prop" data-prop="woodpile">
      {shadow(g.x, g.y, 7 * s, 3 * s, 0.18)}
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 4 - Math.floor(r / 2) }, (_, c) => {
          const cx = g.x - 6 * s + c * 3.4 * s + r * 1.1 * s;
          const cy = g.y - 2.4 * s - r * 2.9 * s;
          return <ellipse key={`${r}${c}`} cx={cx} cy={cy} rx={1.8 * s} ry={1.8 * s} fill={r % 2 ? "#8a5a34" : "#a3714a"} />;
        }),
      )}
    </g>
  );
}

/** Washing on a line between two poles. */
export function Laundry({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  const h = 15 * s;
  return (
    <g data-role="prop" data-prop="laundry">
      <g stroke="#6b4a2c" strokeWidth={1.7 * s} strokeLinecap="round">
        <path d={`M${g.x - 12 * s},${g.y} L${g.x - 12 * s},${g.y - h}`} />
        <path d={`M${g.x + 12 * s},${g.y} L${g.x + 12 * s},${g.y - h}`} />
      </g>
      <path d={`M${g.x - 12 * s},${g.y - h + 1.5 * s} Q${g.x},${g.y - h + 5 * s} ${g.x + 12 * s},${g.y - h + 1.5 * s}`} stroke="#b8b0a2" strokeWidth={1.1 * s} fill="none" />
      {["#f2e6ca", "#c1503f", "#4a6fa5", "#f4ead4"].map((c, i) => {
        const t = (i + 0.5) / 4;
        const lx = g.x - 12 * s + 24 * s * t;
        const ly = g.y - h + 1.5 * s + Math.sin(t * Math.PI) * 2.4 * s;
        return <rect key={i} x={lx - 2.6 * s} y={ly} width={5.2 * s} height={6.4 * s} rx={0.6 * s} fill={c} />;
      })}
    </g>
  );
}

/** A town banner on a pole — the strongest single "this is a real town" cue. */
export function Banner({ x, y, z = 0, s = 1, color = "#c1503f,glyph", pole = 1.1 }) {
  const g = a(x, y, z);
  const h = pole * 40;
  return (
    <g data-role="prop" data-prop="banner">
      {shadow(g.x, g.y, 3.4 * s, 1.6 * s, 0.18)}
      <path d={`M${g.x},${g.y} L${g.x},${g.y - h}`} stroke="#5a3f28" strokeWidth={2.6 * s} strokeLinecap="round" />
      <circle cx={g.x} cy={g.y - h - 2 * s} r={2.2 * s} fill="#d8b45c" />
      <path
        d={`M${g.x + 1.4 * s},${g.y - h + 3 * s} L${g.x + 13 * s},${g.y - h + 5 * s} L${g.x + 13 * s},${g.y - h + 24 * s} L${g.x + 6.5 * s},${g.y - h + 19 * s} L${g.x + 1.4 * s},${g.y - h + 24 * s} Z`}
        fill={color.split(",")[0]}
        stroke={shade(color.split(",")[0], -0.3)}
        strokeWidth={0.9}
      />
      <text
        x={g.x + 7 * s}
        y={g.y - h + 17 * s}
        fontSize={8 * s}
        textAnchor="middle"
        fill={shade(color.split(",")[0], 0.45)}
      >
        {color.split(",")[1] || "✦"}
      </text>
    </g>
  );
}

/** A stone fountain: the centrepiece of a market square. */
export function Fountain({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  const r = 14 * s;
  return (
    <g data-role="prop" data-prop="fountain">
      {shadow(g.x, g.y, r * 1.2, r * 0.6, 0.2)}
      <ellipse cx={g.x} cy={g.y} rx={r} ry={r * 0.58} fill="#8f8879" />
      <ellipse cx={g.x} cy={g.y - 3 * s} rx={r * 0.86} ry={r * 0.5} fill="#b8b0a2" />
      <ellipse cx={g.x} cy={g.y - 5 * s} rx={r * 0.68} ry={r * 0.38} fill="#7cc3e8" />
      <ellipse cx={g.x} cy={g.y - 5.6 * s} rx={r * 0.44} ry={r * 0.24} fill="#a8dcf2" />
      <path d={`M${g.x},${g.y - 4 * s} L${g.x},${g.y - 16 * s}`} stroke="#b8b0a2" strokeWidth={3 * s} />
      <ellipse cx={g.x} cy={g.y - 17 * s} rx={4.6 * s} ry={2.4 * s} fill="#cec7b8" />
      <g fill="#a8dcf2" opacity={0.85}>
        <circle cx={g.x - 3 * s} cy={g.y - 12 * s} r={1.2 * s} />
        <circle cx={g.x + 3.4 * s} cy={g.y - 13 * s} r={1.1 * s} />
        <circle cx={g.x + 1 * s} cy={g.y - 9 * s} r={0.9 * s} />
      </g>
    </g>
  );
}

/** A plinth with a carved figure. */
export function Statue({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  return (
    <g data-role="prop" data-prop="statue">
      {shadow(g.x, g.y, 7 * s, 3.2 * s, 0.2)}
      <polygon points={`${g.x - 6 * s},${g.y - 2 * s} ${g.x + 6 * s},${g.y - 2 * s} ${g.x + 5 * s},${g.y - 9 * s} ${g.x - 5 * s},${g.y - 9 * s}`} fill="#b8b0a2" />
      <polygon points={`${g.x - 7 * s},${g.y - 1 * s} ${g.x + 7 * s},${g.y - 1 * s} ${g.x + 6 * s},${g.y - 4 * s} ${g.x - 6 * s},${g.y - 4 * s}`} fill="#cec7b8" />
      <path d={`M${g.x},${g.y - 9 * s} L${g.x - 1.4 * s},${g.y - 20 * s} L${g.x + 2.4 * s},${g.y - 20 * s} L${g.x + 1.6 * s},${g.y - 9 * s} Z`} fill="#d8d2c4" />
      <circle cx={g.x + 0.6 * s} cy={g.y - 22 * s} r={2.4 * s} fill="#e2dcd0" />
      <path d={`M${g.x + 2 * s},${g.y - 17 * s} L${g.x + 6 * s},${g.y - 23 * s}`} stroke="#d8d2c4" strokeWidth={1.4 * s} strokeLinecap="round" />
    </g>
  );
}

/** A scarecrow, for the fields. */
export function Scarecrow({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  const shoulder = 19 * s;
  return (
    <g data-role="prop" data-prop="scarecrow">
      {shadow(g.x, g.y, 4 * s, 1.8 * s, 0.16)}
      <path d={L([[x, y, z], [x, y, z + 0.46]], false)} stroke="#6b4a2c" strokeWidth={2.4 * s} strokeLinecap="round" />
      <path d={L([[x - 0.3, y, z + 0.34], [x + 0.3, y, z + 0.34]], false)} stroke="#6b4a2c" strokeWidth={2 * s} strokeLinecap="round" />
      <polygon
        points={`${g.x - 6 * s},${g.y - shoulder} ${g.x + 6 * s},${g.y - shoulder} ${g.x + 4 * s},${g.y - 2 * s} ${g.x - 4 * s},${g.y - 2 * s}`}
        fill="#c1503f"
      />
      <path
        d={`M${g.x - 6 * s},${g.y - shoulder} L${g.x + 6 * s},${g.y - shoulder} L${g.x + 4.4 * s},${g.y - shoulder + 5 * s} L${g.x - 4.4 * s},${g.y - shoulder + 5 * s} Z`}
        fill="#d98a3c"
      />
      <circle cx={g.x} cy={g.y - shoulder - 4 * s} r={3.4 * s} fill="#c9a86a" />
      <circle cx={g.x - 1.2 * s} cy={g.y - shoulder - 5 * s} r={0.7 * s} fill="#4a2d19" />
      <circle cx={g.x + 1.2 * s} cy={g.y - shoulder - 5 * s} r={0.7 * s} fill="#4a2d19" />
    </g>
  );
}

/** A small campfire, with a light pool on the grass. */
export function Campfire({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  return (
    <g data-role="prop" data-prop="campfire">
      <ellipse cx={g.x} cy={g.y} rx={9 * s} ry={5 * s} fill="#3a2a1a" opacity={0.3} />
      <g stroke="#5a3f28" strokeWidth={2.2 * s} strokeLinecap="round">
        <path d={`M${g.x - 4 * s},${g.y} L${g.x + 4 * s},${g.y - 2.6 * s}`} />
        <path d={`M${g.x + 4 * s},${g.y} L${g.x - 4 * s},${g.y - 2.6 * s}`} />
      </g>
      <path d={`M${g.x},${g.y - 3 * s} Q${g.x - 3.4 * s},${g.y - 7 * s} ${g.x},${g.y - 12 * s} Q${g.x + 3.4 * s},${g.y - 7 * s} ${g.x},${g.y - 3 * s} Z`} fill="#d98a3c" />
      <path d={`M${g.x},${g.y - 4 * s} Q${g.x - 1.8 * s},${g.y - 7 * s} ${g.x},${g.y - 9.6 * s} Q${g.x + 1.8 * s},${g.y - 7 * s} ${g.x},${g.y - 4 * s} Z`} fill="#ffd76a" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Animals
// ---------------------------------------------------------------------------

function quadruped({ kind, x, y, z = 0, s = 1, body, dark, head, legs = 4, plump = 1 }) {
  const g = a(x, y, z);
  const bw = 6.2 * s * plump;
  const bh = 4.4 * s;
  return (
    <g data-role="animal" data-animal={kind} data-s={s.toFixed(2)}>
      {shadow(g.x, g.y, bw * 1.15, bw * 0.42, 0.2)}
      <g stroke={dark} strokeWidth={1.5 * s} strokeLinecap="round">
        {Array.from({ length: legs }, (_, i) => {
          const lx = g.x - bw * 0.62 + (i * bw * 1.24) / (legs - 1);
          return <path key={i} d={`M${lx},${g.y - 1 * s} L${lx + 0.6 * s},${g.y + 1.6 * s}`} />;
        })}
      </g>
      <ellipse cx={g.x} cy={g.y - bh * 0.9} rx={bw} ry={bh} fill={body} />
      <ellipse cx={g.x - bw * 0.34} cy={g.y - bh * 1.2} rx={bw * 0.62} ry={bh * 0.6} fill={shade(body, 0.16)} />
      <ellipse cx={g.x + bw * 0.92} cy={g.y - bh * 1.9} rx={bh * 0.78} ry={bh * 0.72} fill={head} />
      <ellipse cx={g.x + bw * 0.74} cy={g.y - bh * 2.1} rx={bh * 0.4} ry={bh * 0.34} fill={shade(head, 0.18)} />
      <circle cx={g.x + bw * 1.16} cy={g.y - bh * 1.86} r={0.7 * s} fill="#3d2a19" />
    </g>
  );
}

export const Sheep = (p) => quadruped({ ...p, kind: "sheep", body: "#f2ede2", dark: "#a89c8a", head: "#4a4038" });
export const Cow = (p) => quadruped({ ...p, kind: "cow", body: "#f2ede2", dark: "#7a6a58", head: "#4a4038", plump: 1.15 });
export const Pig = (p) => quadruped({ ...p, kind: "pig", body: "#e8a0a8", dark: "#a87078", head: "#e8a0a8", plump: 0.9 });
export const Dog = (p) => quadruped({ ...p, kind: "dog", body: "#b08550", dark: "#7a5c34", head: "#8a6636", legs: 4, plump: 0.62 });

export function Chicken({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  return (
    <g data-role="animal" data-animal="chicken" data-s={s.toFixed(2)}>
      {shadow(g.x, g.y, 3.4 * s, 1.5 * s, 0.16)}
      <path d={`M${g.x - 1.2 * s},${g.y} L${g.x - 1.4 * s},${g.y + 1.4 * s}`} stroke="#d98a3c" strokeWidth={0.9 * s} />
      <path d={`M${g.x + 1.2 * s},${g.y} L${g.x + 1.4 * s},${g.y + 1.4 * s}`} stroke="#d98a3c" strokeWidth={0.9 * s} />
      <ellipse cx={g.x} cy={g.y - 3.4 * s} rx={3.2 * s} ry={2.6 * s} fill="#f2ede2" />
      <ellipse cx={g.x + 2.6 * s} cy={g.y - 6.2 * s} rx={1.8 * s} ry={1.7 * s} fill="#f2ede2" />
      <circle cx={g.x + 2.6 * s} cy={g.y - 8.6 * s} r={0.9 * s} fill="#c1503f" />
      <path d={`M${g.x + 4.2 * s},${g.y - 6.2 * s} L${g.x + 5.6 * s},${g.y - 5.6 * s} L${g.x + 4.2 * s},${g.y - 5.2 * s} Z`} fill="#d98a3c" />
      <circle cx={g.x + 3 * s} cy={g.y - 6.6 * s} r={0.5 * s} fill="#3d2a19" />
    </g>
  );
}

export function Bird({ x, y, z = 0, s = 1 }) {
  const g = a(x, y, z);
  return (
    <path
      data-role="animal"
      data-animal="bird"
      d={`M${g.x - 2.6 * s},${g.y} Q${g.x},${g.y - 3 * s} ${g.x + 2.6 * s},${g.y}`}
      stroke="#4a4038"
      strokeWidth={1.3 * s}
      fill="none"
      strokeLinecap="round"
    />
  );
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/**
 * A ploughed strip. Rows run along `dir` so neighbouring fields can be
 * oriented differently, which is what makes a farm read as farmed rather than
 * as a green rectangle.
 */
export function Furrow({ x, y, z = 0, w, d, rows = 7, dir = "x", tone = "#b18d4e", seed = 0 }) {
  const rand = rng(seed + 13);
  const out = [];
  for (let i = 0; i < rows; i += 1) {
    const t = (i + 0.5) / rows;
    const jitter = (rand() - 0.5) * 0.02;
    const x0 = dir === "x" ? x + w * t + jitter : x;
    const y0 = dir === "x" ? y : y + d * t + jitter;
    const x1 = dir === "x" ? x + w * t + jitter : x + w;
    const y1 = dir === "x" ? y + d : y + d * t + jitter;
    out.push(
      <path
        key={i}
        d={L([[x0, y0, z], [x1, y1, z]], false)}
        stroke={i % 2 ? tone : shade(tone, -0.16)}
        strokeWidth={2.6}
        strokeLinecap="round"
        opacity={0.9}
      />,
    );
  }
  return <g>{out}</g>;
}

/** Green crop rows, for a field that's growing something. */
export function CropRow({ x, y, z = 0, w, d, rows = 5, dir = "x", tone = "#6b9c3c", seed = 0 }) {
  const rand = rng(seed + 31);
  const out = [];
  for (let i = 0; i < rows; i += 1) {
    const t = (i + 0.5) / rows;
    for (let j = 0; j < 6; j += 1) {
      const u = (j + 0.5) / 6;
      const gx = dir === "x" ? x + w * t : x + w * u;
      const gy = dir === "x" ? y + d * u : y + d * t;
      const g = a(gx + (rand() - 0.5) * 0.03, gy, z);
      const k = 0.85 + ((j * 7) % 4) * 0.12;
      out.push(
        <g key={`${i}${j}`} data-role="crop">
          <path d={`M${g.x},${g.y} L${g.x + (rand() - 0.5) * 2},${g.y - 4.5 * k}`} stroke={shade(tone, -0.18)} strokeWidth={1.2} />
          <ellipse cx={g.x} cy={g.y - 5 * k} rx={1.5} ry={2.1} fill={tone} />
          <ellipse cx={g.x - 0.6} cy={g.y - 5.6 * k} rx={0.8} ry={1.1} fill={shade(tone, 0.2)} />
        </g>,
      );
    }
  }
  return <g data-role="crop-rows">{out}</g>;
}

/** A cottage garden: rows of vegetables behind a low fence. */
export function Garden({ x, y, z = 0, w = 0.9, d = 0.7, seed = 0, tone = "#6b9c3c" }) {
  return (
    <g data-role="garden">
      <CropRow x={x} y={y} z={z} w={w} d={d} rows={3} dir="x" tone={tone} seed={seed} />
      <CropRow x={x} y={y + d * 0.55} z={z} w={w} d={d * 0.4} rows={2} dir="x" tone={shade(tone, 0.12)} seed={seed + 5} />
    </g>
  );
}
