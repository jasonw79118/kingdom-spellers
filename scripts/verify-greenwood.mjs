// Run against `npm run dev -- --mode test --port 3100` with blank backend vars
// in ignored .env.test.local. Only synthetic, isolated localStorage is written.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_URL || 'http://127.0.0.1:3100';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local test URL required');
const out = path.resolve(process.env.QA_OUTPUT || '.snap/greenwood-review');
await fs.mkdir(out,{recursive:true});
const browser = await chromium.launch({channel:'msedge',headless:true});
const results = [], errors = [];
let page;
function check(name, condition) { assert.ok(condition,name); results.push(name); console.log('PASS',name); }
async function storage(table) { return page.evaluate(key=>JSON.parse(localStorage.getItem('ks2_'+key)),table); }
async function settle() { await page.waitForTimeout(150); }
async function openKingdom(id='visual-child') {
  await page.goto(`${base}/#/kingdom/${id}`,{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Your Kingdom',exact:true}).waitFor();
  await page.locator('.gw').waitFor();
}
try {
  const context = await browser.newContext({viewport:{width:1440,height:1080},reducedMotion:'reduce'});
  // Seed before auth mounts; never automate credentials or production sign-in.
  await context.addInitScript(()=>{
    if(localStorage.getItem('ks2_session')) return;
    localStorage.setItem('ks2_users',JSON.stringify([{id:'visual-parent',name:'Local reviewer'}]));
    localStorage.setItem('ks2_session',JSON.stringify({userId:'visual-parent'}));
    localStorage.setItem('ks2_player_profiles',JSON.stringify([
      {id:'visual-child',parent_id:'visual-parent',name:'Explorer',avatar:{base:'boy'},grade_level:1,coins:1000,xp:0,difficulty:'medium'},
      {id:'second-child',parent_id:'visual-parent',name:'Second explorer',avatar:{base:'girl'},grade_level:2,coins:77,xp:123,difficulty:'medium'}
    ]));
    localStorage.setItem('ks2_player_progress',JSON.stringify([
      {player_id:'visual-child',unlocked_kingdoms:[1],buildings:{},current_kingdom:1},
      {player_id:'second-child',unlocked_kingdoms:[1],buildings:{well:true},current_kingdom:1}
    ]));
    localStorage.setItem('ks2_spelling_lists',JSON.stringify([{id:'qa-list',player_id:'visual-child',parent_id:'visual-parent',title:'Local practice words',created_at:'2026-10-21'}]));
    localStorage.setItem('ks2_spelling_words',JSON.stringify([{id:'qa-word',list_id:'qa-list',word:'cat',normalized_word:'cat',position:0,kid_definition:'A small animal that meows.'}]));
  });
  await context.route('**/*',route=>new URL(route.request().url()).hostname===new URL(base).hostname ? route.continue() : route.abort());
  page = await context.newPage();
  page.setDefaultTimeout(45000);page.setDefaultNavigationTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));
  await openKingdom();
  check('Runtime uses isolated demo backend',await page.evaluate(async()=>(await import('/src/lib/backend.js')).backendMode==='demo'));
  check('Fresh Greenwood has zero purchased structures',await page.locator('[data-art-state="built"]').count()===0);
  check('One modest starter shelter',await page.locator('[data-role="starter-shelter"]').count()===1);
  check('Seven saved building IDs have selectable plots',await page.locator('.gw-lot').count()===7);
  for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:1080}); await settle();
    check(`No page overflow at ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check(`Map hit targets at least 44px at ${width}px`,await page.locator('.gw-lot').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44;})));
    await page.screenshot({path:path.join(out,`after-empty-${width}.png`),fullPage:true});
    await page.locator('.gw').screenshot({path:path.join(out,`greenwood-empty-${width}.png`),style:'.topbar,.bottomnav,.ks-version{visibility:hidden!important}'});
  }
  await page.locator('.gw-site').filter({hasText:'Wooden Cottage'}).click();
  check('Detail panel uses existing clear cost',await page.locator('.gw-detail .gw-primary').innerText()==='Clear plot · 10 gold');
  await page.locator('.gw-detail .gw-primary').evaluate(el=>{el.click();el.click();});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ks2_player_progress'))[0].buildings.cottage==='cleared');
  check('Rapid duplicate clearing charges once',(await storage('player_profiles'))[0].coins===990);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Build · 40 gold',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ks2_player_progress'))[0].buildings.cottage==='built');
  check('Building charges original price',(await storage('player_profiles'))[0].coins===950);
  await page.keyboard.press('Escape');
  check('Only purchased cottage is visible',await page.locator('[data-art-state="built"]').count()===1 && await page.locator('[data-art-id="cottage"]').getAttribute('data-art-state')==='built');
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();
  check('Purchase survives reload',await page.locator('[data-art-id="cottage"]').getAttribute('data-art-state')==='built');
  await page.locator('.gw-site').filter({hasText:'Wooden Cottage'}).click();
  check('Owned plot cannot charge again',await page.locator('.gw-detail .gw-primary').count()===0);
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  check('Zoom control works',await page.getByRole('status',{name:'Map zoom'}).innerText()==='125%');
  await page.getByRole('button',{name:'Reset map view'}).click();
  await page.locator('.gw-viewport').focus();
  await page.keyboard.press('ArrowRight');
  check('Keyboard pans the map',await page.locator('.gw-viewport').evaluate(el=>el.scrollLeft>0));
  await page.setViewportSize({width:375,height:1080});
  await page.locator('.gw-site').filter({hasText:'Village Bakery'}).click();
  await page.screenshot({path:path.join(out,'after-purchased-mobile.png'),fullPage:true});
  await openKingdom('second-child');
  check('Legacy boolean well remains built',await page.locator('[data-art-id="well"]').getAttribute('data-art-state')==='built');
  check('Other child does not inherit cottage',await page.locator('[data-art-id="cottage"]').getAttribute('data-art-state')==='wild');
  check('Other child balance and XP unchanged',(await storage('player_profiles'))[1].coins===77&&(await storage('player_profiles'))[1].xp===123);
  await openKingdom();
  await page.locator('.gw-site').filter({hasText:'Greenwood Castle'}).click();
  check('Castle uses real clearing and building prices',(await page.locator('.gw-detail').innerText()).includes('120 gold')&&(await page.locator('.gw-detail').innerText()).includes('600 gold'));
  // Set only this synthetic profile to zero to verify the insufficient-gold state.
  await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('ks2_player_profiles'));p[0].coins=0;localStorage.setItem('ks2_player_profiles',JSON.stringify(p));});
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();
  await page.locator('.gw-site').filter({hasText:'Village Bakery'}).click();
  check('Insufficient gold disables purchase',await page.locator('.gw-detail .gw-primary').isDisabled());
  await page.getByRole('button',{name:'Practice & earn gold'}).click();
  await page.getByRole('heading',{name:'Practice',exact:true}).waitFor();
  check('Practice opens correct child via query route',(await page.locator('body').innerText()).includes('Explorer') && await page.getByRole('option',{name:'Local practice words (1 words)'}).count()===1);
  await page.getByRole('button',{name:'▶ Practice',exact:true}).click();
  for (const letter of ['c','a','t']) {
    const tile=page.locator(`button[aria-label="Letter ${letter}"]`).last();
    if(await tile.count() && await tile.isEnabled()) await tile.click();
  }
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ks2_player_profiles'))[0].coins===10);
  check('Spelling earns existing gold and XP',(await storage('player_profiles'))[0].xp===10);
  await page.getByRole('heading',{name:'Practice',exact:true}).waitFor();
  await page.getByRole('button',{name:'👑 Royal Test',exact:true}).click();
  for (const letter of ['c','a','t']) await page.locator(`button[aria-label="Letter ${letter}"]`).last().click();
  await page.getByRole('heading',{name:'Practice',exact:true}).waitFor();
  check('Royal Test still awards zero gold and XP',(await storage('player_profiles'))[0].coins===10&&(await storage('player_profiles'))[0].xp===10);
  check('Completed Royal Test belongs to query-selected child',(await storage('player_progress'))[0].royal_tests_completed===1);
  await page.getByRole('button',{name:/Visit your kingdom/}).click();await page.locator('.gw').waitFor();
  await page.evaluate(async()=>{const {localBackend}=await import('/src/lib/localBackend.js');window.qaOriginalGet=localBackend.progress.get;localBackend.progress.get=async()=>{throw Error('Synthetic read failure');};location.hash='/kingdom/second-child';});
  await page.getByRole('button',{name:'Retry loading kingdom'}).waitFor();
  check('Failed kingdom load offers retry',await page.getByRole('alert').isVisible());
  await page.evaluate(async()=>{const {localBackend}=await import('/src/lib/localBackend.js');localBackend.progress.get=window.qaOriginalGet;});
  await page.getByRole('button',{name:'Retry loading kingdom'}).click();await page.locator('.gw').waitFor();
  check('Retry recovers the real saved kingdom',await page.locator('[data-art-id="well"]').getAttribute('data-art-state')==='built');
  await openKingdom();
  // Render every real Greenwood ID from existing save values for art review.
  await page.evaluate(async()=>{const {KINGDOMS}=await import('/src/game/kingdom.js');const p=JSON.parse(localStorage.getItem('ks2_player_progress'));p[0].buildings=Object.fromEntries(KINGDOMS[0].buildings.map(b=>[b.id,'built']));localStorage.setItem('ks2_player_progress',JSON.stringify(p));});
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.gw').waitFor();
  await page.setViewportSize({width:1440,height:1080});
  check('All seven purchased structures compose together',await page.locator('[data-art-state="built"]').count()===7);
  await page.locator('.gw').screenshot({path:path.join(out,'greenwood-complete-1440.png'),style:'.topbar,.bottomnav,.ks-version{visibility:hidden!important}'});
  check('No uncaught browser errors',errors.length===0);
} finally {
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));
  await browser.close();
}
console.log(`${results.length} browser checks passed. Evidence: ${out}`);
