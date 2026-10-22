import test from 'node:test';
import assert from 'node:assert/strict';
import { KINGDOMS, PLOT, plotState } from '../src/game/kingdom.js';
import { reduceKingdomAction, buildingLevel, expansionOf, upgradeCost, REGION_CONTENT, EXPANSION_KEY } from '../src/game/expansion.js';
import { executeKingdomTransaction } from '../server/kingdom-service.mjs';
import handler from '../server/kingdom-function.mjs';
import { GREENWOOD_SITES } from '../src/game/greenwood.js';
import { extractCandidates } from '../src/lib/ocr.js';

const fresh=(coins=1000)=>({profile:{id:'child',parent_id:'parent',coins,xp:123},progress:{player_id:'child',buildings:{},unlocked_kingdoms:[1],royal_tests_completed:4},mastery:[]});
const run=(s,action,actor='parent')=>reduceKingdomAction(s,action,actor);
test('canonical IDs and all five region identities are preserved',()=>{assert.deepEqual(REGION_CONTENT.map(r=>[r.id,r.name]),KINGDOMS.map(r=>[r.id,r.name]));assert.equal(REGION_CONTENT.filter(r=>r.scene==='storybook').length,1);});
test('clearing and building charge canonical prices once',()=>{let s=fresh();s=run(s,{type:'clear',target:'cottage'});assert.equal(s.profile.coins,990);assert.equal(run(s,{type:'clear',target:'cottage'}).replay,true);s=run(s,{type:'build',target:'cottage'});assert.equal(s.profile.coins,950);assert.equal(run(s,{type:'build',target:'cottage'}).profile.coins,950);assert.equal(s.profile.xp,123);});
test('locked region purchases do not alter progress or balance',()=>{const s=fresh();assert.throws(()=>run(s,{type:'clear',target:'dock'}),/Claim/);assert.deepEqual(s,fresh());});
test('unprepared plot cannot be built',()=>assert.throws(()=>run(fresh(),{type:'build',target:'schoolhouse'}),/Clear/));
test('insufficient gold cannot become negative',()=>{for(const gold of [0,1,9]){const s=fresh(gold);assert.throws(()=>run(s,{type:'clear',target:'cottage'}),/Earn/);assert.equal(s.profile.coins,gold);}});
test('foreign parent cannot purchase or claim',()=>{for(const type of ['clear','upgrade','quest'])assert.throws(()=>run(fresh(),{type,target:'cottage'},'another-parent'),/belong/);});
test('client cannot supply a price, balance, or reward',()=>{for(const field of ['cost','coins','reward'])assert.throws(()=>run(fresh(),{type:'clear',target:'cottage',[field]:0}),/Unexpected/);});
test('legacy owned booleans survive and upgrades do not buy the building again',()=>{const s=fresh();s.progress.buildings.cottage=true;assert.equal(buildingLevel(s.progress.buildings,'cottage'),1);const result=run(s,{type:'upgrade',target:'cottage',level:2});assert.equal(result.progress.buildings.cottage,true);assert.equal(result.profile.coins,980);assert.equal(buildingLevel(result.progress.buildings,'cottage'),2);assert.equal(run(result,{type:'upgrade',target:'cottage',level:2}).profile.coins,980);const grand=run(result,{type:'upgrade',target:'cottage',level:3});assert.equal(grand.profile.coins,940);assert.equal(buildingLevel(grand.progress.buildings,'cottage'),3);assert.equal(run(grand,{type:'upgrade',target:'cottage',level:3}).profile.coins,940);});
test('upgrade levels are sequential and bounded',()=>{const s=fresh();assert.throws(()=>run(s,{type:'upgrade',target:'cottage',level:2}),/Build/);s.progress.buildings.cottage=PLOT.BUILT;for(const level of [0,1,3,4,NaN])assert.throws(()=>run(s,{type:'upgrade',target:'cottage',level}),/level|order/);assert.equal(upgradeCost(KINGDOMS[0].buildings[0],2),20);});
test('mission requires verified spelling history, rewards a cosmetic once',()=>{let s=fresh();assert.throws(()=>run(s,{type:'quest',target:'first-words'}),/Keep/);s.mastery=[{correct_attempts:1}];s=run(s,{type:'quest',target:'first-words'});assert.equal(expansionOf(s.progress.buildings).decorations['word-garden'],true);assert.equal(s.profile.coins,1000);assert.equal(run(s,{type:'quest',target:'first-words'}).replay,true);});
test('building quests cannot give unearned landmarks or decorations',()=>{const s=fresh();assert.throws(()=>run(s,{type:'quest',target:'school-days'}),/Keep/);assert.throws(()=>run(s,{type:'decorate',target:'flower-border'}),/Build/);assert.equal(plotState(s.progress.buildings,'schoolhouse'),PLOT.WILD);});
test('decoration purchased once and all other progression fields survive',()=>{let s=fresh();s.progress.buildings.cottage=true;s.progress.buildings.well='cleared';s=run(s,{type:'decorate',target:'flower-border'});assert.equal(s.profile.coins,990);assert.equal(s.progress.buildings.well,'cleared');assert.equal(s.progress.royal_tests_completed,4);assert.equal(run(s,{type:'decorate',target:'flower-border'}).profile.coins,990);});
test('newer content saves fail closed instead of overwriting unknown data',()=>{const s=fresh();s.progress.buildings[EXPANSION_KEY]={version:2,levels:{},future:'keep'};assert.throws(()=>run(s,{type:'clear',target:'cottage'}),/newer/);assert.equal(s.progress.buildings[EXPANSION_KEY].future,'keep');});
test('rules do not mutate their input snapshot',()=>{const s=fresh();const before=structuredClone(s);run(s,{type:'clear',target:'cottage'});assert.deepEqual(s,before);});
test('Greenwood sprite footprints are inside the scene and do not overlap',()=>{
 const slots=Object.values(GREENWOOD_SITES);
 for(const a of slots)assert.ok(a.x-a.width/2>=0&&a.x+a.width/2<=1280&&a.y-a.width>=0&&a.y+29<=780);
 for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
   const a=slots[i],b=slots[j];
   assert.ok(a.x+a.width/2<=b.x-b.width/2||b.x+b.width/2<=a.x-a.width/2||a.y<=b.y-b.width||b.y<=a.y-a.width);
 }
});
test('existing OCR candidates deduplicate case and reject numeric noise for parent review',()=>{
 const result=extractCandidates("1. Cat\n2. cat\n3. DOG\n123456\nzzzz\n4. don't\n");
 const words=result.map(item=>typeof item==='string'?item:item.word);
 assert.equal(words.filter(w=>w==='cat').length,1);assert.ok(words.includes('dog'));assert.ok(words.includes("don't"));assert.ok(!words.includes('123456')&&!words.includes('zzzz'));
});

function database({failure=null,owner='parent'}={}) {
  const state={profile:{$id:'child',parentId:owner,coins:1000,xp:123,avatar:'{}',name:'Synthetic explorer'},progress:{buildings:'{}',unlockedKingdoms:'[1]',currentKingdom:1,royalTestsCompleted:4},staged:[],rolledBack:false};
  const db={
    async createTransaction(){return {$id:'tx'};},
    async getDocument({collectionId}){return structuredClone(collectionId==='player_profiles'?state.profile:state.progress);},
    async listDocuments(){return {documents:[{correctAttempts:1}]};},
    async updateDocument({data}){state.staged.push(()=>Object.assign(state.progress,data));},
    async decrementDocumentAttribute({value,min}){if(failure==='stage')throw Error('Synthetic write failure');assert.equal(min,0);state.staged.push(()=>{state.profile.coins-=value;});},
    async updateTransaction({commit,rollback}){if(rollback){state.staged=[];state.rolledBack=true;return;}if(commit){if(failure==='conflict')throw Object.assign(Error('Synthetic conflict'),{code:409});for(const apply of state.staged)apply();state.staged=[];}}
  };
  return {state,db};
}
const query={equal:()=>'',limit:()=>'',cursorAfter:()=>''};
test('Appwrite adapter commits progress and debit in one transaction',async()=>{const {db,state}=database();await executeKingdomTransaction({db,query,actorId:'parent',playerId:'child',action:{type:'clear',target:'cottage'}});assert.equal(state.profile.coins,990);assert.equal(JSON.parse(state.progress.buildings).cottage,'cleared');});
test('failure between staged writes rolls back both',async()=>{const {db,state}=database({failure:'stage'});await assert.rejects(executeKingdomTransaction({db,query,actorId:'parent',playerId:'child',action:{type:'clear',target:'cottage'}}));assert.equal(state.profile.coins,1000);assert.equal(state.progress.buildings,'{}');assert.ok(state.rolledBack);});
test('transaction conflict does not retry an unsafe stale write',async()=>{const {db,state}=database({failure:'conflict'});await assert.rejects(executeKingdomTransaction({db,query,actorId:'parent',playerId:'child',action:{type:'clear',target:'cottage'}}),{code:409});assert.equal(state.profile.coins,1000);assert.equal(state.progress.buildings,'{}');});
test('Appwrite adapter refuses a different family',async()=>{const {db,state}=database({owner:'other'});await assert.rejects(executeKingdomTransaction({db,query,actorId:'parent',playerId:'child',action:{type:'clear',target:'cottage'}}),{status:403});assert.equal(state.profile.coins,1000);});
test('function rejects unauthenticated execution without contacting the network',async()=>{const result=await handler({req:{headers:{}},res:{json:(body,status)=>({body,status})}});assert.equal(result.status,401);});
