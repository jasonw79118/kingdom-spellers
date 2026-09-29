// Kingdom Spellers — game data & progression rules.
//
// The core loop:
//   spell words correctly  ->  earn gold + XP
//   spend gold              ->  build up your kingdom
//   a prosperous kingdom   ->  rise in rank (Esquire -> ... -> King/Queen)
//   enough prosperity      ->  claim the next territory
//
// This file is pure data + pure functions so it can be unit-tested and
// reused by both the practice engine and the kingdom screen.

// ---------------------------------------------------------------------------
// RANKS
// ---------------------------------------------------------------------------
// A player's rank is determined by total prosperity (points) earned across
// all their buildings. Rank is the "hero" identity: the more prosperous the
// kingdom, the greater the hero.
export const RANKS = [
  { id: 0, title: "Esquire", min: 0, icon: "🛡️", blurb: "Your adventure begins." },
  { id: 1, title: "Knight", min: 150, icon: "⚔️", blurb: "Your kingdom takes shape." },
  { id: 2, title: "Baron", min: 400, icon: "🏰", blurb: "Your halls are filling up." },
  { id: 3, title: "Prince", min: 800, icon: "👑", blurb: "The realm knows your name." },
  { id: 4, title: "King", min: 1400, icon: "👑", blurb: "Your legend is written." },
];

// Female players get the regal title at the top rank.
export function rankForProsperity(prosperity, base = "boy") {
  const isFemale = base === "girl";
  let current = RANKS[0];
  for (const r of RANKS) {
    if (prosperity >= r.min) current = r;
  }
  if (isFemale && current.id === RANKS.length - 1) {
    return { ...current, title: "Queen" };
  }
  return current;
}

// Progress toward the next rank (0..1) and the points still needed.
export function rankProgress(prosperity) {
  const next = RANKS.find((r) => r.min > prosperity);
  if (!next) return { percent: 100, needed: 0, next: null };
  const current = [...RANKS].reverse().find((r) => r.min <= prosperity) || RANKS[0];
  const span = next.min - current.min;
  const into = prosperity - current.min;
  return {
    percent: Math.max(0, Math.min(100, Math.round((into / span) * 100))),
    needed: next.min - prosperity,
    next,
  };
}

// ---------------------------------------------------------------------------
// REWARDS
// ---------------------------------------------------------------------------
// Royal Tests are graded practice: they build mastery and feed the progress
// report, but they deliberately pay NO gold or XP, so points always come from
// real practice and the kingdom can never be farmed by re-testing.
export const REWARDS = {
  // Gold awarded per correct spelling. Scaled a little by difficulty.
  goldPerWord: { easy: 12, medium: 10, hard: 14 },
  // Multipliers applied to the base award.
  streakBonusPerDay: 0.05,   // +5% per consecutive practice day (cap below)
  streakBonusCap: 0.5,       // max +50%
  reviewBonus: 0.25,         // re-practising a word you've missed
  // Tests pay nothing.
  testGold: 0,
  testXp: 0,
};

// XP for one correct word in a practice session.
export const XP_PER_WORD = 10;

// Gold needed to "claim" a new territory.
export const TERRITORY_CLAIM_COST = [
  0,    // Greenwood Village — already yours
  500,  // Riverstone Crossing
  1200, // Highland Keep
  2200, // Crystal Caverns
  3600, // Dragon Peak
];

// ---------------------------------------------------------------------------
// KINGDOMS + BUILDINGS
// ---------------------------------------------------------------------------
// Land starts wild — covered in trees and rocks. Each plot must be CLEARED
// first (cheap), then BUILT on (expensive). Every territory ends with a
// castle, the grand capstone that completes the region.
//
// `clearCost` is the gold to clear the plot; `cost` is the gold to build.
export const KINGDOMS = [
  {
    id: 1,
    name: "Greenwood Village",
    subtitle: "A quiet start among tall trees",
    theme: "forest",
    wild: "🌳",
    sky: ["#bfe6c8", "#8fce9e"],
    ground: "#6aa96f",
    buildings: [
      { id: "cottage", name: "Wooden Cottage", icon: "🏠", cost: 40, clearCost: 10, prosperity: 30, tier: 0 },
      { id: "well", name: "Village Well", icon: "🕳️", cost: 60, clearCost: 14, prosperity: 45, tier: 0 },
      { id: "bakery", name: "Village Bakery", icon: "🥖", cost: 90, clearCost: 20, prosperity: 65, tier: 0 },
      { id: "market", name: "Open Market", icon: "🏪", cost: 140, clearCost: 30, prosperity: 90, tier: 1 },
      { id: "schoolhouse", name: "Little School", icon: "🏫", cost: 200, clearCost: 45, prosperity: 130, tier: 1 },
      { id: "townhall", name: "Town Hall", icon: "🏛️", cost: 320, clearCost: 70, prosperity: 200, tier: 2 },
      { id: "greenwoodcastle", name: "Greenwood Castle", icon: "🏰", cost: 600, clearCost: 120, prosperity: 420, tier: 3, castle: true },
    ],
  },
  {
    id: 2,
    name: "Riverstone Crossing",
    subtitle: "Where the river meets the road",
    theme: "river",
    wild: "🌾",
    sky: ["#cfe6f5", "#9cc6e0"],
    ground: "#6f9f6a",
    buildings: [
      { id: "dock", name: "Wooden Dock", icon: "⚓", cost: 120, clearCost: 25, prosperity: 90, tier: 0 },
      { id: "mill", name: "Water Mill", icon: "🌾", cost: 220, clearCost: 45, prosperity: 150, tier: 0 },
      { id: "bridge", name: "Stone Bridge", icon: "🌉", cost: 340, clearCost: 70, prosperity: 220, tier: 1 },
      { id: "fishery", name: "Riverside Fishery", icon: "🎣", cost: 480, clearCost: 95, prosperity: 300, tier: 1 },
      { id: "inn", name: "Crossing Inn", icon: "🍺", cost: 680, clearCost: 130, prosperity: 420, tier: 2 },
      { id: "rivercastle", name: "Riverstone Castle", icon: "🏰", cost: 1000, clearCost: 190, prosperity: 650, tier: 3, castle: true },
    ],
  },
  {
    id: 3,
    name: "Highland Keep",
    subtitle: "A stronghold above the clouds",
    theme: "highland",
    wild: "🌲",
    sky: ["#dfe4ef", "#b9c2d6"],
    ground: "#7d8b6a",
    buildings: [
      { id: "watchtower", name: "Stone Watchtower", icon: "🗼", cost: 200, clearCost: 40, prosperity: 150, tier: 0 },
      { id: "barracks", name: "Guard Barracks", icon: "🛡️", cost: 320, clearCost: 65, prosperity: 230, tier: 0 },
      { id: "chapel", name: "Highland Chapel", icon: "⛪", cost: 480, clearCost: 95, prosperity: 330, tier: 1 },
      { id: "greatkeep", name: "The Great Keep", icon: "🏯", cost: 780, clearCost: 150, prosperity: 520, tier: 2 },
      { id: "highlandcastle", name: "Highland Castle", icon: "🏰", cost: 1200, clearCost: 220, prosperity: 780, tier: 3, castle: true },
    ],
  },
  {
    id: 4,
    name: "Crystal Caverns",
    subtitle: "Caverns that sing in the dark",
    theme: "cavern",
    wild: "🪨",
    sky: ["#d7d2f2", "#b0a5e0"],
    ground: "#6b5b9e",
    buildings: [
      { id: "mine", name: "Crystal Mine", icon: "⛏️", cost: 300, clearCost: 60, prosperity: 220, tier: 0 },
      { id: "gemcutter", name: "Gem Cutter's Hall", icon: "💎", cost: 520, clearCost: 100, prosperity: 360, tier: 0 },
      { id: "bridgeoflight", name: "Bridge of Light", icon: "🌟", cost: 860, clearCost: 160, prosperity: 560, tier: 1 },
      { id: "cathedral", name: "Crystal Cathedral", icon: "⛩️", cost: 1300, clearCost: 230, prosperity: 820, tier: 2 },
      { id: "crystalcastle", name: "Crystal Palace", icon: "🏰", cost: 1800, clearCost: 300, prosperity: 1100, tier: 3, castle: true },
    ],
  },
  {
    id: 5,
    name: "Dragon Peak",
    subtitle: "The highest mountain in the realm",
    theme: "peak",
    wild: "🌋",
    sky: ["#ffd9c0", "#f0a882"],
    ground: "#8a5a4a",
    buildings: [
      { id: "camp", name: "Climber's Camp", icon: "⛺", cost: 400, clearCost: 80, prosperity: 300, tier: 0 },
      { id: "lair", name: "Dragon Lair", icon: "🐉", cost: 700, clearCost: 135, prosperity: 500, tier: 0 },
      { id: "observatory", name: "Sky Observatory", icon: "🔭", cost: 1100, clearCost: 200, prosperity: 760, tier: 1 },
      { id: "throne", name: "Dragon Throne", icon: "👑", cost: 1800, clearCost: 310, prosperity: 1200, tier: 2 },
      { id: "dragoncastle", name: "Dragon Citadel", icon: "🏰", cost: 2400, clearCost: 400, prosperity: 1500, tier: 3, castle: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// PROGRESSION HELPERS
// ---------------------------------------------------------------------------

// Total prosperity = sum of prosperity of every BUILT building.
export function prosperityOf(builtIds) {
  const built = new Set(builtIds || []);
  return KINGDOMS.reduce((total, kingdom) => {
    for (const b of kingdom.buildings) {
      if (built.has(b.id)) total += b.prosperity;
    }
    return total;
  }, 0);
}

// ---------------------------------------------------------------------------
// PLOT STATES
// ---------------------------------------------------------------------------
// Each plot is one of:
//   "wild"    — untouched land, full of trees/rocks (the default)
//   "cleared" — land cleared, ready to build
//   "built"   — a building stands here
export const PLOT = { WILD: "wild", CLEARED: "cleared", BUILT: "built" };

// Read a plot's state out of the saved progress object.
//
// Older saves stored `{ cottage: true }`. Those migrate to BUILT so an
// existing kingdom is never silently wiped back to wild land. Anything
// missing, false or unrecognised is wild land — what a fresh kingdom looks like.
export function plotState(progress, plotId) {
  const v = progress?.[plotId];
  if (v === PLOT.BUILT || v === PLOT.CLEARED) return v;
  if (v === true) return PLOT.BUILT;
  return PLOT.WILD;
}

// Plots in a given state, optionally within one territory.
export function plotsInState(progress, state, kingdom) {
  const list = kingdom ? [kingdom] : KINGDOMS;
  const out = [];
  for (const k of list) {
    for (const b of k.buildings) {
      if (plotState(progress, b.id) === state) out.push({ building: b, kingdom: k });
    }
  }
  return out;
}

// Has this territory's castle been raised? The castle is the capstone
// building, so this is the region's milestone moment.
export function castleBuilt(progress, kingdom) {
  const c = castleOf(kingdom);
  return Boolean(c) && plotState(progress, c.id) === PLOT.BUILT;
}

// Is every plot in this territory built? (the stricter "fully developed" state)
export function isRegionComplete(progress, kingdom) {
  return kingdom.buildings.every((b) => plotState(progress, b.id) === PLOT.BUILT);
}

// The castle in a territory, if it has one.
export function castleOf(kingdom) {
  return kingdom.buildings.find((b) => b.castle) || null;
}

// Find a building by its (globally unique) id.
export function findBuilding(buildingId) {
  for (const k of KINGDOMS) {
    const b = k.buildings.find((x) => x.id === buildingId);
    if (b) return { ...b, kingdom: k };
  }
  return null;
}

// Can the player afford this building right now?
export function canAfford(building, gold) {
  return gold >= building.cost;
}

// Is the next territory affordable to claim?
export function canClaimTerritory(kingdomIndex, gold) {
  const cost = TERRITORY_CLAIM_COST[kingdomIndex + 1];
  return typeof cost === "number" && gold >= cost;
}

// Gold for one correct word, factoring in streak and mode.
// Tests pay nothing — see REWARDS.
export function goldForWord({
  difficulty = "medium",
  streak = 0,
  isTest = false,
  isReview = false,
} = {}) {
  if (isTest) return REWARDS.testGold;

  let gold = REWARDS.goldPerWord[difficulty] ?? REWARDS.goldPerWord.medium;

  const streakMult = 1 + Math.min(REWARDS.streakBonusCap, streak * REWARDS.streakBonusPerDay);
  gold *= streakMult;

  if (isReview) gold += gold * REWARDS.reviewBonus;

  return Math.max(1, Math.round(gold));
}
