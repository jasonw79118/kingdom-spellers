// Kingdom scene — the visual representation of a player's kingdom.
//
// Rendered as layered SVG with gentle parallax so the world has depth:
//   sky → far range → mid hills → ground → buildings → foreground
//
// Built buildings appear as illustrations on the ground line; unbuilt ones
// show as a marked-out plot. Buildings are drawn on the ground line.

import { useRef, useMemo, useState } from "react";
import { KINGDOMS, PLOT, plotState, isRegionComplete, castleBuilt } from "../../game/kingdom";
import { BuildingArt, buildingSize, LandArt } from "./buildingArt";

// Theme palettes for the five territories.
const THEMES = {
  forest: {
    skyTop: "#bfe6c8", skyBottom: "#8fce9e",
    far: "#6fa37a", mid: "#4f8558", ground: "#6aa96f", groundEdge: "#4f8558",
    decor: "🌳", water: "#6fa8c9",
  },
  river: {
    skyTop: "#cfe6f5", skyBottom: "#9cc6e0",
    far: "#7fa8c4", mid: "#5f8fae", ground: "#7fb08a", groundEdge: "#5f8fae",
    decor: "🌾", water: "#4a8fc0",
  },
  highland: {
    skyTop: "#dfe4ef", skyBottom: "#b9c2d6",
    far: "#8f9bb3", mid: "#75839b", ground: "#8fa07a", groundEdge: "#6b7a63",
    decor: "🌲", water: "#7fa8c4",
  },
  cavern: {
    skyTop: "#d7d2f2", skyBottom: "#b0a5e0",
    far: "#8f7fc0", mid: "#6b5b9e", ground: "#7d6fae", groundEdge: "#5d4f8f",
    decor: "💎", water: "#9c8ad8",
  },
  peak: {
    skyTop: "#ffd9c0", skyBottom: "#f0a882",
    far: "#c98f7a", mid: "#a8705f", ground: "#9c7a6a", groundEdge: "#7a5a4a",
    decor: "🌋", water: "#8a5a4a",
  },
};

// Scene coordinate system.
const W = 1000;
const GROUND_Y = 300;

// Sun/moon halo, soft rays, and a warm glow. These are what make the scene read
// as a place rather than a diagram, so they sit behind everything else.
function SkyGlow({ color }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {/* halo */}
      <circle cx={860} cy={62} r={62} fill={color} opacity="0.16" />
      <circle cx={860} cy={62} r={96} fill={color} opacity="0.08" />
      {/* rays, each rotated around the sun */}
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d="M860 62 L872 -140 L890 -140 Z"
          fill={color}
          opacity="0.05"
          transform={`rotate(${i * 30} 860 62)`}
        />
      ))}
    </g>
  );
}

// Slowly drifting clouds. Each is wrapped in a group that animates, so the
// motion is a single CSS transform rather than per-frame JS.
function Clouds({ color, seed = 0 }) {
  const banks = [
    { x: 120, y: 60, s: 1.0, d: 62 },
    { x: 470, y: 96, s: 0.78, d: 84 },
    { x: 760, y: 44, s: 1.15, d: 105 },
  ];
  return (
    <g opacity="0.5" style={{ pointerEvents: "none" }}>
      {banks.map((c, i) => (
        <g
          key={i}
          style={{
            animation: `ks-drift ${c.d}s linear ${-seed + i * 7}s infinite alternate`,
          }}
        >
          <g transform={`translate(${c.x} ${c.y}) scale(${c.s})`} fill={color}>
            <ellipse cx="0" cy="0" rx="38" ry="17" />
            <ellipse cx="26" cy="5" rx="27" ry="13" />
            <ellipse cx="-25" cy="6" rx="24" ry="11" />
          </g>
        </g>
      ))}
    </g>
  );
}

// Birds wheeling in the distance — a small detail that gives the sky life.
function Birds({ color }) {
  return (
    <g stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4" style={{ pointerEvents: "none" }}>
      {[[300, 78, 1], [336, 92, 0.8], [268, 96, 0.65]].map(([x, y, s], i) => (
        <path
          key={i}
          d={`M${x - 8 * s} ${y} q${4 * s} -${4 * s} ${8 * s} 0 q${4 * s} -${4 * s} ${8 * s} 0`}
          style={{ animation: `ks-bob ${3.4 + i * 0.6}s ease-in-out ${i * 0.4}s infinite alternate` }}
        />
      ))}
    </g>
  );
}

// A worn road running through the settlement. Real villages grow around a path
// rather than as a line of separate objects, and it fills the gaps between
// plots so the ground doesn't read as empty.
function VillageRoad({ edge }) {
  return (
    <g pointerEvents="none">
      <path
        d={`M0 ${GROUND_Y + 78} Q250 ${GROUND_Y + 66} 500 ${GROUND_Y + 80} T1000 ${GROUND_Y + 74} L1000 ${GROUND_Y + 96} Q500 ${GROUND_Y + 104} 0 ${GROUND_Y + 94} Z`}
        fill="#c8b391"
        opacity="0.55"
      />
      {/* ruts, so it reads as travelled rather than painted on */}
      <path
        d={`M0 ${GROUND_Y + 84} Q250 ${GROUND_Y + 74} 500 ${GROUND_Y + 86} T1000 ${GROUND_Y + 80}`}
        fill="none"
        stroke={edge}
        strokeWidth="1.5"
        opacity="0.22"
        strokeDasharray="14 12"
      />
    </g>
  );
}

// Filler scenery between the plots — hedgerows, boulders and lanterns. Without
// these the buildings look like they were dropped onto bare ground.
function VillageFiller({ glyph, edge, count = 9 }) {
  const spots = Array.from({ length: count }, (_, i) => ({
    x: 24 + i * ((W - 48) / (count - 1)) + ((i * 37) % 23) - 11,
    s: 0.5 + ((i * 13) % 7) / 10,
    y: GROUND_Y + 12 + ((i * 17) % 9),
  }));
  return (
    <g pointerEvents="none" opacity="0.85">
      {spots.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          <ellipse cx={0} cy={2} rx={11} ry={3.4} fill="#000" opacity="0.14" />
          <text
            x={0}
            y={0}
            fontSize={26}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ color: edge, filter: "saturate(0.9)" }}
          >
            {glyph}
          </text>
        </g>
      ))}
    </g>
  );
}

// A raised mound under the castle, so the seat of the realm sits above the
// village instead of in a line with the cottages.
function CastleMound({ x, w, top, base, edge }) {
  return (
    <g pointerEvents="none">
      <path
        d={`M${x - w * 0.62} ${base} Q${x - w * 0.2} ${top} ${x} ${top} Q${x + w * 0.24} ${top} ${x + w * 0.62} ${base} Z`}
        fill={top === base ? "transparent" : "currentColor"}
        opacity="0.28"
      />
      <path
        d={`M${x - w * 0.62} ${base} Q${x - w * 0.2} ${top} ${x} ${top} Q${x + w * 0.24} ${top} ${x + w * 0.62} ${base}`}
        fill="none"
        stroke={edge}
        strokeWidth="2"
        opacity="0.35"
      />
    </g>
  );
}

function FarRange({ color }) {
  return (
    <path
      d={`M0 300 L120 150 L210 240 L320 120 L440 250 L560 160 L680 260 L800 140 L920 250 L1000 190 L1000 300 Z`}
      fill={color}
      opacity="0.45"
    />
  );
}

function MidHills({ color }) {
  return (
    <g opacity="0.75">
      <ellipse cx={140} cy={300} rx={210} ry={80} fill={color} />
      <ellipse cx={470} cy={310} rx={250} ry={88} fill={color} />
      <ellipse cx={820} cy={302} rx={230} ry={82} fill={color} />
    </g>
  );
}

// Decorative trees / rocks scattered on the mid layer.
function Decor({ glyph, color }) {
  const spots = [
    [60, 268, 0.9], [200, 276, 0.7], [330, 264, 1.0], [640, 272, 0.8],
    [760, 266, 0.95], [920, 274, 0.75], [140, 284, 0.6], [520, 282, 0.65],
  ];
  return (
    <g opacity="0.9">
      {spots.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <text x={0} y={0} fontSize={34} textAnchor="middle" dominantBaseline="middle">{glyph}</text>
        </g>
      ))}
    </g>
  );
}

// Untouched land — trees/rocks, not ready to build on.
function WildPlot({ x, y, w, glyph, tint, onClick, label }) {
  const [hover, setHover] = useState(false);
  return (
    <g
      transform={`translate(${x} ${y})`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: onClick ? "pointer" : "default" }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      opacity={hover ? 0.9 : 1}
    >
      <g transform={`translate(${(w - 92) / 2} 0)`}>
        <LandArt state="wild" glyph={glyph} tint={tint} />
      </g>
      {hover && (
        <rect
          x={4}
          y={-14}
          width={w - 8}
          height={22}
          rx={8}
          fill="rgba(232,182,76,0.22)"
          stroke="#e8b64c"
          strokeWidth="2"
          strokeDasharray="7 6"
        />
      )}
      <text
        x={w / 2}
        y={2}
        textAnchor="middle"
        fontSize="12"
        fontFamily="var(--font-body)"
        fontWeight="700"
        fill={hover ? "#a5821a" : "rgba(45,42,50,0.55)"}
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="3"
        paintOrder="stroke"
      >
        {hover ? "Clear the land" : "Wild land"}
      </text>
    </g>
  );
}

// Land that has been cleared and is ready for building.
function ClearedPlot({ x, y, w, onClick, label }) {
  const [hover, setHover] = useState(false);
  return (
    <g
      transform={`translate(${x} ${y})`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: onClick ? "pointer" : "default" }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <g transform={`translate(${(w - 92) / 2} 0)`}>
        <LandArt state="cleared" />
      </g>
      <rect
        x={4}
        y={-14}
        width={w - 8}
        height={22}
        rx={8}
        fill={hover ? "rgba(232,182,76,0.25)" : "rgba(90,168,106,0.14)"}
        stroke={hover ? "#e8b64c" : "rgba(74,124,89,0.55)"}
        strokeWidth="2"
        strokeDasharray="7 6"
      />
      <text
        x={w / 2}
        y={2}
        textAnchor="middle"
        fontSize="12"
        fontFamily="var(--font-body)"
        fontWeight="700"
        fill={hover ? "#a5821a" : "var(--forest-dark)"}
      >
        {hover ? "Build here!" : "Cleared — ready"}
      </text>
    </g>
  );
}

// A completed building, with a gentle idle float.
// A building is drawn with its footing (baseY) on the ground line, plus a
// contact shadow so it reads as standing on the land rather than hovering.
//
// It deliberately does NOT loop a gentle bob: a continuous vertical float made
// every structure look like it was hovering, which is exactly what it should
// never do. Movement is reserved for the moment something is built.
function PlacedBuilding({ building, x, y, justBuilt, theme }) {
  const size = buildingSize(building.id);
  return (
    <g
      style={
        justBuilt
          ? { animation: "ks-pop 0.55s cubic-bezier(.34,1.56,.64,1)" }
          : undefined
      }
    >
      {/* contact shadow, drawn first so the building sits on top of it */}
      <ellipse
        cx={x + size.w / 2}
        cy={y + 2}
        rx={size.w * 0.46}
        ry={Math.max(4, size.w * 0.09)}
        fill="#000"
        opacity="0.2"
      />
      <g transform={`translate(${x} ${y - size.baseY})`}>
        <BuildingArt id={building.id} />
      </g>
    </g>
  );
}

export default function KingdomScene({ kingdomId, built = {}, onSelectPlot, justBuilt }) {
  const sceneRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const kingdom = useMemo(() => KINGDOMS.find((k) => k.id === kingdomId) || KINGDOMS[0], [kingdomId]);
  const theme = THEMES[kingdom.theme] || THEMES.forest;

  // Gentle pointer-driven parallax (desktop) — adds depth without motion
  // sickness on touch devices.
  const onMove = (e) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: px * 12, y: py * 6 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  // Layout: spread buildings evenly along the ground line. The castle is set
  // back and lifted onto its mound, because a castle standing in the same line
  // as the cottages reads as another shed rather than the seat of the realm.
  const slots = kingdom.buildings.length;
  const usable = W - 120;
  const gap = usable / slots;
  const placements = kingdom.buildings.map((b, i) => {
    const size = buildingSize(b.id);
    const centre = 60 + gap * i + gap / 2;
    const lift = b.castle ? -26 : 0;
    return { building: b, x: centre - size.w / 2, y: GROUND_Y + 6 + lift };
  });

  const builtCount = kingdom.buildings.filter((b) => plotState(built, b.id) === PLOT.BUILT).length;
  const complete = isRegionComplete(built, kingdom);
  const hasCastle = castleBuilt(built, kingdom);

  return (
    <div
      ref={sceneRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", position: "relative", boxShadow: "var(--shadow)" }}
    >
      <svg viewBox={`0 0 ${W} 420`} width="100%" style={{ display: "block" }} role="img"
        aria-label={`${kingdom.name}, ${builtCount} of ${slots} buildings built`}>
        <defs>
          <linearGradient id={`sky-${kingdom.theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.skyTop} />
            <stop offset="100%" stopColor={theme.skyBottom} />
          </linearGradient>
          <linearGradient id={`ground-${kingdom.theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.ground} />
            <stop offset="100%" stopColor={theme.groundEdge} />
          </linearGradient>
        </defs>

        {/* sky */}
        <rect x={0} y={0} width={W} height={GROUND_Y} fill={`url(#sky-${kingdom.theme})`} />
        <SkyGlow color="#fff6d8" />
        {/* sun / moon */}
        <circle cx={860} cy={62} r={30} fill="#fff6d8" opacity="0.9" />
        <Clouds color="#ffffff" seed={builtCount} />
        <Birds color="#3c4a5a" />

        {/* parallax layers */}
        <g style={{ transform: `translate(${tilt.x * 0.5}px, ${tilt.y * 0.5}px)`, transition: "transform .25s ease-out" }}>
          <FarRange color={theme.far} />
        </g>
        <g style={{ transform: `translate(${tilt.x * 1.1}px, ${tilt.y * 1.1}px)`, transition: "transform .25s ease-out" }}>
          <MidHills color={theme.mid} />
          <Decor glyph={theme.decor} color={theme.mid} />
        </g>

        {/* river / water strip */}
        <path
          d={`M0 ${GROUND_Y + 74} q120 -16 250 0 t250 0 t250 0 t250 0 L${W} 420 L0 420 Z`}
          fill={theme.water}
          opacity="0.75"
        />

        {/* ground */}
        <rect x={0} y={GROUND_Y} width={W} height={120} fill={`url(#ground-${kingdom.theme})`} />
        <rect x={0} y={GROUND_Y} width={W} height={6} fill={theme.groundEdge} opacity="0.6" />

        {/* back hedge line, then the road the village grew along — both sit
            behind the buildings so the settlement reads as one place */}
        <VillageFiller glyph={theme.decor} edge={theme.groundEdge} count={7} />
        <VillageRoad edge={theme.groundEdge} />

        {/* The castle sits on a rise behind the village, so it belongs to the
            land instead of floating in it. Drawn before the buildings so the
            cottages overlap its base. */}
        {(() => {
          const castle = kingdom.buildings.find((b) => b.castle);
          if (!castle) return null;
          const p = placements.find((pl) => pl.building.id === castle.id);
          if (!p) return null;
          const size = buildingSize(castle.id);
          return (
            <g style={{ color: theme.ground }}>
              <CastleMound
                x={p.x + size.w / 2}
                w={size.w}
                top={GROUND_Y + 44}
                base={GROUND_Y + 96}
                edge={theme.groundEdge}
              />
            </g>
          );
        })()}

        {/* buildings / wild land / cleared plots */}
        {placements.map(({ building, x, y }) => {
          const state = plotState(built, building.id);
          if (state === PLOT.BUILT) {
            return (
              <PlacedBuilding
                key={building.id}
                building={building}
                x={x}
                y={y}
                theme={theme}
                justBuilt={justBuilt === building.id}
              />
            );
          }
          if (state === PLOT.CLEARED) {
            return (
              <ClearedPlot
                key={building.id}
                x={x}
                y={y + 4}
                w={buildingSize(building.id).w}
                onClick={onSelectPlot ? () => onSelectPlot(building) : undefined}
                label={`Cleared land — build ${building.name}`}
              />
            );
          }
          return (
            <WildPlot
              key={building.id}
              x={x}
              y={y + 4}
              w={buildingSize(building.id).w}
              glyph={kingdom.wild}
              tint={theme.groundEdge}
              onClick={onSelectPlot ? () => onSelectPlot(building) : undefined}
              label={`Wild land — clear to build ${building.name}`}
            />
          );
        })}

        {/* grass tufts on the foreground */}
        <g opacity="0.5" style={{ transform: `translate(${tilt.x * 1.8}px, ${tilt.y * 1.8}px)`, transition: "transform .25s ease-out" }}>
          {Array.from({ length: 26 }, (_, i) => {
            const x = 12 + i * 39;
            const h = 10 + ((i * 7) % 9);
            return <path key={i} d={`M${x} ${GROUND_Y + 116} q3 -${h} 6 0`} stroke={theme.groundEdge} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
          })}
        </g>
      </svg>

      {/* warm ground light */}
      <div className="ks-scene-glow" />

      {/* caption */}
      <div
        style={{
          position: "absolute", left: 12, bottom: 10,
          background: "rgba(255,255,255,0.82)", borderRadius: "var(--radius)",
          padding: "6px 12px", fontSize: "0.8rem", fontWeight: 700,
          display: "flex", gap: 8, alignItems: "center",
        }}
      >
        <span>{kingdom.name}</span>
        <span className="badge badge-forest" style={{ fontSize: "0.7rem" }}>
          {complete ? "🏰 Complete!" : `${builtCount}/${slots} built`}
        </span>
        {!complete && hasCastle && (
          <span className="badge badge-gold" style={{ fontSize: "0.7rem" }}>🏰 Castle raised!</span>
        )}
      </div>
    </div>
  );
}
