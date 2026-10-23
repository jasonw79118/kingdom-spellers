// Stable legacy save IDs. Rendering never migrates or mutates saved profiles.
export const AVATAR_OPTIONS={
 bases:[{id:'boy',label:'Boy'},{id:'girl',label:'Girl'}],
 skins:[['#f6d7b8','Light peach'],['#f2c9a0','Warm peach'],['#e0ac7e','Honey'],['#c98d5f','Warm brown'],['#a06a42','Rich brown'],['#7a4c2e','Deep brown']].map(([id,label])=>({id,label})),
 hairs:[['short','Tousled short'],['long','Long waves'],['curly','Soft curls'],['ponytail','Ponytail'],['bun','High bun']].map(([id,label])=>({id,label})),
 hairColors:[['#2e2018','Espresso'],['#5a3a22','Chestnut'],['#8a5a2e','Oak'],['#c9962e','Golden'],['#d97a4a','Copper'],['#b8b8c0','Silver'],['#7a4c2e','Walnut']].map(([id,label])=>({id,label})),
 tunics:[['#6b5b9e','Royal violet'],['#4a7c59','Forest green'],['#c95a5a','Rose red'],['#6fa8c9','Sky blue'],['#c9962e','Gold'],['#d97a9a','Heather pink']].map(([id,label])=>({id,label})),
 capes:[{id:null,label:'No cape'},{id:'blue',label:'Blue'},{id:'red',label:'Red'},{id:'royal',label:'Royal violet'}],
 shields:[{id:null,label:'No shield'},{id:'wood',label:'Wooden shield'},{id:'knight',label:'Knight shield'}],
 crowns:[{id:null,label:'No crown'},{id:'brass',label:'Brass circlet'},{id:'royal',label:'Royal crown'}],
 companions:[{id:null,label:'No companion'},{id:'cat',label:'Cat'},{id:'dog',label:'Dog'},{id:'fox',label:'Fox'},{id:'rabbit',label:'Rabbit'},{id:'dragon',label:'Dragon'}],
};
export const DEFAULT_AVATAR={base:'boy',skin:'#f2c9a0',hair:'short',hairColor:'#5a3a22',tunic:'#6b5b9e',cape:null,shield:null,crown:null,companion:null};
const colors=new Set(['skin','hairColor','tunic']);
const lists={base:'bases',hair:'hairs',cape:'capes',shield:'shields',crown:'crowns',companion:'companions'};
export function normalizeAvatar(value){
 const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const a={...DEFAULT_AVATAR,...raw};
 for(const key of Object.keys(DEFAULT_AVATAR)){
  if(colors.has(key)){if(typeof a[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(a[key]))a[key]=DEFAULT_AVATAR[key];}
  else if(!AVATAR_OPTIONS[lists[key]].some(option=>option.id===a[key]))a[key]=DEFAULT_AVATAR[key];
 }
 return a;
}
export function rgb(color){return [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);}
export function tintMatrix(color){const [r,g,b]=rgb(color);return [r,g,b].flatMap(c=>[.2126*c/.55,.7152*c/.55,.0722*c/.55,0,0]).concat([0,0,0,1,0]).join(' ');}
// Piecewise color transfer retains painted shadows, dark eyes, and white highlights.
export function skinTables(color){const targets=rgb(color),base=.72;return targets.map(target=>Array.from({length:33},(_,n)=>{const x=n/32;return x<=base?x*target/base:target+(x-base)*(1-target)/(1-base);}).join(' '));}
export const CAPE_COLORS={blue:'#4a7fb5',red:'#c95a5a',royal:'#6b5b9e'};
