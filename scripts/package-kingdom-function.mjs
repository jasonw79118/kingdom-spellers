// Review bundle only. No upload, permission change, database write, or deployment.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('.snap/kingdom-function-review');
const files=['server/kingdom-function.mjs','server/kingdom-service.mjs','src/game/kingdom.js','src/game/expansion.js'];
for(const file of files){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'kingdom-actions-review',private:true,type:'module',version:'1.0.0',dependencies:{'node-appwrite':'29.0.0'}},null,2)+'\n');
fs.writeFileSync(path.join(root,'README.txt'),'REVIEW ONLY — NOT DEPLOYED\nEntry point: server/kingdom-function.mjs\nOnly allowlisted code is included. No .env, credentials, player data, or artwork.\nOwner approval, authenticated staging tests, least-privilege function scopes and production permission review are required before installation.\n');
console.log('Prepared allowlisted review bundle:',root);
