// Fictional guides. Locations do not imply ownership of a building.
const DEFINITIONS = {
 eli:{id:'eli',name:'Master Eli',role:'Spelling mentor',location:'Academy',dialogue:'Listen closely, try the sounds, and take your time. Every attempt is a step forward.',action:'Hear your word'},
 grace:{id:'grace',name:'Lady Grace',role:'Quests & rewards',location:'Village journal',dialogue:'Your own spelling words can bring a garden to life. Let us find a little quest for you.',action:'Open your quests'},
 bram:{id:'bram',name:'Blacksmith Bram',role:'Construction & adventurer gear',location:'Workshop guide',dialogue:'Build with the gold you earn. Inspect a landmark for upgrades, or choose your adventurer’s look with a parent.',action:'Inspect your cottage'},
 lyra:{id:'lyra',name:'Professor Lyra',role:'Words & knowledge',location:'Library guide',dialogue:'Every great adventure begins with a word. With a parent, collect words and explore their meanings.',action:'Open word lists'},
 finn:{id:'finn',name:'Captain Finn',role:'Challenges & activities',location:'Challenge corner',dialogue:'Ready for a royal spelling challenge? Complete Royal Tests to unlock the pet race. There is no hurry.',action:'Choose a Royal Test'},
 isolde:{id:'isolde',name:'Queen Isolde',role:'Kingdom & rank guide',location:'Royal guidance',dialogue:'Your rank grows with the landmarks you build. Explore the rank ladder to see your next milestone.',action:'See your rank'},
};

// All advice is available; visiting a guide does not grant their landmark.
export const NPCS=Object.fromEntries(Object.entries(DEFINITIONS).map(([id,npc])=>[id,{...npc,portrait:`assets/storybook/${id}.webp`,unlocked:true,questAction:id}]));
