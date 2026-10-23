import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.QA_URL || 'http://127.0.0.1:3110';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Only local synthetic demo profiles allowed');
const out=path.resolve(process.env.QA_OUTPUT || 'qa/npc-evidence');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[],errors=[],missing=[];let page;
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const stored=key=>page.evaluate(k=>JSON.parse(localStorage.getItem('ks2_'+k)),key);
async function kingdom(id='npc-child'){await page.goto(`${base}/#/kingdom/${id}`,{waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();}
async function guide(name){await page.getByRole('button',{name,exact:true}).click();}
async function capture(selector,name){await page.locator(selector).screenshot({path:path.join(out,name+'.png'),style:'.topbar,.bottomnav,.ks-version{visibility:hidden!important}'});}
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).hostname===new URL(base).hostname?r.continue():r.abort());
 await context.addInitScript(()=>{
  if(localStorage.getItem('ks2_session'))return;
  localStorage.setItem('ks2_users',JSON.stringify([{id:'npc-parent',name:'Synthetic NPC review'}]));
  localStorage.setItem('ks2_session',JSON.stringify({userId:'npc-parent'}));
  localStorage.setItem('ks2_player_profiles',JSON.stringify([{id:'npc-child',parent_id:'npc-parent',name:'Test explorer',grade_level:1,difficulty:'medium',coins:500,xp:60,avatar:{base:'girl',skin:'#a06a42',hair:'curly',hairColor:'#2e2018',tunic:'#4a7c59',cape:'blue',shield:'wood',companion:'cat'}},{id:'npc-other',parent_id:'npc-parent',name:'Second explorer',grade_level:2,difficulty:'medium',coins:17,xp:19,avatar:{base:'boy'}}]));
  localStorage.setItem('ks2_player_progress',JSON.stringify([{player_id:'npc-child',buildings:{cottage:true,well:true,schoolhouse:true},unlocked_kingdoms:[1],royal_tests_completed:0},{player_id:'npc-other',buildings:{},unlocked_kingdoms:[1],royal_tests_completed:0}]));
  localStorage.setItem('ks2_spelling_lists',JSON.stringify([{id:'npc-list',player_id:'npc-child',parent_id:'npc-parent',title:'Academy words'},{id:'other-list',player_id:'npc-other',parent_id:'npc-parent',title:'Other words'}]));
  localStorage.setItem('ks2_spelling_words',JSON.stringify([{id:'npc-word',list_id:'npc-list',word:'cat',normalized_word:'cat',kid_definition:'a small animal with whiskers',position:0},{id:'other-word',list_id:'other-list',word:'dog',normalized_word:'dog',position:0}]));
  localStorage.setItem('ks2_player_word_mastery',JSON.stringify([{player_id:'npc-child',word:'cat',attempts:3,correct_attempts:3,incorrect_attempts:0,current_streak:3,mastery_score:100}]));
 });
 page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)missing.push(r.url());});
 await kingdom();check('Uses isolated demo backend',await page.evaluate(async()=>(await import('/src/lib/backend.js')).backendMode==='demo'));
 const originalAvatar=(await stored('player_profiles'))[0].avatar;
 check('All six guides available',await page.locator('.npc-picker button').count()===6);
 check('Unowned purchasable decorations absent',await page.locator('[data-decoration-id]').count()===0);
 check('Three saved correct attempts do not claim full mastery',await page.locator('[data-achievement="word-scholar"]').getAttribute('data-earned')==='false');
 await capture('.village-guides','01-guides-desktop');
 await guide('Blacksmith Bram');await page.getByRole('button',{name:'Inspect your cottage',exact:true}).click();
 check('Bram inspects real saved cottage',await page.locator('.gw-detail').getByRole('heading',{name:'Wooden Cottage',exact:true}).count()===1);
 await page.getByRole('button',{name:'Customize your adventurer with a parent',exact:true}).click();await page.getByRole('heading',{name:'Edit Player',exact:true}).waitFor();await page.locator('[data-npc-id="bram"]').waitFor();
 check('Existing modular avatar editor remains functional',await page.getByLabel('Hair style',{exact:true}).count()===1&&await page.getByRole('group',{name:'Skin tone',exact:true}).count()===1);await page.locator('svg.avatar').first().screenshot({path:path.join(out,'avatar-polish.png')});check('Opening gear editor preserves saved choices',JSON.stringify((await stored('player_profiles'))[0].avatar)===JSON.stringify(originalAvatar));
 await kingdom();await guide('Professor Lyra');await page.getByRole('button',{name:'Open word lists',exact:true}).click();await page.getByRole('heading',{name:'Spelling Lists',exact:true}).waitFor();
 check('Lyra opens real lists',await page.getByText('Academy words',{exact:true}).count()===1);await capture('[data-npc-id="lyra"]','02-library-guide');
 await kingdom();await guide('Queen Isolde');await page.getByRole('button',{name:'See your rank',exact:true}).click();check('Isolde opens existing rank guidance',await page.locator('.ks-rank-ladder').getByRole('heading',{name:'Your rank',exact:true}).count()===1);
 await guide('Lady Grace');await page.getByRole('button',{name:'Open your quests',exact:true}).click();check('Grace exposes saved quest missions',await page.locator('[data-quest-id]').count()===3);
 const before=(await stored('player_profiles'))[0].coins;
 await page.getByRole('button',{name:'Place for 25 gold',exact:true}).evaluate(el=>{el.click();el.click();});
 await page.locator('[data-decoration-id="garden-fountain"]').waitFor();
 check('Double purchase charges fountain only once',(await stored('player_profiles'))[0].coins===before-25);
 await page.getByRole('button',{name:'Place for 15 gold',exact:true}).click();await page.locator('[data-decoration-id="reading-lanterns"]').waitFor();
 const placement=page.locator('.decor-placement').filter({has:page.locator('#decor-garden-fountain')});
 await page.locator('#decor-garden-fountain').selectOption('garden-walk');await placement.getByRole('button',{name:'Save location',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ks2_player_progress'))[0].buildings.__storybook_v1.placements['garden-fountain']==='garden-walk');
 check('Moving decoration is free',(await stored('player_profiles'))[0].coins===before-40);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-decoration-id="garden-fountain"]').waitFor();
 check('Owned art and position reload from saved metadata',await page.locator('[data-decoration-id="garden-fountain"]').getAttribute('data-slot')==='garden-walk');
 await capture('.gw','03-owned-decorations');
 // Failed placement compensates the local transaction without touching ownership.
 await page.evaluate(()=>{const original=Storage.prototype.setItem;let once=true;Storage.prototype.setItem=function(k,v){if(once&&k==='ks2_player_progress'){once=false;throw new Error('Synthetic storage quota');}return original.call(this,k,v);};});
 await page.locator('#decor-garden-fountain').selectOption('meadow-west');await placement.getByRole('button',{name:'Save location',exact:true}).click();await page.waitForTimeout(300);
 check('Failed save leaves previous location intact',(await stored('player_progress'))[0].buildings.__storybook_v1.placements['garden-fountain']==='garden-walk');
 await kingdom('npc-other');check('Other child has no inherited decorations or badges',await page.locator('[data-decoration-id]').count()===0&&await page.locator('[data-achievement][data-earned="true"]').count()===0);
 await kingdom();await guide('Captain Finn');await page.getByRole('button',{name:'Choose a Royal Test',exact:true}).click();await page.locator('[data-npc-id="finn"]').waitFor();
 check('Finn introduces existing challenge path',page.url().includes('challenge=royal'));
 await page.getByRole('button',{name:/^.* Royal Test$/}).click();await page.locator('.spell-adventure').waitFor();
 check('Academy uses the illustrated interior asset',await page.locator('.spell-adventure').evaluate(el=>getComputedStyle(el).backgroundImage.includes('/assets/storybook/academy.webp')));
 const testGold=(await stored('player_profiles'))[0].coins;
 await page.getByRole('button',{name:'Type a word',exact:true}).click();await page.getByLabel('Your spelling',{exact:true}).fill('cat');await page.getByRole('button',{name:'Check word',exact:true}).click();
 await page.getByRole('heading',{name:'Correct!',exact:true}).waitFor();check('Reduced motion disables reward animation',await page.locator('.storybook-reward img').evaluate(el=>getComputedStyle(el).animationName==='none'));await capture('.spell-adventure','04-mastery-feedback');
 await page.getByRole('heading',{name:'You followed the word trail!',exact:true}).waitFor();check('Royal Test retains zero gold and XP',(await stored('player_profiles'))[0].coins===testGold&&(await stored('player_profiles'))[0].xp===60);
 check('Mastery comes from persisted attempts',(await stored('player_word_mastery'))[0].attempts===4);
 await kingdom();check('Saved mastery earns real village badge',await page.locator('[data-achievement="word-scholar"]').getAttribute('data-earned')==='true');await page.goto(`${base}/#/play?playerId=npc-child`);await page.getByRole('heading',{name:'Practice',exact:true}).waitFor();
 await page.getByRole('button',{name:/Practice/,exact:false}).filter({hasText:'Practice'}).first().click();await page.locator('.spell-adventure').waitFor();
 for(const width of [1440,768,375]){
  await page.setViewportSize({width,height:1100});check(`Academy fits ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(`Mentor does not overlap spelling at ${width}px`,await page.evaluate(()=>{const a=document.querySelector('.academy-mentor').getBoundingClientRect(),b=document.querySelector('.spell-book').getBoundingClientRect();return a.bottom<=b.top||a.right<=b.left;}));await capture('.spell-adventure',`05-academy-${width}`);
 }
 await page.getByRole('button',{name:'Type a word',exact:true}).click();await page.getByLabel('Your spelling',{exact:true}).fill('wrong');await page.getByRole('button',{name:'Check word',exact:true}).click();await page.locator('[data-reward-event="word_retry"]').waitFor();check('Gentle incorrect feedback awards no gold',(await stored('player_profiles'))[0].coins===testGold);await capture('.spell-adventure','06-gentle-retry');
 await page.getByRole('heading',{name:'You followed the word trail!',exact:true}).waitFor();
 await page.getByRole('button',{name:/Practice/,exact:false}).filter({hasText:'Practice'}).first().click();await page.getByRole('button',{name:'Type a word',exact:true}).click();
 await page.getByLabel('Your spelling',{exact:true}).fill('cat');await page.getByRole('button',{name:'Check word',exact:true}).click();await page.getByRole('heading',{name:'Correct!',exact:true}).waitFor();await page.getByRole('heading',{name:'You followed the word trail!',exact:true}).waitFor();
 check('Only normal confirmed practice rewards accrue',(await stored('player_profiles'))[0].coins===testGold+10&&(await stored('player_profiles'))[0].xp===70);
 await capture('.spell-complete','07-confirmed-rewards');
 await kingdom();check('First-word badge survives and mastery reflects current saved practice',await page.locator('[data-achievement="first-word"]').getAttribute('data-earned')==='true'&&await page.locator('[data-achievement="word-scholar"]').getAttribute('data-earned')==='false');
 const balance=(await stored('player_profiles'))[0].coins;await page.reload({waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();check('Refreshing badges never pays extra gold',(await stored('player_profiles'))[0].coins===balance);
 await page.setViewportSize({width:375,height:1100});await capture('.village-guides','08-guides-mobile');
 const other=(await stored('player_profiles'))[1];check('Other child balance and avatar untouched',other.coins===17&&other.xp===19&&other.avatar.base==='boy');
 // A failed new attempt must not display or pay a successful reward.
 await page.goto(`${base}/#/play?playerId=npc-child`);await page.getByRole('heading',{name:'Practice',exact:true}).waitFor();await page.getByRole('button',{name:/Practice/,exact:false}).filter({hasText:'Practice'}).first().click();
 await page.evaluate(async()=>{const {localBackend}=await import('/src/lib/localBackend.js');localBackend.mastery.recordAttempt=async()=>{throw new Error('Synthetic offline save');};});
 const failedGold=(await stored('player_profiles'))[0].coins;await page.getByRole('button',{name:'Type a word',exact:true}).click();await page.getByLabel('Your spelling',{exact:true}).fill('cat');await page.getByRole('button',{name:'Check word',exact:true}).click();await page.getByRole('alert').waitFor();
 check('Offline attempt awards no coins and no confirmed reward amount',(await stored('player_profiles'))[0].coins===failedGold&&await page.locator('.reward-amount').count()===0);
 await page.waitForTimeout(1800);check('Offline attempt pauses advancement',await page.locator('.spell-adventure').count()===1);
 await page.route('**/eli.webp',r=>r.abort());await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-npc-id="eli"]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-npc-id="eli"] img')?.src.endsWith('eli.png'));check('NPC uses transparent PNG fallback after WebP failure',await page.locator('[data-npc-id="eli"] img').evaluate(el=>el.complete&&el.naturalWidth>0));
 check('All production artwork loads',missing.length===0);check('No uncaught app errors',errors.length===0);
}finally{await fs.writeFile(path.join(out,'results.json'),JSON.stringify({checks,errors,missing},null,2));await browser.close();}
console.log(`${checks.length} NPC browser checks passed`);
