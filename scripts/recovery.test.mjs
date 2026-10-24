import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecoveryLink, prepareRecoveryLocation, getRecoveryCredentials, clearRecoveryCredentials, recoveryRedirect, validateRecoveryPassword, createPasswordRecovery } from '../src/lib/passwordRecovery.js';
test('root and project redirects retain base path without hash or secrets', () => {
 for (const path of ['/', '/kingdom-spellers/']) assert.equal(recoveryRedirect(`https://www.kingdomspellers.com${path}?secret=old#/login`), `https://www.kingdomspellers.com${path}?passwordRecovery=1`);
});
test('email callback routes publicly and scrubs credentials before rendering', () => {
 let clean; prepareRecoveryLocation({href:'https://example.com/?passwordRecovery=1&userId=parent&secret=private&expire=soon'}, {replaceState:(_, __, value) => clean=value});
 assert.equal(clean, '/#/reset-password'); assert.deepEqual(getRecoveryCredentials(), {userId:'parent',secret:'private'});
 clearRecoveryCredentials(); assert.equal(getRecoveryCredentials(), null);
 assert.equal(parseRecoveryLink('https://example.com/?userId=parent').credentials, null);
 assert.deepEqual(parseRecoveryLink('https://example.com/#/reset-password?userId=p&secret=s').credentials,{userId:'p',secret:'s'});
});
test('password length and confirmation validated', () => {
 assert.ok(validateRecoveryPassword('short','short')); assert.ok(validateRecoveryPassword('a'.repeat(257),'a'.repeat(257)));
 assert.ok(validateRecoveryPassword('password1','different')); assert.equal(validateRecoveryPassword('long password','long password'),'');
});
test('Appwrite requests use email and verified token without account or database mutation', async () => {
 const calls=[];const flow=createPasswordRecovery({createRecovery:async x=>calls.push(x),updateRecovery:async x=>calls.push(x)});
 assert.equal((await flow.requestPasswordReset(' parent@example.test ','https://example.com/?passwordRecovery=1')).error,null);
 assert.equal((await flow.resetPassword({userId:'p',secret:'s'},'new password')).error,null);
 assert.deepEqual(calls,[{email:'parent@example.test',url:'https://example.com/?passwordRecovery=1'},{userId:'p',secret:'s',password:'new password'}]);
 assert.ok((await flow.resetPassword(null,'new password')).error); assert.equal(calls.length,2);
});
test('unknown email is private; rate limits and expired tokens are actionable', async () => {
 const throwing = e => createPasswordRecovery({createRecovery:async()=>{throw e},updateRecovery:async()=>{throw e}});
 assert.equal((await throwing({type:'user_not_found'}).requestPasswordReset('a','url')).error,null);
 assert.match((await throwing({code:429}).requestPasswordReset('a','url')).error.message,/wait/);
 assert.match((await throwing({code:401}).resetPassword({userId:'p',secret:'s'},'password')).error.message,/expired/);
 assert.match((await throwing({code:500}).requestPasswordReset('a','url')).error.message,/Could not send/);
});
