// Cosmetic companion progress is stored inside existing avatar JSON; no currency mutations.
export const DRAGON_FORMS=[{id:'hatchling',name:'Hatchling',feeds:0},{id:'young',name:'Young dragon',feeds:5},{id:'guardian',name:'Guardian dragon',feeds:15}];
export function dragonFeeds(avatar){const n=avatar?.dragon?.feeds;return Number.isSafeInteger(n)&&n>=0?n:0;}
export function dragonForm(avatar){const n=dragonFeeds(avatar);return [...DRAGON_FORMS].reverse().find(f=>n>=f.feeds);}
export function dragonFood(records,avatar){
 const earned=(records||[]).reduce((n,m)=>n+(Number.isSafeInteger(m.correct_attempts)&&m.correct_attempts>0?m.correct_attempts:0),0);
 return Math.max(0,Math.floor(earned/3)-dragonFeeds(avatar));
}
export function feedDragon(avatar,records){
 if(!avatar?.companion)throw new Error('Choose a dragon companion first.');
 if(dragonFood(records,avatar)<1)throw new Error('Spell three more words correctly to earn a dragon snack.');
 return {...avatar,dragon:{...avatar.dragon,feeds:dragonFeeds(avatar)+1}};
}
export function companionSprite(avatar){return avatar?.companion?'dragon-'+dragonForm(avatar).id+'-'+avatar.companion:null;}

export const DRAGON_HUES={cat:0,dog:210,fox:280,rabbit:90,dragon:0};
