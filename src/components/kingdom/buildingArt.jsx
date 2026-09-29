// Building artwork — storybook-style SVG illustrations.
//
// Every building is drawn with a shared set of primitives (wall, roof, door,
// window, banner…) so the whole kingdom reads as one coherent set. Each art
// entry declares the size it occupies in scene units; the drawing is anchored
// to its bottom-left corner so buildings sit naturally on the ground line.

import React from "react";

// Shared palette so every structure looks like it belongs to one world.
const C = {
  wood: "#b5793f",
  woodDark: "#8a5628",
  woodLight: "#d3a06a",
  stone: "#c9c3b4",
  stoneDark: "#a49d8c",
  stoneLight: "#e2ddd0",
  roofRed: "#c0553f",
  roofRedDark: "#9c3f2c",
  roofBlue: "#5b7fa6",
  roofBlueDark: "#3f5f80",
  roofGreen: "#5d8a52",
  thatch: "#c9a227",
  thatchDark: "#a5821a",
  glass: "#bfe3f2",
  glow: "#ffd98a",
  crystal: "#b9a7e8",
  crystalLight: "#e4dcff",
  cloth: "#e8b64c",
};

// --- shared primitives -------------------------------------------------------

const Wall = ({ x, y, w, h, fill = C.wood, stroke = C.woodDark, r = 3 }) => (
  <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth="2" />
);

const Roof = ({ x, y, w, h, fill = C.roofRed, stroke = C.roofRedDark }) => (
  <path
    d={`M${x} ${y + h} L${x + w / 2} ${y} L${x + w} ${y + h} Z`}
    fill={fill}
    stroke={stroke}
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

const Door = ({ x, y, w = 20, h = 30, fill = C.woodDark }) => (
  <path
    d={`M${x} ${y + h} L${x} ${y + w / 2} Q${x + w / 2} ${y - 3} ${x + w} ${y + w / 2} L${x + w} ${y + h} Z`}
    fill={fill}
    stroke="#6b3f1c"
    strokeWidth="2"
  />
);

const Window = ({ x, y, size = 14, fill = C.glass, lit = false }) => (
  <g>
    <rect x={x} y={y} width={size} height={size} rx="2" fill={fill} stroke="#5d4a2f" strokeWidth="2" />
    <path d={`M${x + size / 2} ${y} V${y + size} M${x} ${y + size / 2} H${x + size}`} stroke="#5d4a2f" strokeWidth="1.5" />
    {lit && <circle cx={x + size / 2} cy={y + size / 2} r={size * 0.28} fill={C.glow} opacity="0.9" />}
  </g>
);

const Flag = ({ x, y, h = 26, fill = C.cloth }) => (
  <g>
    <line x1={x} y1={y} x2={x} y2={y - h} stroke="#5d4a2f" strokeWidth="2.5" strokeLinecap="round" />
    <path d={`M${x} ${y - h} L${x + 18} ${y - h + 6} L${x} ${y - h + 12} Z`} fill={fill} stroke="#a5821a" strokeWidth="1.5" />
  </g>
);

const Plank = ({ x, y, w, h, fill = C.woodLight }) => (
  <rect x={x} y={y} width={w} height={h} rx="1.5" fill={fill} stroke={C.woodDark} strokeWidth="1.5" />
);

const Crenels = ({ x, y, w, h = 8 }) =>
  Array.from({ length: Math.max(2, Math.floor(w / 16)) }, (_, i) => (
    <rect key={i} x={x + i * (w / Math.max(2, Math.floor(w / 16)))} y={y - h} width={w / Math.max(2, Math.floor(w / 16)) - 3} height={h} fill={C.stone} stroke={C.stoneDark} strokeWidth="1.5" />
  ));

// --- Greenwood Village -------------------------------------------------------

const Cottage = () => (
  <g>
    <Wall x={8} y={40} w={64} h={40} />
    <Roof x={0} y={4} w={80} h={38} fill={C.thatch} stroke={C.thatchDark} />
    <Door x={32} y={50} w={18} h={30} />
    <Window x={14} y={50} size={13} lit />
    <Window x={54} y={50} size={13} />
    <rect x={60} y={22} width={9} height={16} fill={C.stoneDark} />
  </g>
);

const Well = () => (
  <g>
    <line x1={20} y1={46} x2={16} y2={10} stroke={C.woodDark} strokeWidth="3" />
    <line x1={46} y1={46} x2={50} y2={10} stroke={C.woodDark} strokeWidth="3" />
    <path d="M6 12 L33 0 L60 12 Z" fill={C.roofRed} stroke={C.roofRedDark} strokeWidth="2" strokeLinejoin="round" />
    <ellipse cx={33} cy={62} rx={22} ry={12} fill={C.stoneDark} />
    <ellipse cx={33} cy={58} rx={22} ry={12} fill={C.stone} stroke={C.stoneDark} strokeWidth="2" />
    <ellipse cx={33} cy={58} rx={14} ry={7} fill="#3a4a63" />
    <line x1={33} y1={16} x2={33} y2={44} stroke="#5d4a2f" strokeWidth="1.5" />
    <rect x={28} y={44} width={10} height={9} rx={2} fill={C.woodLight} stroke={C.woodDark} strokeWidth="1.5" />
  </g>
);

const Bakery = () => (
  <g>
    <Wall x={6} y={36} w={72} h={44} fill={C.stoneLight} stroke={C.stoneDark} />
    <Roof x={-2} y={6} w={88} h={32} fill={C.roofRed} stroke={C.roofRedDark} />
    <Door x={18} y={50} w={20} h={30} />
    <Window x={46} y={50} size={16} lit />
    <rect x={68} y={18} width={12} height={20} fill={C.stoneDark} />
    <g>
      <ellipse cx={62} cy={26} rx={7} ry={9} fill={C.thatch} stroke={C.thatchDark} strokeWidth="1.5" transform="rotate(20 62 26)" />
    </g>
  </g>
);

const Market = () => (
  <g>
    <Wall x={10} y={44} w={68} h={36} fill={C.woodLight} />
    <Door x={20} y={56} w={18} h={24} />
    <Window x={48} y={54} size={16} />
    <path d="M2 30 H86 L80 16 H8 Z" fill={C.cloth} stroke="#a5821a" strokeWidth="2" strokeLinejoin="round" />
    {Array.from({ length: 5 }, (_, i) => (
      <path key={i} d={`M${8 + i * 17} 16 L${12 + i * 17} 30 H${4 + i * 17} Z`} fill={i % 2 ? "#e07a9a" : "#f0f0f0"} opacity="0.95" />
    ))}
    <line x1={6} y1={30} x2={6} y2={44} stroke={C.woodDark} strokeWidth="2" />
    <line x1={82} y1={30} x2={82} y2={44} stroke={C.woodDark} strokeWidth="2" />
    <circle cx={30} cy={42} r={5} fill="#d97a4a" />
    <circle cx={44} cy={42} r={5} fill="#e8b64c" />
    <circle cx={58} cy={42} r={5} fill="#7fb05a" />
  </g>
);

const Schoolhouse = () => (
  <g>
    <Wall x={8} y={38} w={72} h={42} fill={C.stoneLight} stroke={C.stoneDark} />
    <Roof x={0} y={8} w={88} h={32} fill={C.roofBlue} stroke={C.roofBlueDark} />
    <Door x={20} y={52} w={18} h={28} />
    <Window x={46} y={48} size={14} />
    <Window x={64} y={48} size={14} lit />
    <line x1={74} y1={38} x2={74} y2={8} stroke={C.woodDark} strokeWidth="2.5" />
    <Flag x={74} y={10} h={20} />
    <path d="M74 30 L66 38 H82 Z" fill={C.cloth} opacity="0.9" />
  </g>
);

const Townhall = () => (
  <g>
    <Crenels x={10} y={40} w={92} />
    <Wall x={10} y={40} w={92} h={46} fill={C.stoneLight} stroke={C.stoneDark} />
    <Roof x={2} y={8} w={108} h={34} fill={C.roofRed} stroke={C.roofRedDark} />
    {Array.from({ length: 4 }, (_, i) => (
      <rect key={i} x={20 + i * 20} y={50} width={10} height={30} rx={2} fill={C.stone} stroke={C.stoneDark} strokeWidth="1.5" />
    ))}
    <Door x={46} y={56} w={20} h={30} fill={C.woodDark} />
    <Window x={30} y={16} size={13} lit />
    <Window x={70} y={16} size={13} lit />
    <circle cx={56} cy={20} r={9} fill={C.glow} stroke="#a5821a" strokeWidth="2" />
    <path d="M56 14 V20 L60 23" stroke="#8a5628" strokeWidth="2" fill="none" strokeLinecap="round" />
  </g>
);

// --- Riverstone Crossing ------------------------------------------------------

const Dock = () => (
  <g>
    <Plank x={0} y={40} w={96} h={10} />
    <rect x={8} y={50} width={7} height={26} fill={C.woodDark} />
    <rect x={44} y={50} width={7} height={26} fill={C.woodDark} />
    <rect x={80} y={50} width={7} height={26} fill={C.woodDark} />
    <path d="M0 78 q12 -5 24 0 t24 0 t24 0 t24 0" stroke="#6fa8c9" strokeWidth="3" fill="none" />
    <rect x={20} y={28} width={14} height={12} rx={2} fill={C.woodLight} stroke={C.woodDark} strokeWidth="1.5" />
    <rect x={62} y={30} width={12} height={10} rx={2} fill={C.thatch} stroke={C.thatchDark} strokeWidth="1.5" />
  </g>
);

const Mill = () => (
  <g>
    <Wall x={22} y={30} w={40} h={50} fill={C.stoneLight} stroke={C.stoneDark} />
    <Roof x={14} y={8} w={56} h={24} fill={C.roofRed} stroke={C.roofRedDark} />
    <Door x={32} y={56} w={18} h={24} />
    <Window x={26} y={38} size={12} />
    <g>
      {Array.from({ length: 4 }, (_, i) => (
        <rect key={i} x={41} y={-2} width={5} height={46} rx={2} fill={C.woodLight} stroke={C.woodDark} strokeWidth="1.5" transform={`rotate(${i * 45} 43 21)`} />
      ))}
      <circle cx={43} cy={21} r={5} fill={C.woodDark} />
    </g>
    <circle cx={70} cy={62} r={9} fill="#7fb0c9" stroke="#4a7c96" strokeWidth="2" />
  </g>
);

const Bridge = () => (
  <g>
    <path d="M0 70 A44 44 0 0 1 88 70 L88 78 L0 78 Z" fill={C.stone} stroke={C.stoneDark} strokeWidth="2" />
    <path d="M10 70 A34 34 0 0 1 78 70" fill="none" stroke={C.stoneDark} strokeWidth="2.5" />
    <path d="M22 78 A22 22 0 0 1 66 78 Z" fill="#6fa8c9" opacity="0.85" />
    <rect x={-4} y={58} width={10} height={20} fill={C.stoneLight} stroke={C.stoneDark} strokeWidth="2" />
    <rect x={82} y={58} width={10} height={20} fill={C.stoneLight} stroke={C.stoneDark} strokeWidth="2" />
    <line x1={44} y1={26} x2={44} y2={52} stroke={C.woodDark} strokeWidth="2.5" />
    <path d="M44 28 L62 36 L44 44 Z" fill={C.cloth} stroke="#a5821a" strokeWidth="1.5" />
  </g>
);

const Fishery = () => (
  <g>
    <Wall x={10} y={40} w={62} h={40} fill={C.wood} />
    <Roof x={2} y={10} w={78} h={32} fill={C.roofBlue} stroke={C.roofBlueDark} />
    <Door x={22} y={54} w={18} h={26} />
    <Window x={48} y={52} size={13} lit />
    <line x1={72} y1={40} x2={72} y2={4} stroke={C.woodDark} strokeWidth="2.5" />
    <g transform="translate(72 6)">
      <path d="M0 0 q-10 7 0 14 q10 -7 0 -14 Z" fill="#7fb0c9" stroke="#4a7c96" strokeWidth="1.5" />
      <path d="M0 2 L-7 7 L0 12 Z" fill="#5d8ab0" />
      <circle cx={0} cy={7} r={1.6} fill="#2d2a32" />
    </g>
  </g>
);

const Inn = () => (
  <g>
    <Wall x={6} y={34} w={84} h={46} fill={C.woodLight} />
    <Roof x={-2} y={6} w={100} h={30} fill={C.roofGreen} stroke="#3f6a37" />
    <Door x={20} y={50} w={20} h={30} />
    <Window x={50} y={46} size={14} lit />
    <Window x={70} y={46} size={14} />
    <line x1={62} y1={6} x2={62} y2={-14} stroke={C.woodDark} strokeWidth="2.5" />
    <rect x={48} y={-12} width={28} height={16} rx={3} fill={C.cloth} stroke="#a5821a" strokeWidth="2" />
    <path d="M55 -8 h14 M62 -12 v12" stroke="#a5821a" strokeWidth="2" strokeLinecap="round" />
  </g>
);

// --- Highland Keep ------------------------------------------------------------

const Watchtower = () => (
  <g>
    <Wall x={14} y={16} w={38} h={66} fill={C.stone} stroke={C.stoneDark} />
    <Crenels x={14} y={16} w={38} />
    <rect x={22} y={6} width={22} height={12} fill={C.stoneLight} stroke={C.stoneDark} strokeWidth="2" />
    <Window x={22} y={32} size={10} />
    <Window x={38} y={32} size={10} />
    <Window x={22} y={52} size={10} lit />
    <Window x={38} y={52} size={10} />
    <path d="M8 82 L52 82" stroke={C.stoneDark} strokeWidth="3" />
  </g>
);

const Barracks = () => (
  <g>
    <Wall x={6} y={36} w={82} h={44} fill={C.stone} stroke={C.stoneDark} />
    <Roof x={0} y={10} w={94} h={28} fill={C.roofBlueDark} stroke="#2f4a63" />
    <Door x={20} y={50} w={20} h={30} />
    <Window x={50} y={48} size={14} />
    <Window x={68} y={48} size={14} lit />
    <g>
      <path d="M20 22 h14 v10 q-7 8 -14 0 Z" fill={C.cloth} stroke="#a5821a" strokeWidth="1.5" />
      <path d="M70 22 h14 v10 q-7 8 -14 0 Z" fill={C.cloth} stroke="#a5821a" strokeWidth="1.5" />
    </g>
  </g>
);

const Chapel = () => (
  <g>
    <Wall x={14} y={40} w={54} h={40} fill={C.stoneLight} stroke={C.stoneDark} />
    <Roof x={8} y={16} w={66} h={26} fill={C.roofBlue} stroke={C.roofBlueDark} />
    <Door x={34} y={56} w={16} h={24} />
    <Window x={20} y={50} size={12} lit />
    <Window x={54} y={50} size={12} lit />
    <rect x={58} y={-2} width={16} height={20} fill={C.stoneLight} stroke={C.stoneDark} strokeWidth="2" />
    <path d="M58 -2 L66 -18 L74 -2 Z" fill={C.roofRed} stroke={C.roofRedDark} strokeWidth="2" strokeLinejoin="round" />
    <line x1={66} y1={-18} x2={66} y2={-26} stroke={C.cloth} strokeWidth="2.5" />
    <line x1={61} y1={-22} x2={71} y2={-22} stroke={C.cloth} strokeWidth="2.5" />
  </g>
);

const GreatKeep = () => (
  <g>
    <Wall x={6} y={48} w={104} h={36} fill={C.stoneLight} stroke={C.stoneDark} />
    <Crenels x={6} y={48} w={104} />
    <Wall x={16} y={18} w={30} h={30} fill={C.stone} stroke={C.stoneDark} />
    <Crenels x={16} y={18} w={30} />
    <Wall x={70} y={26} w={26} h={22} fill={C.stone} stroke={C.stoneDark} />
    <Crenels x={70} y={26} w={26} />
    <Roof x={12} y={-4} w={38} h={22} fill={C.roofRed} stroke={C.roofRedDark} />
    <Roof x={66} y={4} w={34} h={22} fill={C.roofBlue} stroke={C.roofBlueDark} />
    <Door x={50} y={58} w={20} h={26} fill={C.woodDark} />
    <Window x={22} y={30} size={10} lit />
    <Window x={34} y={30} size={10} />
    <Window x={76} y={36} size={9} lit />
    <Flag x={30} y={-4} h={22} />
    <Flag x={82} y={4} h={18} fill="#7fb0c9" />
  </g>
);

// --- Crystal Caverns ----------------------------------------------------------

const Mine = () => (
  <g>
    <path d="M0 80 L0 40 Q28 6 58 40 L58 80 Z" fill={C.stoneDark} stroke="#6b6455" strokeWidth="2" />
    <path d="M14 80 L14 48 Q28 30 44 48 L44 80 Z" fill="#2b2440" />
    <Plank x={0} y={58} w={70} h={5} />
    <Plank x={0} y={70} w={70} h={5} />
    <g>
      <rect x={48} y={44} width={22} height={16} rx={3} fill={C.woodLight} stroke={C.woodDark} strokeWidth="2" />
      <circle cx={53} cy={52} r={4} fill={C.stoneDark} />
      <circle cx={65} cy={52} r={4} fill={C.stoneDark} />
    </g>
    <g>
      <circle cx={20} cy={20} r={4} fill={C.crystal} />
      <circle cx={30} cy={12} r={3} fill={C.crystalLight} />
      <circle cx={12} cy={12} r={2.5} fill={C.crystal} />
    </g>
  </g>
);

const GemCuttersHall = () => (
  <g>
    <Wall x={8} y={38} w={78} h={42} fill="#8f7fc0" stroke="#6b5b9e" />
    <Roof x={0} y={8} w={94} h={32} fill={C.crystal} stroke="#8f7fc0" strokeWidth="2" />
    <Door x={20} y={52} w={20} h={28} fill="#5d4a8f" />
    <Window x={50} y={50} size={14} fill={C.crystalLight} />
    <g>
      <path d="M62 30 l7 -10 l7 10 l-7 10 Z" fill={C.crystalLight} stroke="#8f7fc0" strokeWidth="1.5" />
      <path d="M24 20 l6 -8 l6 8 l-6 8 Z" fill="#e8b64c" stroke="#a5821a" strokeWidth="1.5" />
    </g>
  </g>
);

const BridgeOfLight = () => (
  <g>
    <path d="M0 66 A48 48 0 0 1 96 66 L96 74 L0 74 Z" fill={C.crystal} stroke={C.crystalLight} strokeWidth="2" />
    <path d="M0 66 A48 48 0 0 1 96 66" fill="none" stroke={C.crystalLight} strokeWidth="3" />
    <path d="M20 74 A30 30 0 0 1 76 74 Z" fill={C.glow} opacity="0.55" />
    {Array.from({ length: 5 }, (_, i) => (
      <circle key={i} cx={10 + i * 19} cy={54} r={3} fill={C.crystalLight} opacity="0.9" />
    ))}
    <rect x={-4} y={54} width={10} height={20} fill="#8f7fc0" stroke={C.crystalLight} strokeWidth="2" />
    <rect x={90} y={54} width={10} height={20} fill="#8f7fc0" stroke={C.crystalLight} strokeWidth="2" />
  </g>
);

const CrystalCathedral = () => (
  <g>
    <path d="M10 80 L10 40 L46 8 L82 40 L82 80 Z" fill="#8f7fc0" stroke="#6b5b9e" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 80 L28 46 L46 30 L64 46 L64 80 Z" fill={C.crystalLight} stroke="#8f7fc0" strokeWidth="2" />
    <path d="M46 -4 L30 24 L46 40 L62 24 Z" fill={C.crystal} stroke="#8f7fc0" strokeWidth="2" strokeLinejoin="round" />
    <path d="M46 52 a8 10 0 0 1 0 20 a8 10 0 0 1 0 -20 Z" fill={C.glow} stroke="#a5821a" strokeWidth="2" />
    <circle cx={46} cy={0} r={5} fill={C.crystalLight} />
    <path d="M18 52 l6 -8 l6 8 l-6 8 Z" fill={C.glow} opacity="0.9" />
    <path d="M66 60 l5 -7 l5 7 l-5 7 Z" fill={C.glow} opacity="0.9" />
  </g>
);

// --- Dragon Peak ---------------------------------------------------------------

const Camp = () => (
  <g>
    <path d="M8 80 L36 26 L64 80 Z" fill={C.cloth} stroke="#a5821a" strokeWidth="2" strokeLinejoin="round" />
    <path d="M36 80 L36 44" stroke="#a5821a" strokeWidth="2" />
    <path d="M36 26 L36 80 L24 80 Z" fill="#d3a93f" opacity="0.6" />
    <g>
      <path d="M72 80 q-8 -12 0 -20 q8 8 0 20 Z" fill="#e8a04a" stroke="#c05a2a" strokeWidth="1.5" />
      <path d="M72 66 q-6 -8 0 -12 q6 6 0 12 Z" fill="#ffd98a" />
      <line x1={64} y1={82} x2={80} y2={82} stroke={C.woodDark} strokeWidth="3" />
      <line x1={66} y1={78} x2={78} y2={84} stroke={C.woodDark} strokeWidth="2.5" />
    </g>
  </g>
);

const DragonLair = () => (
  <g>
    <path d="M0 80 L0 34 Q34 2 70 34 L70 80 Z" fill="#7a4c2e" stroke="#5d3a20" strokeWidth="2" />
    <path d="M16 80 L16 46 Q34 30 54 46 L54 80 Z" fill="#2b2440" />
    <g transform="translate(52 44)">
      <path d="M0 12 q-14 -4 -16 -14 q10 2 14 8 q0 -8 6 -12 q4 8 2 14 q6 -4 12 -4 q-4 10 -18 8 Z" fill="#5aa86a" stroke="#3f7a4a" strokeWidth="1.5" />
      <circle cx={2} cy={2} r={1.6} fill="#ffd98a" />
    </g>
    <circle cx={20} cy={18} r={6} fill="#c9a227" opacity="0.5" />
    <circle cx={32} cy={12} r={4} fill="#c9a227" opacity="0.4" />
  </g>
);

const Observatory = () => (
  <g>
    <Wall x={16} y={44} w={62} h={36} fill={C.stoneLight} stroke={C.stoneDark} />
    <path d="M14 44 A33 30 0 0 1 80 44 Z" fill="#b9c2d6" stroke={C.stoneDark} strokeWidth="2" />
    <path d="M47 14 L72 2" stroke={C.stoneDark} strokeWidth="6" strokeLinecap="round" />
    <circle cx={73} cy={1} r={4} fill={C.stoneDark} />
    <Window x={26} y={56} size={12} lit />
    <Door x={50} y={58} w={16} h={22} />
    <circle cx={34} cy={30} r={3} fill={C.glow} />
    <circle cx={60} cy={26} r={2.4} fill={C.glow} />
  </g>
);

const DragonThrone = () => (
  <g>
    <path d="M0 80 L0 30 L30 8 L60 30 L60 80 Z" fill="#8a5a4a" stroke="#6b4234" strokeWidth="2" />
    <path d="M10 80 L10 40 L30 26 L50 40 L50 80 Z" fill="#3a2a26" />
    <path d="M30 -6 L18 22 L30 40 L42 22 Z" fill="#c95a5a" stroke="#9c3f2c" strokeWidth="2" strokeLinejoin="round" />
    <path d="M22 80 L22 58 Q30 46 38 58 L38 80 Z" fill={C.cloth} stroke="#a5821a" strokeWidth="2" />
    <g transform="translate(48 22)">
      <path d="M0 14 q-16 -6 -18 -18 q12 3 16 10 q0 -10 8 -14 q4 10 2 16 q8 -4 14 -2 q-6 12 -22 8 Z" fill="#c95a5a" stroke="#9c3f2c" strokeWidth="1.5" />
      <circle cx={2} cy={2} r={1.8} fill="#ffd98a" />
    </g>
  </g>
);

// --- castles (the capstone of every territory) ------------------------------

// A grand, unmistakable castle. `accent` tints the roofs and banners so each
// territory's castle still feels like it belongs to its region.
const CastleArt = ({ roof, roofDark, accent, glow }) => (
  <g>
    {/* curtain wall */}
    <Wall x={0} y={62} w={120} h={26} fill={C.stone} stroke={C.stoneDark} />
    <Crenels x={0} y={62} w={120} h={9} />
    {/* corner towers */}
    <Wall x={6} y={26} w={24} h={62} fill={C.stoneLight} stroke={C.stoneDark} />
    <Crenels x={6} y={26} w={24} />
    <Wall x={90} y={26} w={24} h={62} fill={C.stoneLight} stroke={C.stoneDark} />
    <Crenels x={90} y={26} w={24} />
    {/* conical roofs */}
    <path d="M4 28 L18 2 L32 28 Z" fill={roof} stroke={roofDark} strokeWidth="2" strokeLinejoin="round" />
    <path d="M88 28 L102 2 L116 28 Z" fill={roof} stroke={roofDark} strokeWidth="2" strokeLinejoin="round" />
    {/* central keep */}
    <Wall x={32} y={30} w={56} h={58} fill={C.stoneLight} stroke={C.stoneDark} />
    <Crenels x={32} y={30} w={56} />
    <path d="M28 32 L60 0 L92 32 Z" fill={roof} stroke={roofDark} strokeWidth="2" strokeLinejoin="round" />
    {/* gate */}
    <path d="M50 88 L50 68 Q60 56 70 68 L70 88 Z" fill={C.woodDark} stroke="#6b3f1c" strokeWidth="2" />
    <line x1={52} y1={72} x2={68} y2={84} stroke="#6b3f1c" strokeWidth="1.5" />
    <line x1={68} y1={72} x2={52} y2={84} stroke="#6b3f1c" strokeWidth="1.5" />
    {/* windows */}
    <Window x={38} y={40} size={10} lit />
    <Window x={72} y={40} size={10} lit />
    <Window x={12} y={36} size={9} lit />
    <Window x={98} y={36} size={9} lit />
    <Window x={38} y={58} size={10} />
    <Window x={72} y={58} size={10} />
    {/* banner + finial */}
    <Flag x={60} y={2} h={22} fill={accent} />
    <circle cx={60} cy={-4} r={4} fill={glow || C.glow} />
  </g>
);

const GreenwoodCastle = () => <CastleArt roof={C.roofGreen} roofDark="#3f6a37" accent={C.cloth} />;
const RiverstoneCastle = () => <CastleArt roof={C.roofBlue} roofDark="#3f5f80" accent="#7fb0c9" />;
const HighlandCastle = () => <CastleArt roof={C.stoneDark} roofDark="#6b6455" accent={C.cloth} />;
const CrystalCastle = () => <CastleArt roof={C.crystal} roofDark="#8f7fc0" accent={C.crystalLight} glow={C.crystalLight} />;
const DragonCastle = () => <CastleArt roof={C.roofRed} roofDark="#9c3f2c" accent="#c95a5a" />;

// --- wild land (uncleared plots) --------------------------------------------

// A plot still covered in overgrowth: trees, rocks, scrub. Drawn a little
// larger and messier than a building so it reads as "not ready yet".
const WildLand = ({ glyph, tint }) => (
  <g>
    <ellipse cx={46} cy={22} rx={42} ry={16} fill={tint} opacity="0.35" />
    <text x={16} y={-6} fontSize={30} textAnchor="middle">{glyph}</text>
    <text x={46} y={-12} fontSize={38} textAnchor="middle">{glyph}</text>
    <text x={76} y={-4} fontSize={27} textAnchor="middle">{glyph}</text>
    <path d="M4 0 q6 -12 12 0" stroke={tint} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M66 2 q6 -10 12 0" stroke={tint} strokeWidth="3" fill="none" strokeLinecap="round" />
  </g>
);

// A cleared plot: bare, level ground with a surveyor's mark.
const ClearedLand = () => (
  <g>
    <ellipse cx={46} cy={2} rx={40} ry={11} fill="#8a6a4a" opacity="0.30" />
    <ellipse cx={46} cy={-2} rx={40} ry={11} fill="#a5825a" opacity="0.45" />
    <path d="M22 -6 L46 -18 L70 -6" stroke="#7a5a3a" strokeWidth="3" fill="none" strokeLinejoin="round" opacity="0.8" />
    <line x1={46} y1={-18} x2={46} y2={4} stroke="#7a5a3a" strokeWidth="2.5" />
  </g>
);

// --- registry -----------------------------------------------------------------
// Sizes are the footprint each building occupies in scene units.
export const BUILDING_ART = {
  // Greenwood Village
  cottage: { w: 80, h: 80, Art: Cottage },
  well: { w: 66, h: 80, Art: Well },
  bakery: { w: 88, h: 80, Art: Bakery },
  market: { w: 88, h: 80, Art: Market },
  schoolhouse: { w: 88, h: 80, Art: Schoolhouse },
  townhall: { w: 112, h: 86, Art: Townhall },
  greenwoodcastle: { w: 120, h: 92, Art: GreenwoodCastle },
  // Riverstone Crossing
  dock: { w: 96, h: 84, Art: Dock },
  mill: { w: 86, h: 80, Art: Mill },
  bridge: { w: 96, h: 84, Art: Bridge },
  fishery: { w: 84, h: 80, Art: Fishery },
  inn: { w: 100, h: 84, Art: Inn },
  rivercastle: { w: 120, h: 92, Art: RiverstoneCastle },
  // Highland Keep
  watchtower: { w: 60, h: 84, Art: Watchtower },
  barracks: { w: 94, h: 82, Art: Barracks },
  chapel: { w: 84, h: 86, Art: Chapel },
  greatkeep: { w: 116, h: 88, Art: GreatKeep },
  highlandcastle: { w: 120, h: 92, Art: HighlandCastle },
  // Crystal Caverns
  mine: { w: 70, h: 82, Art: Mine },
  gemcutter: { w: 94, h: 80, Art: GemCuttersHall },
  bridgeoflight: { w: 100, h: 78, Art: BridgeOfLight },
  cathedral: { w: 92, h: 88, Art: CrystalCathedral },
  crystalcastle: { w: 120, h: 92, Art: CrystalCastle },
  // Dragon Peak
  camp: { w: 86, h: 82, Art: Camp },
  lair: { w: 74, h: 82, Art: DragonLair },
  observatory: { w: 84, h: 80, Art: Observatory },
  throne: { w: 64, h: 88, Art: DragonThrone },
  dragoncastle: { w: 120, h: 92, Art: DragonCastle },
};

export function BuildingArt({ id }) {
  const entry = BUILDING_ART[id];
  if (!entry) return null;
  const { w, h, Art } = entry;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ overflow: "visible" }}
      aria-hidden="true"
      focusable="false"
    >
      <Art />
    </svg>
  );
}

export function buildingSize(id) {
  const e = BUILDING_ART[id];
  return e ? { w: e.w, h: e.h } : { w: 80, h: 80 };
}

// Wild / cleared land art, sized to match the plot it sits on.
export function LandArt({ state, glyph = "🌳", tint = "#4f8558" }) {
  if (state === "built") return null;
  const w = 92, h = 56;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" focusable="false" style={{ overflow: "visible" }}>
      {state === "cleared" ? <ClearedLand /> : <WildLand glyph={glyph} tint={tint} />}
    </svg>
  );
}
