// Check generated links and ensure configured private values never ship.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const html=fs.readFileSync('build/index.html','utf8');
assert.match(html,/src="\/assets\//,'Root-domain JS link');
assert.match(html,/href="\/assets\//,'Root-domain CSS link');
assert.equal(fs.readFileSync('build/CNAME','utf8').trim(),'www.kingdomspellers.com');
const project=fs.readFileSync('.snap/project-build/index.html','utf8');
assert.match(project,/src="\/kingdom-spellers\/assets\//,'Project-path JS link');
assert.match(project,/href="\/kingdom-spellers\/assets\//,'Project-path CSS link');
const files=[];
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())visit(p);else files.push(p);}}
visit('build');
const contents=files.map(p=>fs.readFileSync(p));
let checked=0;
if(fs.existsSync('.env'))for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){
 const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
 if(!m||!/(API_KEY|PASSWORD|SECRET|SERVICE_ROLE|TTS_KEY)/.test(m[1]))continue;
 const value=m[2].replace(/^(['"])(.*)\1$/,'$2');
 if(value.length<12)continue;
 assert.ok(!contents.some(b=>b.includes(Buffer.from(value))),`Private configuration must not appear in build (${m[1]})`);
 checked++;
}
console.log(`PASS root and project asset links, custom-domain persistence, and ${checked} configured private-value bundle checks (values never printed).`);
