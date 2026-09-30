// Where things go.
//
// This is the single source of truth for a territory's composition. It answers:
// what district is each plot in, where does it sit, and — the part that actually
// matters for how the game feels — how much of a settlement exists at each
// stage of the player's progress.
//
// The critical design decision lives at the bottom of this file, in
// `stageFor()`. The old scene drew ~30 cottages, 5 fields, 18 props and 270
// plants unconditionally, so a player with 0/7 built was looking at a finished
// village. That destroys the reward loop: nothing you buy is visible because
// everything is already there. Now the settlement grows.
//
// Layout coordinates are in GRID space. The grid is never drawn. It exists for
// collision, placement anchors and saving, and nothing else — which is what
// lets the artwork extend well past any cell boundary.

export { N } from "./terrain";

// ---------------------------------------------------------------------------
// District definitions, for reference and for the Build Mode district picker
// ---------------------------------------------------------------------------

export const DISTRICTS = {
  castle: { id: "castle", name: "Castle District", blurb: "The keep, its walls and the lord's gardens." },
  village: { id: "village", name: "Village District", blurb: "Cottages, the well, and the lanes between them." },
  market: { id: "market", name: "Market District", blurb: "Stalls, shops and the square they trade in." },
  farm: { id: "farm", name: "Agricultural District", blurb: "Fields, barns and grazing at the edge." },
  riverside: { id: "riverside", name: "Riverside District", blurb: "The bridge, the ford, and mills by the water." },
};

// ---------------------------------------------------------------------------
// Plot anchors
// ---------------------------------------------------------------------------
//
// For Greenwood Village, composed around the castle at the back of the map so
// the keep reads as the centrepiece and the settlement spreads toward the viewer
// and out to the edges.
//
// Each entry is: district, x, y, footprint [w, d].
//
// The footprint is the LOGICAL cell count. The artwork deliberately overruns it
// (overhanging roofs, chimneys, wood piles) — see `artBleed` below.

export const ANCHORS = {
  // --- Greenwood Village (7 plots) ------------------------------------------
  cottage: { district: "village", x: 3.9, y: 5.6, w: 1.6, d: 1.4 },
  well: { district: "village", x: 6.9, y: 6.5, w: 0.7, d: 0.7 },
  bakery: { district: "market", x: 6.0, y: 7.6, w: 1.7, d: 1.4 },
  market: { district: "market", x: 8.0, y: 5.9, w: 2.0, d: 1.6 },
  schoolhouse: { district: "village", x: 9.5, y: 4.2, w: 1.9, d: 1.5 },
  townhall: { district: "village", x: 5.5, y: 5.0, w: 2.4, d: 1.9 },
  greenwoodcastle: { district: "castle", x: 3.0, y: 2.0, w: 3.4, d: 2.8 },

  // --- Riverstone Crossing (6 plots) ----------------------------------------
  dock: { district: "riverside", x: 5.6, y: 11.4, w: 1.6, d: 1.1 },
  mill: { district: "riverside", x: 2.9, y: 9.4, w: 1.8, d: 1.6 },
  bridge: { district: "riverside", x: 7.4, y: 8.6, w: 2.4, d: 0.9 },
  fishery: { district: "riverside", x: 10.4, y: 10.4, w: 1.9, d: 1.4 },
  inn: { district: "village", x: 6.6, y: 5.6, w: 2.0, d: 1.6 },
  rivercastle: { district: "castle", x: 3.0, y: 2.0, w: 3.4, d: 2.8 },

  // --- Highland Keep (5 plots) ----------------------------------------------
  watchtower: { district: "village", x: 6.4, y: 3.4, w: 1.0, d: 1.0 },
  barracks: { district: "village", x: 8.2, y: 5.0, w: 2.1, d: 1.5 },
  chapel: { district: "village", x: 5.2, y: 6.6, w: 1.6, d: 1.9 },
  greatkeep: { district: "village", x: 8.4, y: 7.4, w: 2.6, d: 2.0 },
  highlandcastle: { district: "castle", x: 3.0, y: 2.0, w: 3.4, d: 2.8 },

  // --- Crystal Caverns (5 plots) --------------------------------------------
  mine: { district: "farm", x: 8.6, y: 8.4, w: 2.2, d: 1.8 },
  gemcutter: { district: "market", x: 6.8, y: 6.8, w: 1.8, d: 1.5 },
  bridgeoflight: { district: "riverside", x: 7.4, y: 8.6, w: 2.4, d: 0.9 },
  cathedral: { district: "village", x: 5.4, y: 4.6, w: 2.2, d: 2.6 },
  crystalcastle: { district: "castle", x: 3.0, y: 2.0, w: 3.4, d: 2.8 },

  // --- Dragon Peak (5 plots) ------------------------------------------------
  camp: { district: "farm", x: 8.4, y: 8.2, w: 1.9, d: 1.5 },
  lair: { district: "farm", x: 11.0, y: 6.0, w: 2.4, d: 2.2 },
  observatory: { district: "village", x: 6.6, y: 4.4, w: 1.7, d: 1.7 },
  throne: { district: "village", x: 8.8, y: 6.0, w: 2.3, d: 1.8 },
  dragoncastle: { district: "castle", x: 3.0, y: 2.0, w: 3.4, d: 2.8 },
};

/** The castle always sits here, whether or not the player has built it. */
export const CASTLE_SITE = { x: 3.0, y: 2.0 };

/**
 * How far the artwork may extend past a plot's logical footprint.
 *
 * Brief §13: a cottage may occupy 2x2 cells but its roof, chimney and wood pile
 * should spill outside them. Without this bleed, every building is visibly
 * clipped to its own cell and the world reads as tiled.
 */
export const artBleed = (w, d) => ({ left: 0.26, right: 0.3, back: 0.24, front: 0.3, extraW: w * 0.4, extraD: d * 0.4 });

// ---------------------------------------------------------------------------
// Development stages
// ---------------------------------------------------------------------------
//
// The heart of the reward loop. A stage is derived purely from how much the
// player has built, and it decides how much of a settlement exists.
//
//   0  wild      — a fort on a rise, a couple of tenants' shacks, open land
//   1  holding   — proper cottages, a well, a garden, the first fences
//   2  hamlet    — a lane of houses, a market square, a field or two
//   3  village   — a real town: full road, many houses, a mill, a bridge
//   4  township  — walls, gardens, orchards, a busy square, distant towns
//
// At stage 0 the player sees mostly unbroken land. That is the point: they
// should be able to look at their kingdom and say "I built that".

export const STAGES = [
  {
    id: 0,
    name: "Wild Land",
    blurb: "A fort on the rise and a wild valley. Everything else is yours to build.",
    cottages: 2,
    fields: 0,
    props: 3,
    stalls: 0,
    people: 0,
    livestock: 1,
    woodland: 0.55,
    gardenBeds: 1,
    roadPaved: false,
    walls: false,
    farTowns: 0,
  },
  {
    id: 1,
    name: "Holding",
    blurb: "A lord's holding: a few families settled on the ridge road.",
    cottages: 5,
    fields: 1,
    props: 9,
    stalls: 0,
    people: 2,
    livestock: 3,
    woodland: 0.45,
    gardenBeds: 3,
    roadPaved: false,
    walls: false,
    farTowns: 0,
  },
  {
    id: 2,
    name: "Hamlet",
    blurb: "A lane of houses and a market square begin to form.",
    cottages: 9,
    fields: 3,
    props: 18,
    stalls: 3,
    people: 4,
    livestock: 5,
    woodland: 0.32,
    gardenBeds: 6,
    roadPaved: false,
    walls: false,
    farTowns: 1,
  },
  {
    id: 3,
    name: "Village",
    blurb: "A proper village: paved square, a mill, fields worked year on year.",
    cottages: 15,
    fields: 5,
    props: 30,
    stalls: 5,
    people: 7,
    livestock: 8,
    woodland: 0.22,
    gardenBeds: 9,
    roadPaved: true,
    walls: false,
    farTowns: 2,
  },
  {
    id: 4,
    name: "Township",
    blurb: "A walled township. Neighbours can see your prosperity from their fields.",
    cottages: 21,
    fields: 7,
    props: 44,
    stalls: 7,
    people: 11,
    livestock: 12,
    woodland: 0.14,
    gardenBeds: 12,
    roadPaved: true,
    walls: true,
    farTowns: 3,
  },
];

/** The top of the ladder, for clamping. */
export const MAX_STAGE = STAGES.length - 1;

/**
 * Which development stage a territory is at.
 *
 * Derived from how many of its plots are actually standing, so it can never
 * disagree with what the player has built. `builtCount` and `totalCount` are
 * passed in rather than read from the progress object so this stays a pure
 * function of its arguments and is directly unit-testable.
 *
 * The thresholds are uneven on purpose. The first two buildings are the
 * exciting ones — clearing the first plot and raising the first cottage should
 * visibly change the world — so stages come quickly at the start and then
 * stretch out, which keeps late purchases feeling like achievements.
 */
export function stageFor(builtCount, totalCount) {
  if (!totalCount) return 0;
  const frac = Math.max(0, Math.min(1, builtCount / totalCount));
  if (frac >= 1) return MAX_STAGE;
  if (frac >= 0.72) return 4;
  if (frac >= 0.5) return 3;
  if (frac >= 0.3) return 2;
  if (frac > 0) return 1;
  return 0;
}

/** The stage's descriptive record, for the kingdom screen. */
export function stageInfo(stage) {
  return STAGES[Math.max(0, Math.min(MAX_STAGE, stage))];
}
