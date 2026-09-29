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
export const REWARDS = {
  // Gold awarded per correct spelling. Scaled a little by difficulty.
  goldPerWord: { easy: 12, medium: 10, hard: 14 },
  // Bonus gold the first time a word is spelled correctly ever.
  goldFirstMastery: 25,
  // Multipliers applied to the base award.
  streakBonusPerDay: 0.05,   // +5% per consecutive practice day (cap below)
  streakBonusCap: 0.5,       // max +50%
  testBonus: 1.5,            // Royal Test pays 1.5x
  reviewBonus: 0.25,         // re-practising a word you've missed
};

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
// Every building has a gold cost and a prosperity value. Prosperity is what
// drives rank, so expensive/large buildings move the needle a lot.
export const KINGDOMS = [
  {
    id: 1,
    name: "Greenwood Village",
    subtitle: "A quiet start among tall trees",
    theme: "forest",
    sky: ["#bfe6c8", "#8fce9e"],
    ground: "#6aa96f",
    buildings: [
      { id: "cottage", name: "Wooden Cottage", icon: "🏠", cost: 40, prosperity: 30, tier: 0 },
      { id: "well", name: "Village Well", icon: "🕳️", cost: 60, prosperity: 45, tier: 0 },
      { id: "bakery", name: "Village Bakery", icon: "🥖", cost: 90, prosperity: 65, tier: 0 },
      { id: "market", name: "Open Market", icon: "🏪", cost: 140, prosperity: 90, tier: 1 },
      { id: "schoolhouse", name: "Little School", icon: "🏫", cost: 200, prosperity: 130, tier: 1 },
      { id: "townhall", name: "Town Hall", icon: "🏛️", cost: 320, prosperity: 200, tier: 2 },
    ],
  },
  {
    id: 2,
    name: "Riverstone Crossing",
    subtitle: "Where the river meets the road",
    theme: "river",
    sky: ["#cfe6f5", "#9cc6e0"],
    ground: "#6f9f6a",
    buildings: [
      { id: "dock", name: "Wooden Dock", icon: "⚓", cost: 120, prosperity: 90, tier: 0 },
      { id: "mill", name: "Water Mill", icon: "🌾", cost: 220, prosperity: 150, tier: 0 },
      { id: "bridge", name: "Stone Bridge", icon: "🌉", cost: 340, prosperity: 220, tier: 1 },
      { id: "fishery", name: "Riverside Fishery", icon: "🎣", cost: 480, prosperity: 300, tier: 1 },
      { id: "inn", name: "Crossing Inn", icon: "🍺", cost: 680, prosperity: 420, tier: 2 },
    ],
  },
  {
    id: 3,
    name: "Highland Keep",
    subtitle: "A stronghold above the clouds",
    theme: "highland",
    sky: ["#dfe4ef", "#b9c2d6"],
    ground: "#7d8b6a",
    buildings: [
      { id: "watchtower", name: "Stone Watchtower", icon: "🗼", cost: 200, prosperity: 150, tier: 0 },
      { id: "barracks", name: "Guard Barracks", icon: "🛡️", cost: 320, prosperity: 230, tier: 0 },
      { id: "chapel", name: "Highland Chapel", icon: "⛪", cost: 480, prosperity: 330, tier: 1 },
      { id: "greatkeep", name: "The Great Keep", icon: "🏰", cost: 780, prosperity: 520, tier: 2 },
    ],
  },
  {
    id: 4,
    name: "Crystal Caverns",
    subtitle: "Caverns that sing in the dark",
    theme: "cavern",
    sky: ["#d7d2f2", "#b0a5e0"],
    ground: "#6b5b9e",
    buildings: [
      { id: "mine", name: "Crystal Mine", icon: "⛏️", cost: 300, prosperity: 220, tier: 0 },
      { id: "gemcutter", name: "Gem Cutter's Hall", icon: "💎", cost: 520, prosperity: 360, tier: 0 },
      { id: "bridgeoflight", name: "Bridge of Light", icon: "🌟", cost: 860, prosperity: 560, tier: 1 },
      { id: "cathedral", name: "Crystal Cathedral", icon: "⛩️", cost: 1300, prosperity: 820, tier: 2 },
    ],
  },
  {
    id: 5,
    name: "Dragon Peak",
    subtitle: "The highest mountain in the realm",
    theme: "peak",
    sky: ["#ffd9c0", "#f0a882"],
    ground: "#8a5a4a",
    buildings: [
      { id: "camp", name: "Climber's Camp", icon: "⛺", cost: 400, prosperity: 300, tier: 0 },
      { id: "lair", name: "Dragon Lair", icon: "🐉", cost: 700, prosperity: 500, tier: 0 },
      { id: "observatory", name: "Sky Observatory", icon: "🔭", cost: 1100, prosperity: 760, tier: 1 },
      { id: "throne", name: "Dragon Throne", icon: "👑", cost: 1800, prosperity: 1200, tier: 2 },
    ],
  },
];

// ---------------------------------------------------------------------------
// PROGRESSION HELPERS
// ---------------------------------------------------------------------------

// Total prosperity = sum of prosperity of every built building.
export function prosperityOf(builtIds) {
  const built = new Set(builtIds || []);
  return KINGDOMS.reduce((total, kingdom) => {
    for (const b of kingdom.buildings) {
      if (built.has(b.id)) total += b.prosperity;
    }
    return total;
  }, 0);
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

// Gold for one correct word, factoring in streak, mode and review status.
export function goldForWord({
  difficulty = "medium",
  streak = 0,
  isTest = false,
  isReview = false,
} = {}) {
  let gold = REWARDS.goldPerWord[difficulty] ?? REWARDS.goldPerWord.medium;

  const streakMult = 1 + Math.min(REWARDS.streakBonusCap, streak * REWARDS.streakBonusPerDay);
  gold *= streakMult;

  if (isTest) gold *= REWARDS.testBonus;
  if (isReview) gold += gold * REWARDS.reviewBonus;

  return Math.max(1, Math.round(gold));
}
