// Shared, side-effect-free rules. Never accept client-supplied prices or rewards.
import { KINGDOMS, PLOT, plotState } from './kingdom.js';

export const CONTENT_VERSION = '2026.10.22-a';
export const EXPANSION_KEY = '__storybook_v1';
export const MAX_BUILDING_LEVEL = 3;

/** @typedef {import('./kingdomContent').KingdomAction} KingdomAction */
/** @typedef {import('./kingdomContent').ExpansionState} ExpansionState */

export const REGION_CONTENT = KINGDOMS.map(region => ({
  id: region.id, name: region.name, biome: region.theme,
  rankSource: 'prosperity', scene: region.id === 1 ? 'storybook' : 'legacy',
  prerequisiteRegion: region.id === 1 ? null : region.id - 1,
}));

export const QUESTS = [
  { id: 'first-words', title: 'Words take root', instruction: 'Practice your own spelling words. Spell one correctly to plant a little garden.', reward: 'word-garden', icon: '❀', requirement: 'correct-word', amount: 1 },
  { id: 'welcome-home', title: 'A place to call home', instruction: 'Clear and build the Wooden Cottage.', reward: 'home-banner', icon: '⚑', requirement: 'cottage', amount: 1 },
  { id: 'school-days', title: 'A village of learners', instruction: 'Raise the Little School to bring Greenwood together.', reward: 'school-lanterns', icon: '✧', requirement: 'schoolhouse', amount: 1 },
];

export const DECORATIONS = [
  { id: 'flower-border', title: 'Cottage flower border', cost: KINGDOMS[0].buildings[0].clearCost, requires: 'cottage' },
  { id: 'village-banners', title: 'Village banners', cost: KINGDOMS[0].buildings[1].clearCost, requires: 'townhall' },
];

export const ACTIVITIES = [
  { id: 'spelling-mission', title: 'Garden spelling mission', status: 'playable', maxWords: 5, rewardSource: 'existing-practice' },
  { id: 'word-explorer', title: 'Word Explorer', status: 'planned', rewardSource: 'none' },
  { id: 'spelling-tower', title: 'Spelling Tower', status: 'planned', rewardSource: 'none' },
];

export function expansionOf(buildings = {}) {
  const raw = buildings[EXPANSION_KEY];
  return { ...raw, version: raw?.version || 1, levels: { ...raw?.levels }, decorations: { ...raw?.decorations }, quests: { ...raw?.quests } };
}

export function buildingLevel(buildings, id) {
  if (plotState(buildings,id) !== PLOT.BUILT) return 0;
  return Math.max(1, Math.min(MAX_BUILDING_LEVEL, Number(expansionOf(buildings).levels[id]) || 1));
}

// New optional upgrade prices derive from the unchanged canonical build price.
// Level 2 = half base, level 3 = base. No bonus prosperity/XP or new currency.
export function upgradeCost(building, targetLevel) {
  if (![2,3].includes(targetLevel)) throw new Error('That upgrade level is not available.');
  return Math.ceil(building.cost * (targetLevel === 2 ? .5 : 1));
}

export function correctWords(mastery = []) {
  return mastery.reduce((sum, word) => sum + Number((word.correct_attempts ?? word.correctAttempts ?? 0) > 0), 0);
}

export function questEligible(quest, buildings, mastery) {
  return quest.requirement === 'correct-word'
    ? correctWords(mastery) >= quest.amount
    : plotState(buildings, quest.requirement) === PLOT.BUILT;
}

/** Apply one authorized action against a fresh snapshot; caller commits atomically. */
export function reduceKingdomAction(snapshot, action, actorId) {
  if (!snapshot.profile || !actorId || snapshot.profile.parent_id !== actorId) throw new Error('This player does not belong to your account.');
  if (!action || !['clear','build','upgrade','decorate','quest'].includes(action.type)) throw new Error('Unknown kingdom action.');
  if (Object.keys(action).some(key => !['type','target','level'].includes(key))) throw new Error('Unexpected kingdom action fields.');
  const profile = { ...snapshot.profile };
  const progress = { ...snapshot.progress, buildings: { ...snapshot.progress?.buildings } };
  const data = expansionOf(progress.buildings);
  if (data.version !== 1) throw new Error('This kingdom was saved by a newer adventure. Update before building.');
  const gold = profile.coins ?? 0;
  if (!Number.isSafeInteger(gold) || gold < 0) throw new Error('Your gold balance needs to be refreshed.');
  let cost = 0, replay = false, message = '';
  if (action.type === 'quest') {
    const quest = QUESTS.find(q=>q.id===action.target);
    if (!quest) throw new Error('Unknown mission.');
    if (data.quests[quest.id]) replay = true;
    else {
      if (!questEligible(quest,progress.buildings,snapshot.mastery)) throw new Error('Keep exploring this mission before collecting its reward.');
      data.quests[quest.id] = true;
      data.decorations[quest.reward] = true;
      message = `${quest.title} complete! Your village has a new decoration.`;
    }
  } else if (action.type === 'decorate') {
    const decor = DECORATIONS.find(d=>d.id===action.target);
    if (!decor) throw new Error('Unknown decoration.');
    if (data.decorations[decor.id]) replay = true;
    else {
      if (plotState(progress.buildings,decor.requires)!==PLOT.BUILT) throw new Error('Build its village landmark first.');
      cost = decor.cost; data.decorations[decor.id] = true; message = `${decor.title} placed.`;
    }
  } else {
    const region = KINGDOMS.find(k=>k.buildings.some(b=>b.id===action.target));
    const building = region?.buildings.find(b=>b.id===action.target);
    if (!building) throw new Error('Unknown building.');
    if (!(progress.unlocked_kingdoms || [1]).includes(region.id)) throw new Error('Claim this region before building here.');
    const state = plotState(progress.buildings,building.id);
    if (action.type === 'clear') {
      if (state!==PLOT.WILD) replay=true;
      else {cost=building.clearCost;progress.buildings[building.id]=PLOT.CLEARED;message='Land cleared';}
    } else if (action.type === 'build') {
      if (state===PLOT.BUILT) replay=true;
      else {
        if (state!==PLOT.CLEARED) throw new Error('Clear this plot before building.');
        cost=building.cost;progress.buildings[building.id]=PLOT.BUILT;message=`${building.name} built!`;
      }
    } else {
      if (state!==PLOT.BUILT) throw new Error('Build this landmark before upgrading it.');
      const level=buildingLevel(progress.buildings,building.id);
      if (!Number.isInteger(action.level) || action.level<2 || action.level>MAX_BUILDING_LEVEL) throw new Error('That upgrade level is not available.');
      if (action.level<=level) replay=true;
      else {
        if (action.level!==level+1) throw new Error('Complete the next upgrade in order.');
        cost=upgradeCost(building,action.level); data.levels[building.id]=action.level;
        message=`${building.name} is now level ${action.level}!`;
      }
    }
  }
  if (gold<cost) throw new Error(`Earn ${cost-gold} more gold through spelling practice.`);
  if (replay) return {profile:snapshot.profile,progress:snapshot.progress,replay:true,message:'Already saved. Your gold is safe.'};
  profile.coins=gold-cost;
  progress.buildings[EXPANSION_KEY]=data;
  return {profile,progress,replay:false,message};
}
