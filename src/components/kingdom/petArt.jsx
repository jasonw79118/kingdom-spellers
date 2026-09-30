// Pet companions — proper, distinguishable creature art.
//
// The first version drew the cat, fox and dragon from the same three shapes (an
// ellipse body, a circle head and two triangles for ears) and only changed the
// fill colour, so a "dragon" had no wings, no horns and no snout and the three
// were hard to tell apart at a glance. Each creature here is drawn from its own
// silhouette-defining features:
//
//   dragon — wings, horns, a long snout, a spiked tail
//   cat    — tall pointed ears, whiskers, a long S-curved tail
//   dog    — floppy ears, a blunt snout, a wagging tail
//   fox    — a pointed muzzle and an enormous bushy tail with a white tip
//   rabbit — very long ears, a round tail
//
// Every creature is drawn inside a 0 0 100 100 box, so the same art can be used
// in the avatar, on the kingdom and in the race without re-scaling.

const EYE = "#2d2a32";
const WHITE = "#ffffff";

// ---------------------------------------------------------------------------
// Dragon — the "baby dragon": big head, small body, wings it is proud of.
// ---------------------------------------------------------------------------
function Dragon() {
  return (
    <g>
      {/* tail, curling up behind */}
      <path
        d="M70 74 Q92 70 90 52 Q88 40 76 44"
        fill="none"
        stroke="#4f9c63"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path d="M76 44 l-4 -8 l10 3 z" fill="#3f8252" />

      {/* wings — drawn behind the body so they read as wings, not fins */}
      <path
        d="M36 58 Q4 44 10 24 Q30 34 40 50 Z"
        fill="#63b878"
        stroke="#3f8252"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M36 58 Q22 46 12 28 M36 58 Q26 42 18 34" stroke="#3f8252" strokeWidth="1.6" fill="none" />

      {/* body + pale belly */}
      <ellipse cx="50" cy="72" rx="24" ry="20" fill="#5aa86a" stroke="#3f8252" strokeWidth="2.5" />
      <ellipse cx="50" cy="77" rx="14" ry="12" fill="#cfe9b8" />

      {/* little arms */}
      <path d="M32 70 q-9 3 -10 10" stroke="#4f9c63" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M68 70 q9 3 10 10" stroke="#4f9c63" strokeWidth="6" fill="none" strokeLinecap="round" />

      {/* head */}
      <circle cx="50" cy="42" r="22" fill="#5aa86a" stroke="#3f8252" strokeWidth="2.5" />

      {/* horns */}
      <path d="M38 26 l-4 -13 l12 8 z" fill="#f0d98a" stroke="#c9a227" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M62 26 l4 -13 l-12 8 z" fill="#f0d98a" stroke="#c9a227" strokeWidth="1.6" strokeLinejoin="round" />

      {/* long snout with nostrils */}
      <ellipse cx="50" cy="52" rx="13" ry="10" fill="#8fd39a" />
      <circle cx="46" cy="49" r="1.4" fill="#3f8252" />
      <circle cx="54" cy="49" r="1.4" fill="#3f8252" />
      <path d="M45 56 q5 4 10 0" stroke="#2f6b41" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* big friendly eyes */}
      <circle cx="41" cy="39" r="4.6" fill={WHITE} />
      <circle cx="59" cy="39" r="4.6" fill={WHITE} />
      <circle cx="41" cy="39" r="2.6" fill={EYE} />
      <circle cx="59" cy="39" r="2.6" fill={EYE} />
      <circle cx="42.2" cy="37.8" r="1" fill={WHITE} />
      <circle cx="60.2" cy="37.8" r="1" fill={WHITE} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Cat — tall pointed ears and whiskers are the giveaways.
// ---------------------------------------------------------------------------
function Cat() {
  return (
    <g>
      {/* long S-curved tail */}
      <path
        d="M70 80 Q92 78 90 58 Q88 42 74 46"
        fill="none"
        stroke="#8a8a92"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M78 47 l-3 -8 l10 3 z" fill="#b9b9c2" />

      {/* sitting body */}
      <path d="M32 88 q0 -30 18 -30 q18 0 18 30 Z" fill="#9a9aa4" stroke="#6e6e78" strokeWidth="2.5" />
      <path d="M40 74 q10 5 20 0" stroke="#6e6e78" strokeWidth="2" fill="none" />

      {/* front paws */}
      <ellipse cx="42" cy="87" rx="7" ry="4.5" fill="#b9b9c2" stroke="#6e6e78" strokeWidth="2" />
      <ellipse cx="58" cy="87" rx="7" ry="4.5" fill="#b9b9c2" stroke="#6e6e78" strokeWidth="2" />

      {/* tall pointed ears */}
      <path d="M33 44 L28 16 L48 32 Z" fill="#9a9aa4" stroke="#6e6e78" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M67 44 L72 16 L52 32 Z" fill="#9a9aa4" stroke="#6e6e78" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M35 42 L32 24 L45 34 Z" fill="#e5b7c8" />
      <path d="M65 42 L68 24 L55 34 Z" fill="#e5b7c8" />

      {/* head */}
      <circle cx="50" cy="52" r="21" fill="#9a9aa4" stroke="#6e6e78" strokeWidth="2.5" />

      {/* stripes */}
      <path d="M40 36 q3 6 0 11 M50 33 q3 7 0 12 M60 36 q3 6 0 11" stroke="#6e6e78" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* eyes + nose */}
      <ellipse cx="42" cy="50" rx="4" ry="5" fill="#7fc98f" />
      <ellipse cx="58" cy="50" rx="4" ry="5" fill="#7fc98f" />
      <ellipse cx="42" cy="50" rx="1.5" ry="4.4" fill={EYE} />
      <ellipse cx="58" cy="50" rx="1.5" ry="4.4" fill={EYE} />
      <path d="M47 58 L53 58 L50 62 Z" fill="#e58fa8" />

      {/* whiskers — unmistakable on a cat */}
      <g stroke="#e8e8ee" strokeWidth="1.6" strokeLinecap="round">
        <path d="M44 60 L26 55" />
        <path d="M44 64 L26 66" />
        <path d="M56 60 L74 55" />
        <path d="M56 64 L74 66" />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Dog — floppy ears and a blunt snout; the opposite of the cat's points.
// ---------------------------------------------------------------------------
function Dog() {
  return (
    <g>
      {/* wagging tail */}
      <path
        d="M72 76 Q88 70 86 58"
        fill="none"
        stroke="#c98f5a"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* body with a patch */}
      <ellipse cx="50" cy="74" rx="22" ry="19" fill="#e0b183" stroke="#a97a4a" strokeWidth="2.5" />
      <ellipse cx="60" cy="78" rx="10" ry="8" fill="#c98f5a" />

      {/* legs */}
      <rect x="36" y="88" width="9" height="8" rx="3" fill="#e0b183" stroke="#a97a4a" strokeWidth="2" />
      <rect x="55" y="88" width="9" height="8" rx="3" fill="#e0b183" stroke="#a97a4a" strokeWidth="2" />

      {/* floppy ears — droop DOWN the sides, which is what reads as "dog" */}
      <path d="M32 40 Q18 44 20 64 Q22 76 32 72 Z" fill="#a97a4a" stroke="#7d5733" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M68 40 Q82 44 80 64 Q78 76 68 72 Z" fill="#a97a4a" stroke="#7d5733" strokeWidth="2.5" strokeLinejoin="round" />

      {/* head */}
      <circle cx="50" cy="50" r="20" fill="#e0b183" stroke="#a97a4a" strokeWidth="2.5" />

      {/* blunt snout */}
      <ellipse cx="50" cy="60" rx="13" ry="10" fill="#f2d6b8" stroke="#a97a4a" strokeWidth="2" />
      <ellipse cx="50" cy="56" rx="4.5" ry="3.4" fill={EYE} />
      <path d="M50 60 L50 64" stroke="#a97a4a" strokeWidth="1.8" strokeLinecap="round" />

      {/* eyes */}
      <circle cx="41" cy="46" r="4.2" fill={WHITE} />
      <circle cx="59" cy="46" r="4.2" fill={WHITE} />
      <circle cx="41" cy="46" r="2.4" fill={EYE} />
      <circle cx="59" cy="46" r="2.4" fill={EYE} />
      <circle cx="42.2" cy="44.8" r="1" fill={WHITE} />
      <circle cx="60.2" cy="44.8" r="1" fill={WHITE} />

      {/* happy tongue */}
      <path d="M46 66 q4 8 8 0 q-4 3 -8 0" fill="#e58fa8" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Fox — pointed muzzle plus an enormous bushy tail with a white tip.
// ---------------------------------------------------------------------------
function Fox() {
  return (
    <g>
      {/* the tail is the whole point of a fox */}
      <path
        d="M70 78 Q96 76 94 52 Q92 32 74 36 Q64 40 68 50"
        fill="#d97a4a"
        stroke="#a8552c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M74 36 Q64 40 68 50" fill="none" stroke="#f6e3d0" strokeWidth="6" strokeLinecap="round" />

      {/* slim body */}
      <ellipse cx="50" cy="74" rx="20" ry="18" fill="#d97a4a" stroke="#a8552c" strokeWidth="2.5" />
      <ellipse cx="50" cy="78" rx="12" ry="11" fill="#f6e3d0" />

      {/* dark socks */}
      <rect x="37" y="88" width="8" height="7" rx="3" fill="#8f4525" />
      <rect x="55" y="88" width="8" height="7" rx="3" fill="#8f4525" />

      {/* pointed ears */}
      <path d="M34 42 L30 18 L48 32 Z" fill="#d97a4a" stroke="#a8552c" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M66 42 L70 18 L52 32 Z" fill="#d97a4a" stroke="#a8552c" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M36 40 L33 24 L44 33 Z" fill="#3d2a22" />
      <path d="M64 40 L67 24 L56 33 Z" fill="#3d2a22" />

      {/* head + pointed muzzle */}
      <circle cx="50" cy="50" r="20" fill="#d97a4a" stroke="#a8552c" strokeWidth="2.5" />
      <path d="M50 50 L50 68 Q38 66 38 56 Z" fill="#f6e3d0" stroke="#a8552c" strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="50" cy="68" rx="3.6" ry="2.8" fill={EYE} />

      {/* eyes */}
      <ellipse cx="42" cy="48" rx="3.6" ry="4.4" fill="#2f2a3a" />
      <ellipse cx="58" cy="48" rx="3.6" ry="4.4" fill="#2f2a3a" />
      <circle cx="43.2" cy="46.4" r="1.2" fill={WHITE} />
      <circle cx="59.2" cy="46.4" r="1.2" fill={WHITE} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Rabbit — very long ears, tiny round tail.
// ---------------------------------------------------------------------------
function Rabbit() {
  return (
    <g>
      <circle cx="76" cy="78" r="9" fill="#f4eef7" stroke="#c9bcd4" strokeWidth="2" />
      <ellipse cx="50" cy="76" rx="19" ry="17" fill="#f4eef7" stroke="#c9bcd4" strokeWidth="2.5" />
      <ellipse cx="50" cy="79" rx="11" ry="10" fill="#e6dcee" />

      {/* the ears */}
      <ellipse cx="41" cy="26" rx="7" ry="21" fill="#f4eef7" stroke="#c9bcd4" strokeWidth="2.5" transform="rotate(-9 41 26)" />
      <ellipse cx="59" cy="26" rx="7" ry="21" fill="#f4eef7" stroke="#c9bcd4" strokeWidth="2.5" transform="rotate(9 59 26)" />
      <ellipse cx="41" cy="27" rx="3" ry="15" fill="#e8b7c8" transform="rotate(-9 41 27)" />
      <ellipse cx="59" cy="27" rx="3" ry="15" fill="#e8b7c8" transform="rotate(9 59 27)" />

      <circle cx="50" cy="54" r="19" fill="#f4eef7" stroke="#c9bcd4" strokeWidth="2.5" />
      <circle cx="43" cy="52" r="4" fill={WHITE} />
      <circle cx="57" cy="52" r="4" fill={WHITE} />
      <circle cx="43" cy="52" r="2.3" fill={EYE} />
      <circle cx="57" cy="52" r="2.3" fill={EYE} />
      <path d="M47 60 L53 60 L50 63 Z" fill="#e58fa8" />
      <path d="M50 63 v3 M50 66 q-4 3 -6 0 M50 66 q4 3 6 0" stroke="#c9bcd4" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

export const PET_ART = {
  dragon: Dragon,
  cat: Cat,
  dog: Dog,
  fox: Fox,
  rabbit: Rabbit,
};

export const PETS = [
  { id: "cat", label: "Castle Cat", rarity: "common", speed: 3, blurb: "Quick on their paws" },
  { id: "dog", label: "Hound Dog", rarity: "common", speed: 3, blurb: "Always first to the gate" },
  { id: "fox", label: "Forest Fox", rarity: "rare", speed: 4, blurb: "Sly and speedy" },
  { id: "rabbit", label: "Castle Rabbit", rarity: "rare", speed: 4, blurb: "Hops the length of the kingdom" },
  { id: "dragon", label: "Baby Dragon", rarity: "epic", speed: 5, blurb: "Breathes fire. Runs faster." },
];

export function hasPetArt(id) {
  return Object.prototype.hasOwnProperty.call(PET_ART, id);
}

/** Human-readable name for a pet id, falling back to the id itself. */
export function petLabelFor(id) {
  return PETS.find((p) => p.id === id)?.label || "Your pet";
}

/**
 * Render a pet as a standalone SVG.
 *
 * @param {string} id      one of the keys of PET_ART
 * @param {number} size    pixel size
 * @param {string} label   accessible name; omit for decorative use
 */
export default function PetArt({ id, size = 64, label, className, style }) {
  const Art = PET_ART[id];
  if (!Art) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
      focusable="false"
    >
      <Art />
    </svg>
  );
}
