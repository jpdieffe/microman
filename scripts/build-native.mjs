import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve('.research/berrry-wine'),revision='754c97d3ff22ce0a0cd06d08ac06dc0446fbcbb2';
function run(program,args,cwd=root){const r=spawnSync(program,args,{cwd,encoding:'utf8',stdio:'pipe',maxBuffer:4*1024*1024});if(r.status!==0)throw Error(r.stderr||r.stdout||r.error?.message||`${program} failed`);return r.stdout;}
if(run('git',['rev-parse','HEAD']).trim()!==revision)throw Error('Use the pinned emulator revision: '+revision);
for(const name of ['truecolor-palette.patch','browser-canvas-fallback.patch']){
 const patch=path.resolve('patches',name);
 const check=spawnSync('git',['apply','--check',patch],{cwd:root,encoding:'utf8'});
 if(check.status===0)run('git',['apply',patch]);
 else if(spawnSync('git',['apply','--reverse','--check',patch],{cwd:root}).status!==0)throw Error('Patch does not apply cleanly: '+name);
}
function normalize(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())normalize(p);else if(/\.watx?$/.test(p)){const old=fs.readFileSync(p,'utf8'),next=old.replace(/\r\n/g,'\n');if(next!==old)fs.writeFileSync(p,next);}}}
normalize(path.join(root,'src'));
console.log(run(process.execPath,['tools/build-compile-wat.js']));
console.log(run(process.execPath,['scripts/package-native.mjs',root],process.cwd()));
