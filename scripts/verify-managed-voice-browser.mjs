import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.QA_URL||'http://127.0.0.1:3114';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Synthetic local test only');
const wav=Buffer.alloc(44+8000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(8000,40);for(let i=0;i<4000;i++)wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/16000)*5000),44+i*2);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 let configured=false,posts=0;
 const headers={'access-control-allow-origin':base,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname==='127.0.0.1')return route.continue();
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(url.hostname==='kingdom-spellers-tts.jasonw79118.workers.dev'){
   if(url.pathname==='/health')return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({ok:true,configured})});
   posts++;return configured?route.fulfill({status:200,headers,contentType:'audio/wav',body:wav}):route.fulfill({status:500,headers,contentType:'application/json',body:'{"error":"Server not configured"}'});
  }
  if(url.pathname.endsWith('/account'))return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({$id:'voice-parent',email:'synthetic@example.test',name:'Synthetic parent'})});
  return route.abort();
 });
 await context.addInitScript(()=>{localStorage.setItem('ks2_tts_apikey:elevenlabs','synthetic-browser-only-key');localStorage.setItem('ks2_tts_provider','auto');speechSynthesis.speak=u=>{window.qaUtterance=u;};});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#/settings',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Settings',exact:true}).waitFor();
 assert.equal(await page.locator('#tts-key').count(),0);console.log('PASS managed voice does not offer an ignored browser-key field');
 await page.getByRole('button',{name:'Test shared voice',exact:true}).click();
 await page.getByRole('status').filter({hasText:'no server key yet'}).waitFor();assert.equal(posts,0);console.log('PASS missing server key is detected before synthesis');
 await page.getByRole('button',{name:/Preview$/}).click();await page.getByRole('status').filter({hasText:'this device voice'}).waitFor();console.log('PASS preview reports device fallback instead of claiming ElevenLabs');
 configured=true;await page.getByRole('button',{name:'Test shared voice',exact:true}).click();await page.getByRole('status').filter({hasText:'Voice connection works'}).waitFor();
 await page.getByRole('button',{name:/Preview$/}).click();await page.getByRole('status').filter({hasText:'Reading elephant with ElevenLabs.'}).waitFor();console.log('PASS successful shared connection clears fallback and reports cloud playback');
 assert.ok(posts>=2);assert.equal(errors.length,0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS phone layout and no uncaught browser errors');
}finally{await browser.close();}
