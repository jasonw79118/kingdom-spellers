// SVG avatar renderer — a customizable storybook adventurer.
// Supports: base (boy/girl), skin tone, hair style + color, tunic color,
// cape, shield, crown/helmet, and a companion pet. Items unlock through
// gameplay; the avatar is pure SVG so it scales crisply on any screen.

import { PET_ART } from "./kingdom/petArt";

const SKIN_TONES = ["#f6d7b8", "#f2c9a0", "#e0ac7e", "#c98d5f", "#a06a42", "#7a4c2e"];
const HAIR_COLORS = ["#2e2018", "#5a3a22", "#8a5a2e", "#c9962e", "#d97a4a", "#b8b8c0", "#7a4c2e"];
const TUNIC_COLORS = ["#6b5b9e", "#4a7c59", "#c95a5a", "#6fa8c9", "#c9962e", "#d97a9a"];

export const AVATAR_OPTIONS = {
  bases: [
    { id: "boy", label: "Boy" },
    { id: "girl", label: "Girl" },
  ],
  skins: SKIN_TONES.map((c) => ({ id: c, label: c })),
  hairs: [
    { id: "short", label: "Short" },
    { id: "long", label: "Long" },
    { id: "curly", label: "Curly" },
    { id: "ponytail", label: "Ponytail" },
    { id: "bun", label: "Bun" },
  ],
  hairColors: HAIR_COLORS.map((c) => ({ id: c, label: c })),
  tunics: TUNIC_COLORS.map((c) => ({ id: c, label: c })),
  capes: [
    { id: null, label: "None" },
    { id: "blue", label: "Blue" },
    { id: "red", label: "Red" },
    { id: "royal", label: "Royal" },
  ],
  shields: [
    { id: null, label: "None" },
    { id: "wood", label: "Wood" },
    { id: "knight", label: "Knight" },
  ],
  crowns: [
    { id: null, label: "None" },
    { id: "brass", label: "Brass" },
    { id: "royal", label: "Royal" },
  ],
  companions: [
    { id: null, label: "None" },
    { id: "cat", label: "Cat" },
    { id: "dog", label: "Dog" },
    { id: "fox", label: "Fox" },
    { id: "rabbit", label: "Rabbit" },
    { id: "dragon", label: "Dragon" },
  ],
};

export const DEFAULT_AVATAR = {
  base: "boy",
  skin: "#f2c9a0",
  hair: "short",
  hairColor: "#5a3a22",
  tunic: "#6b5b9e",
  cape: null,
  shield: null,
  crown: null,
  companion: null,
};

const CAPE_COLORS = { blue: "#4a7fb5", red: "#c95a5a", royal: "#6b5b9e" };
const CROWN_COLORS = { brass: "#c9962e", royal: "#e8b64c" };

function Hair({ style, color, base }) {
  switch (style) {
    case "long":
      return (
        <g fill={color}>
          <path d="M38 34 Q38 14 60 14 Q82 14 82 34 L82 62 Q76 58 74 40 Q70 30 60 30 Q50 30 46 40 Q44 58 38 62 Z" />
          {base === "girl" && <path d="M34 40 Q30 70 36 84 Q40 70 42 52 Z" />}
          {base === "girl" && <path d="M86 40 Q90 70 84 84 Q80 70 78 52 Z" />}
        </g>
      );
    case "curly":
      return (
        <g fill={color}>
          <circle cx="42" cy="26" r="10" />
          <circle cx="54" cy="20" r="11" />
          <circle cx="66" cy="20" r="11" />
          <circle cx="78" cy="26" r="10" />
          <circle cx="38" cy="36" r="8" />
          <circle cx="82" cy="36" r="8" />
          <circle cx="60" cy="16" r="10" />
        </g>
      );
    case "ponytail":
      return (
        <g fill={color}>
          <path d="M38 36 Q38 14 60 14 Q82 14 82 36 Q82 44 78 46 Q70 30 60 30 Q50 30 42 46 Q38 44 38 36 Z" />
          <path d="M78 30 Q92 40 88 66 Q84 50 76 44 Z" />
          <circle cx="80" cy="30" r="4" />
        </g>
      );
    case "bun":
      return (
        <g fill={color}>
          <path d="M38 36 Q38 14 60 14 Q82 14 82 36 Q82 44 78 46 Q70 30 60 30 Q50 30 42 46 Q38 44 38 36 Z" />
          <circle cx="60" cy="12" r="9" />
        </g>
      );
    case "short":
    default:
      return (
        <g fill={color}>
          <path d="M38 38 Q36 14 60 14 Q84 14 82 38 Q80 28 72 26 Q74 32 70 30 Q66 22 60 22 Q54 22 50 30 Q46 32 48 26 Q40 28 38 38 Z" />
        </g>
      );
  }
}

// The companion is drawn from the shared pet artwork rather than inlined here,
// so a pet looks the same in the avatar, on the kingdom and in the race.
// The pet art lives in a 0 0 100 100 box; this places it at the avatar's
// bottom-right with its paws on the ground.
function Companion({ type }) {
  const Art = type ? PET_ART[type] : null;
  if (!Art) return null;
  return (
    <g transform="translate(97 104) scale(0.42) translate(-50 -100)">
      <Art />
    </g>
  );
}

export default function Avatar({ config = DEFAULT_AVATAR, size = 96, className = "" }) {
  const a = { ...DEFAULT_AVATAR, ...config };
  const capeColor = a.cape ? CAPE_COLORS[a.cape] : null;
  const crownColor = a.crown ? CROWN_COLORS[a.crown] : null;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`avatar ${className}`}
      role="img"
      aria-label="player avatar"
    >
      {/* cape (behind body) */}
      {capeColor && (
        <path
          d="M40 58 Q30 96 36 112 L84 112 Q90 96 80 58 Q70 70 60 70 Q50 70 40 58 Z"
          fill={capeColor}
          opacity="0.9"
        />
      )}

      {/* body / tunic */}
      <path d="M42 62 Q60 54 78 62 L82 104 Q60 112 38 104 Z" fill={a.tunic} />
      <path d="M42 62 Q60 54 78 62 L79 72 Q60 65 41 72 Z" fill="rgba(0,0,0,0.12)" />
      {/* belt */}
      <rect x="42" y="86" width="36" height="6" rx="3" fill="rgba(0,0,0,0.18)" />
      <rect x="56" y="85" width="8" height="8" rx="2" fill="#e8b64c" />

      {/* head */}
      <circle cx="60" cy="40" r="22" fill={a.skin} />
      {/* ears */}
      <circle cx="38" cy="42" r="4" fill={a.skin} />
      <circle cx="82" cy="42" r="4" fill={a.skin} />

      {/* hair */}
      <Hair style={a.hair} color={a.hairColor} base={a.base} />

      {/* face */}
      <circle cx="52" cy="42" r="2.4" fill="#2d2a32" />
      <circle cx="68" cy="42" r="2.4" fill="#2d2a32" />
      <circle cx="53" cy="41" r="0.8" fill="#fff" />
      <circle cx="69" cy="41" r="0.8" fill="#fff" />
      <path d="M54 50 Q60 55 66 50" stroke="#2d2a32" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="47" cy="48" r="3" fill="rgba(217,122,154,0.35)" />
      <circle cx="73" cy="48" r="3" fill="rgba(217,122,154,0.35)" />

      {/* crown / helmet */}
      {a.crown && (
        <g transform="translate(60 16)">
          <path d="M-12 6 L-12 -4 L-6 0 L0 -8 L6 0 L12 -4 L12 6 Z" fill={crownColor} />
          <circle cx="0" cy="-8" r="2" fill={crownColor} />
          <circle cx="-12" cy="-4" r="1.6" fill={crownColor} />
          <circle cx="12" cy="-4" r="1.6" fill={crownColor} />
          <rect x="-12" y="6" width="24" height="3" rx="1.5" fill="rgba(0,0,0,0.15)" />
        </g>
      )}

      {/* shield */}
      {a.shield && (
        <g transform="translate(20 78)">
          <path d="M0 0 Q14 0 14 0 L14 16 Q14 28 0 34 Q-14 28 -14 16 L-14 0 Q-14 0 0 0 Z"
            fill={a.shield === "knight" ? "#9aa2b0" : "#a07a4a"} />
          <path d="M0 4 Q10 4 10 4 L10 16 Q10 24 0 29 Q-10 24 -10 16 L-10 4 Q-10 4 0 4 Z"
            fill={a.shield === "knight" ? "#c4ccda" : "#c9962e"} />
          <circle cx="0" cy="14" r="4" fill={a.shield === "knight" ? "#6b5b9e" : "#8a5a2e"} />
        </g>
      )}

      <Companion type={a.companion} />
    </svg>
  );
}
