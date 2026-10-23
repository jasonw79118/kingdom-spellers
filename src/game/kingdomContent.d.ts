export type BuildingState = 'wild' | 'cleared' | 'built' | true;
export interface BuildingSlot { id: string; x: number; y: number; width: number; depth: number; anchor: 'bottom-center'; }
export interface SpriteDefinition { src: string; fallback: string; thumbnail: string; width: number; height: number; }
export interface RegionDefinition { id: number; name: string; biome: string; scene: 'storybook' | 'legacy'; prerequisiteRegion: number | null; }
export interface ExpansionState { version: 1; levels: Record<string,number>; decorations: Record<string,boolean>; quests: Record<string,boolean>; placements?: Record<string,string>; }
export interface QuestTemplate { id: string; title: string; instruction: string; reward: string; requirement: string; amount: number; }
export interface CosmeticDefinition { id: string; title: string; cost: number; requires: string; }
export type RewardSource = 'existing-practice' | 'quest-decoration' | 'none';
export type KingdomAction = { type: 'clear' | 'build' | 'decorate' | 'quest'; target: string } | { type: 'place'; target: string; slot: string } | { type: 'upgrade'; target: string; level: 2 | 3 };

export interface BuildingDefinition { id: string; name: string; cost: number; clearCost: number; prosperity: number; tier: number; castle?: boolean; }
export interface BuildingUpgrade { buildingId: string; level: 2 | 3; cost: number; cosmeticSkin: string; }
export interface UnlockedSlot { regionId: number; buildingId: string; state: BuildingState; }
export interface RankDefinition { id: number; title: string; min: number; icon: string; blurb: string; }
export interface RegionPrerequisite { regionId: number; previousRegionId: number | null; claimCost: number; }
export interface ExistingProgress { player_id: string; unlocked_kingdoms: number[]; current_kingdom?: number; buildings: Record<string, BuildingState | ExpansionState>; royal_tests_completed?: number; pet_state?: Record<string, unknown>; }
