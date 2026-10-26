import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.QA_URL||'http://127.0.0.1:3110';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Synthetic local tests only');
await fs.mkdir('qa/dragon-mobile-evidence',{recursive:true});
const checks=[],limitations=[];
const check=(label,value)=>{assert.ok(value,label);checks.push(label);console.log('PASS',label);};
// Valid PCM WAV: delayed cloud response exercises actual decode, not HTMLAudio stubs.
const wav=Buffer.alloc(44+16000);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);for(let i=0;i<8000;i++)wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/16000)*8000),44+i*2);
for(const engine of (process.env.QA_ENGINE?[process.env.QA_ENGINE]:['chromium','webkit'])){
 const browser=await pw[engine].launch(engine==='chromium'?{channel:'msedge',headless:true,args:['--autoplay-policy=user-gesture-required']}:{headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  let delay=150;
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='voice.example.test'){await new Promise(r=>setTimeout(r,delay));return route.fulfill({status:200,contentType:'audio/wav',headers:{'access-control-allow-origin':'*'},body:wav});}
   if(url.hostname===new URL(base).hostname)return route.continue();return route.abort();
  });
  await context.addInitScript(()=>{
   window.qa={sources:0,oscillators:0,contexts:0};const Native=window.AudioContext||window.webkitAudioContext;
   if(Native){const Wrapped=function(...args){const c=new Native(...args);qa.contexts++;const source=c.createBufferSource.bind(c),osc=c.createOscillator.bind(c);c.createBufferSource=()=>{const node=source(),start=node.start.bind(node);node.start=(...a)=>{qa.sources++;return start(...a);};return node;};c.createOscillator=()=>{const node=osc(),start=node.start.bind(node);node.start=(...a)=>{qa.oscillators++;return start(...a);};return node;};return c;};window.AudioContext=Wrapped;}
   if(localStorage.getItem('ks2_session'))return;
   localStorage.setItem('ks2_users',JSON.stringify([{id:'dragon-parent',name:'Synthetic parent'}]));localStorage.setItem('ks2_session',JSON.stringify({userId:'dragon-parent'}));
   localStorage.setItem('ks2_player_profiles',JSON.stringify([{id:'dragon-child',parent_id:'dragon-parent',name:'Dragon explorer',grade_level:1,difficulty:'medium',coins:123,xp:456,avatar:{base:'boy',hair:'short',companion:'cat',dragon:{feeds:4},futureField:'keep'}},{id:'other-child',parent_id:'dragon-parent',name:'Other child',coins:7,avatar:{base:'girl'}}]));
   localStorage.setItem('ks2_player_progress',JSON.stringify([{player_id:'dragon-child',buildings:{cottage:true},unlocked_kingdoms:[1],royal_tests_completed:5}]));
   localStorage.setItem('ks2_player_word_mastery',JSON.stringify([{player_id:'dragon-child',word:'cat',correct_attempts:18,attempts:18}]));
   localStorage.setItem('ks2_tts_provider','cloud');localStorage.setItem('ks2_tts_proxy','https://voice.example.test/');
  });
  const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')console.log('BROWSER',engine,m.text());});
  await page.goto(base+'/#/kingdom/dragon-child',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Hatchling',exact:true}).waitFor();
  const before=await page.evaluate(()=>({profiles:JSON.parse(localStorage.ks2_player_profiles),progress:localStorage.ks2_player_progress}));
  await page.getByRole('button',{name:'Feed dragon',exact:true}).tap();await page.getByRole('heading',{name:'Young dragon',exact:true}).waitFor();
  check(engine+' feeding evolves the saved hatchling at five snacks',await page.locator('.dragon-den [role="status"]').textContent().then(t=>t.includes('evolved')));
  await page.getByRole('button',{name:'Feed dragon',exact:true}).tap();await page.getByText('6 snacks fed',{exact:true}).waitFor();
  check(engine+' exhausted snacks cannot be reused',await page.getByRole('button',{name:'Feed dragon',exact:true}).isDisabled());
  await page.reload({waitUntil:'domcontentloaded'});await page.getByText('6 snacks fed',{exact:true}).waitFor();
  const after=await page.evaluate(()=>({profiles:JSON.parse(localStorage.ks2_player_profiles),progress:localStorage.ks2_player_progress}));
  check(engine+' feeding preserves currency, XP, unknown avatar fields and other children',after.profiles[0].coins===123&&after.profiles[0].xp===456&&after.profiles[0].avatar.futureField==='keep'&&JSON.stringify(after.profiles[1])===JSON.stringify(before.profiles[1]));
  check(engine+' feeding leaves kingdom purchases and test history intact',after.progress===before.progress);
  check(engine+' village companion shows evolved art',await page.locator('.ks-companion-marker image').getAttribute('href').then(h=>h.endsWith('/young.webp')));
  await page.locator('.dragon-den').screenshot({style:'.topbar,.bottomnav{visibility:hidden!important}',path:`qa/dragon-mobile-evidence/${engine}-dragon-den.png`});
  check(engine+' dragon care fits phone width',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(base+'/#/players?edit=dragon-child',{waitUntil:'domcontentloaded'});await page.getByLabel('Hair style',{exact:true}).waitFor();
  for(const id of ['crop','quiff','coils']){
   await page.getByLabel('Hair style',{exact:true}).selectOption(id);await page.waitForFunction(id=>document.querySelector('.avatar-dressing-room [data-avatar-hair]')?.getAttribute('data-avatar-hair')===id,id);
   const href=await page.locator('.avatar-dressing-room [data-avatar-layer="hair"]').getAttribute('href');const response=await page.request.get(base+href);check(engine+' '+id+' hair has a working painted asset',response.ok());
   await page.locator('.avatar-dressing-room').screenshot({style:'.topbar,.bottomnav{visibility:hidden!important}',path:`qa/dragon-mobile-evidence/${engine}-hair-${id}.png`});
  }
  await page.getByRole('button',{name:'Save changes',exact:false}).click();
  check(engine+' wardrobe save retains dragon growth',await page.evaluate(()=>JSON.parse(localStorage.ks2_player_profiles)[0].avatar.dragon.feeds===6));
  const audioAPI=await page.evaluate(()=>typeof (window.AudioContext||window.webkitAudioContext));
  console.log('Audio API',engine,audioAPI);
  if(audioAPI!=='function'){limitations.push(engine+' build does not expose Web Audio; audio playback requires a real supported device check.');check(engine+' no uncaught browser errors',errors.length===0);continue;}
  await page.goto(base+'/#/kingdom/other-child',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Adopt baby dragon - free',exact:true}).waitFor();
  await page.evaluate(async()=>{const {localBackend}=await import('/src/lib/localBackend.js');window.qaProfileUpdate=localBackend.profiles.update;localBackend.profiles.update=async()=>{throw Error('Synthetic dragon save failure');};});
  await page.getByRole('button',{name:'Adopt baby dragon - free',exact:true}).tap();await page.locator('.dragon-den [role="status"]').filter({hasText:'Synthetic dragon save failure'}).waitFor();
  check(engine+' failed adoption never pretends a companion was saved',await page.evaluate(()=>!JSON.parse(localStorage.ks2_player_profiles)[1].avatar.companion));
  await page.evaluate(async()=>{(await import('/src/lib/localBackend.js')).localBackend.profiles.update=qaProfileUpdate;});
  await page.getByRole('button',{name:'Adopt baby dragon - free',exact:true}).tap();await page.getByRole('heading',{name:'Hatchling',exact:true}).waitFor();
  check(engine+' free adoption persists without changing player balance',await page.evaluate(()=>{const p=JSON.parse(localStorage.ks2_player_profiles)[1];return p.avatar.companion==='dragon'&&p.coins===7;}));
  check(engine+' a new dragon cannot eat unearned snacks',await page.getByRole('button',{name:'Feed dragon',exact:true}).isDisabled());
  // A tap handler calls speech before any await. The fetched clip arrives after activation expires.
  await page.evaluate(async()=>{const speech=await import('/src/lib/speech.js');window.qaSpeech=speech;const b=document.createElement('button');b.id='qa-hear';b.style.cssText='position:fixed;top:150px;left:10px;z-index:99999';b.textContent='QA hear word';b.onclick=()=>speech.speakWord(window.qaNextWord||'cat');document.body.append(b);});
  const starts=await page.evaluate(()=>qa.sources);await page.locator('#qa-hear').tap();try{await page.waitForFunction(n=>qa.sources>n,starts);}catch(e){console.log(await page.evaluate(async()=>({qa,state:(await import('/src/lib/soundEffects.js')).getSharedAudioContext()?.state,api:typeof AbortSignal.timeout})));throw e;}
  check(engine+' delayed cloud speech decodes and starts on the unlocked context',await page.evaluate(()=>qa.contexts===1));
  await page.waitForTimeout(650);
  // Cached speech must wait for an asynchronously resumed (interrupted) context too.
  await page.evaluate(async()=>{const audio=(await import('/src/lib/soundEffects.js')).getSharedAudioContext();window.qaResumeAudio=audio;window.qaResumeNative=audio.resume.bind(audio);window.qaResumeState='suspended';Object.defineProperty(audio,'state',{configurable:true,get:()=>window.qaResumeState});let pending;audio.resume=()=>pending||=(new Promise(resolve=>setTimeout(()=>{window.qaResumeState='running';resolve();},150)));});
  const cached=await page.evaluate(()=>qa.sources);await page.locator('#qa-hear').tap();await page.waitForFunction(n=>qa.sources>n,cached);check(engine+' cached speech waits for asynchronous audio resume',true);
  await page.evaluate(()=>{delete qaResumeAudio.state;qaResumeAudio.resume=qaResumeNative;});await page.waitForTimeout(650);

  const effects=await page.evaluate(()=>qa.oscillators);await page.getByLabel('Game sound settings').tap();await page.getByRole('button',{name:'Preview sound',exact:true}).tap();await page.waitForFunction(n=>qa.oscillators>n,effects);
  check(engine+' effects remain audible after cloud speech finishes',true);
  await page.evaluate(async()=>{const sounds=await import('/src/lib/soundEffects.js');sounds.setSoundPreferences({enabled:false});});
  const speechStarts=await page.evaluate(()=>qa.sources);await page.locator('#qa-hear').tap();await page.waitForFunction(n=>qa.sources>n,speechStarts);check(engine+' muting game effects does not mute speech',true);
  delay=700;await page.evaluate(()=>{window.qaNextWord='cancelword';});const cancelled=await page.evaluate(()=>qa.sources);await page.locator('#qa-hear').tap();await page.evaluate(()=>qaSpeech.stopSpeaking());await page.waitForTimeout(1000);check(engine+' cancelled cloud requests never speak late',await page.evaluate(n=>qa.sources===n,cancelled));
  check(engine+' no uncaught browser errors',errors.length===0);
 }finally{await browser.close();}
}
await fs.writeFile('qa/dragon-mobile-evidence/results.json',JSON.stringify({checks,limitations},null,2));console.log(checks.length+' dragon and mobile audio browser checks passed');
