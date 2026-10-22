import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.QA_URL || 'http://127.0.0.1:3110';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local demo URL required');
const out=path.resolve(process.env.QA_OUTPUT || '.snap/expansion-review');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[],errors=[],assetFailures=[];
let page;
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const stored=table=>page.evaluate(t=>JSON.parse(localStorage.getItem('ks2_'+t)),table);
async function capture(name){await page.locator('.gw').screenshot({path:path.join(out,name+'.png'),style:'.topbar,.bottomnav,.ks-version{visibility:hidden!important}'});}
async function open(id='pack-child'){await page.goto(`${base}/#/kingdom/${id}`,{waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();}
async function choose(name){await page.locator('.gw-site').filter({hasText:name}).click();}
async function dismiss(){await page.keyboard.press('Escape');await page.locator('.ks-cel').waitFor({state:'hidden'});await page.waitForTimeout(300);}
async function purchase(name,id){
  await choose(name);
  if(await page.getByRole('button',{name:/^Clear plot ·/}).count()){
    await page.getByRole('button',{name:/^Clear plot ·/}).click();
    await page.waitForFunction(id=>JSON.parse(localStorage.getItem('ks2_player_progress'))[0].buildings[id]==='cleared',id);
  }
  await page.getByRole('button',{name:/^Build ·/}).click();
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem('ks2_player_progress'))[0].buildings[id]==='built',id);
  await dismiss();
}
try{
 const context=await browser.newContext({viewport:{width:1440,height:1080},reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).hostname===new URL(base).hostname?r.continue():r.abort());
 await context.addInitScript(()=>{
   if(localStorage.getItem('ks2_session'))return;
   localStorage.setItem('ks2_users',JSON.stringify([{id:'pack-parent',name:'Local art review'}]));
   localStorage.setItem('ks2_session',JSON.stringify({userId:'pack-parent'}));
   localStorage.setItem('ks2_player_profiles',JSON.stringify([{id:'pack-child',parent_id:'pack-parent',name:'Woodland explorer',avatar:{base:'boy'},grade_level:1,difficulty:'medium',coins:0,xp:0},{id:'other-child',parent_id:'pack-parent',name:'Other explorer',avatar:{base:'girl'},grade_level:2,difficulty:'medium',coins:88,xp:99}]));
   localStorage.setItem('ks2_player_progress',JSON.stringify([{player_id:'pack-child',buildings:{},unlocked_kingdoms:[1],current_kingdom:1,royal_tests_completed:0},{player_id:'other-child',buildings:{well:true},unlocked_kingdoms:[1]}]));
   localStorage.setItem('ks2_spelling_lists',JSON.stringify([{id:'pack-words',player_id:'pack-child',parent_id:'pack-parent',title:'Woodland words',created_at:'2026-10-22'}]));
   localStorage.setItem('ks2_spelling_words',JSON.stringify(['cat','dog','sun'].map((word,i)=>({id:'pack-word-'+i,list_id:'pack-words',word,normalized_word:word,position:i}))));
 });
 page=await context.newPage();page.setDefaultTimeout(45000);page.setDefaultNavigationTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/assets/kingdom/')&&r.status()>=400)assetFailures.push({url:r.url(),status:r.status()});});
 await open();
 check('Actual test runtime is demo',await page.evaluate(async()=>(await import('/src/lib/backend.js')).backendMode==='demo'));
 check('Fresh profile has zero coins, tests and unearned buildings',await page.locator('[data-art-state="built"]').count()===0&&(await stored('player_profiles'))[0].coins===0&&(await stored('player_progress'))[0].royal_tests_completed===0);
 check('Painted terrain is a loaded project asset',await page.locator('.ks-story-terrain').evaluate(el=>el.complete&&el.naturalWidth>1000));
 check('Starter camp is separate from purchased cottage',await page.locator('[data-role="starter-shelter"] img').count()===1);
 await capture('01-fresh-meadow-desktop');
 for(const width of [375,768,1440]){
   await page.setViewportSize({width,height:1080});
   check(`Page fits ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check(`Map targets at least 44px at ${width}px`,await page.locator('.gw-lot').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44;})));
   if(width!==1440)await capture(`02-fresh-${width}`);
 }
 // Credit only the isolated fixture after recording the genuine zero-balance start.
 await page.evaluate(()=>{const profiles=JSON.parse(localStorage.getItem('ks2_player_profiles'));profiles[0].coins=2000;localStorage.setItem('ks2_player_profiles',JSON.stringify(profiles));});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();
 await choose('Wooden Cottage');
 await page.getByRole('button',{name:'Clear plot · 10 gold',exact:true}).evaluate(el=>{el.click();el.click();});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ks2_player_progress'))[0].buildings.cottage==='cleared');
 check('Double clearing deducts once',(await stored('player_profiles'))[0].coins===1990);
 await page.getByRole('button',{name:'Build · 40 gold',exact:true}).click();await dismiss();
 check('Owned cottage uses supplied painted sprite',await page.locator('[data-art-id="cottage"] img').first().getAttribute('src').then(src=>src.includes('starter_cottage.webp')));
 check('Other structures remain construction sites',await page.locator('[data-art-state="built"]').count()===1);
 await capture('03-owned-cottage');
 await page.getByRole('button',{name:'Upgrade to level 2 · 20 gold',exact:true}).evaluate(el=>{el.click();el.click();});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ks2_player_progress'))[0].buildings.__storybook_v1?.levels.cottage===2);await dismiss();
 check('Upgrade double-click charges once',(await stored('player_profiles'))[0].coins===1930);
 check('Cottage level two has distinct expansion art',await page.locator('[data-art-id="cottage"] img').first().getAttribute('src').then(src=>src.includes('cottage-grand')));
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();
 check('Upgrade persists through refresh',await page.locator('[data-art-id="cottage"]').getAttribute('data-level')==='2');
  await page.route('**/cottage-grand.webp',route=>route.abort());
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-art-id="cottage"] img')?.src.endsWith('cottage-grand.png'));
  check('PNG fallback handles failed WebP asset',await page.locator('[data-art-id="cottage"] img').first().evaluate(el=>el.complete&&el.naturalWidth>0));
  await page.unroute('**/cottage-grand.webp');
 await capture('04-upgraded-cottage');
 await purchase('Little School','schoolhouse');
 check('School purchase uses its individual supplied sprite',await page.locator('[data-art-id="schoolhouse"] img').first().getAttribute('src').then(src=>src.includes('schoolhouse_spelling_academy')));
 check('Purchasing another plot preserves cottage upgrade',(await stored('player_progress'))[0].buildings.__storybook_v1.levels.cottage===2);
 await capture('05-new-schoolhouse');
 await page.getByRole('button',{name:'Place for 10 gold',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ks2_player_progress'))[0].buildings.__storybook_v1.decorations['flower-border']);
 check('Purchased flower border appears in scene',await page.locator('[data-decoration-id="flower-border"]').count()===1);
 const before=(await stored('player_profiles'))[0].coins;
 await page.getByRole('button',{name:'Start spelling mission →',exact:true}).click();
 await page.getByRole('heading',{name:'Practice',exact:true}).waitFor();
 check('Mission uses saved child list',await page.getByRole('option',{name:'Woodland words (3 words)',exact:true}).count()===1);
 await page.evaluate(()=>{window.qaSpoken=null;speechSynthesis.speak=utterance=>{window.qaSpoken=utterance.text;};});
 await page.getByRole('button',{name:'▶ Practice',exact:true}).click();
 for(let i=0;i<3;i++){
   await page.evaluate(()=>{window.qaSpoken=null;});
   await page.getByRole('button',{name:/Hear word/}).click();
   await page.waitForFunction(()=>window.qaSpoken!==null);
   const word=(await page.evaluate(()=>window.qaSpoken)).toLowerCase().trim();
   assert.ok(['cat','dog','sun'].includes(word),'Pronunciation matches parent word set');
   for(const ch of word)await page.locator(`button[aria-label="Letter ${ch}"]:not(:disabled)`).last().click();
   await page.getByRole('heading',{name:/Correct!/}).waitFor();
   await page.getByRole('heading',{name:/Correct!/}).waitFor({state:'hidden'});
 }
 await page.getByRole('button',{name:'See your village grow →',exact:true}).waitFor();
 check('Multi-word practice accumulates every normal reward',(await stored('player_profiles'))[0].coins===before+30&&(await stored('player_profiles'))[0].xp===30);
 check('Mission completion saves exactly one cosmetic reward',(await stored('player_progress'))[0].buildings.__storybook_v1.quests['first-words']===true);
 await page.screenshot({path:path.join(out,'06-quest-complete.png'),fullPage:true});
 await page.getByRole('button',{name:'See your village grow →',exact:true}).click();await page.locator('.gw').waitFor();
 check('Quest garden visibly changes the actual village',await page.locator('[data-decoration-id="word-garden"]').count()===1);
 await capture('07-quest-garden-in-world');
 const snapshot=await stored('player_profiles');
 const replay=await page.evaluate(async()=>{const {performKingdomAction}=await import('/src/lib/kingdomActions.js');return performKingdomAction('pack-child',{type:'quest',target:'first-words'});});
 check('Retrying completed mission does not award currency',replay.replay&&(await stored('player_profiles'))[0].coins===snapshot[0].coins);
  const rollback=await page.evaluate(async()=>{
    const {performKingdomAction}=await import('/src/lib/kingdomActions.js');
    const before=localStorage.getItem('ks2_player_profiles'),progress=localStorage.getItem('ks2_player_progress');
    const original=Storage.prototype.setItem;let failed=false;
    Storage.prototype.setItem=function(key,value){if(key==='ks2_player_progress'&&!failed){failed=true;throw new DOMException('Synthetic quota failure','QuotaExceededError');}return original.call(this,key,value);};
    try{await performKingdomAction('pack-child',{type:'upgrade',target:'cottage',level:3});return false;}catch{return before===localStorage.getItem('ks2_player_profiles')&&progress===localStorage.getItem('ks2_player_progress');}finally{Storage.prototype.setItem=original;}
  });
  check('Storage failure restores balance and progression',rollback);
  const second=await context.newPage();await second.goto(base,{waitUntil:'domcontentloaded'});
  const beforeRace=(await stored('player_profiles'))[0].coins;
  const raced=await Promise.all([page,second].map(tab=>tab.evaluate(async()=>{const {performKingdomAction}=await import('/src/lib/kingdomActions.js');return performKingdomAction('pack-child',{type:'clear',target:'bakery'});})));
  check('Two tabs serialize the same purchase',raced.filter(r=>r.replay).length===1&&(await stored('player_profiles'))[0].coins===beforeRace-20);
  await second.close();await page.reload({waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();
 await choose('Little School');
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 check('Zoom works with sprite anchors',await page.locator('output[aria-label="Map zoom"]').innerText()==='125%');
 await page.getByRole('button',{name:'Reset map view'}).click();await page.locator('.gw-viewport').focus();await page.keyboard.press('ArrowRight');
 check('Keyboard pans the painted world',await page.locator('.gw-viewport').evaluate(el=>el.scrollLeft>0));
 await page.setViewportSize({width:375,height:1080});await capture('08-mobile-grown-village');
 await open('other-child');
 check('Legacy boolean ownership still renders',await page.locator('[data-art-id="well"]').getAttribute('data-art-state')==='built');
 check('Another child does not inherit upgrades or decor',await page.locator('[data-art-id="cottage"]').getAttribute('data-art-state')==='wild'&&await page.locator('[data-decoration-id]').count()===0);
 check('Other child gold and XP unchanged',(await stored('player_profiles'))[1].coins===88&&(await stored('player_profiles'))[1].xp===99);
 await open();
 // Trusted caller re-reads storage and denies a locked region independently of UI.
 const locked=await page.evaluate(async()=>{const {performKingdomAction}=await import('/src/lib/kingdomActions.js');try{await performKingdomAction('pack-child',{type:'clear',target:'dock'});return false;}catch{return true;}});
 check('Locked region action is refused',locked);
 await page.evaluate(()=>{const profiles=JSON.parse(localStorage.getItem('ks2_player_profiles'));profiles[0].coins=0;localStorage.setItem('ks2_player_profiles',JSON.stringify(profiles));});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();await choose('Wooden Cottage');
 check('Cannot upgrade with insufficient gold',await page.getByRole('button',{name:'Upgrade to level 3 · 40 gold',exact:true}).isDisabled());
 check('No missing artwork responses',assetFailures.length===0);
 check('No uncaught browser errors',errors.length===0);
}finally{
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({checks,errors,assetFailures},null,2));await browser.close();
}
console.log(`${checks.length} expansion browser checks passed; ${out}`);
