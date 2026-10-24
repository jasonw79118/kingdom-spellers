import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const calls=[];let expired=false;
 await page.route('**/*', async route=>{
  const url=new URL(route.request().url());
  if (url.pathname.endsWith('/account/recovery')) {
   calls.push({method:route.request().method(),data:route.request().postDataJSON()});
   return route.fulfill({status:expired?401:200,contentType:'application/json',body:JSON.stringify(expired?{message:'Invalid token',code:401,type:'user_invalid_token'}:{})});
  }
  if (url.hostname==='127.0.0.1') return route.continue();
  return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'Guest',code:401})});
 });
 await page.goto('http://127.0.0.1:3111/#/login', {waitUntil:'domcontentloaded'});
 await page.getByRole('link',{name:'Forgot password?'}).click();
 await page.getByLabel('Email',{exact:true}).fill('parent@example.test');
 await page.getByRole('button',{name:'Send reset link'}).click();
 await page.getByRole('status').filter({hasText:'If an account exists'}).waitFor();
 assert.equal(calls[0].data.url,'http://127.0.0.1:3111/?passwordRecovery=1');
 await page.goto('http://127.0.0.1:3111/?passwordRecovery=1&userId=synthetic&secret=synthetic-only', {waitUntil:'domcontentloaded'});
 await page.getByLabel('New password',{exact:true}).fill('new password');
 await page.getByLabel('Confirm new password').fill('wrong password');
 await page.getByRole('button',{name:'Update password'}).click();
 await page.getByRole('alert').filter({hasText:'do not match'}).waitFor();assert.equal(calls.length,1);
 assert.equal(new URL(page.url()).search,'');
 await page.getByLabel('Confirm new password').fill('new password');
 await page.getByRole('button',{name:'Update password'}).click();
 await page.getByRole('status').filter({hasText:'has been updated'}).waitFor();
 assert.equal(calls[1].method,'PUT');assert.equal(calls[1].data.secret,'synthetic-only');
 await page.screenshot({path:'qa/password-recovery-mobile.png',fullPage:true});
 await page.reload({waitUntil:"domcontentloaded"});await page.getByRole('alert').filter({hasText:'missing or incomplete'}).waitFor();
 expired=true;await page.goto('http://127.0.0.1:3111/?passwordRecovery=1&userId=synthetic&secret=expired', {waitUntil:'domcontentloaded'});
 await page.getByLabel('New password',{exact:true}).fill('new password');await page.getByLabel('Confirm new password').fill('new password');await page.getByRole('button',{name:'Update password'}).click();
 await page.getByRole('alert').filter({hasText:'expired'}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Recovery browser checks passed: request, callback routing, secret removal, confirmation, reset, reload safety, expiration, mobile layout. No emails sent.');
} finally {await browser.close();}
