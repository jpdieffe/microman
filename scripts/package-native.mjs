import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const source=path.resolve(process.argv[2]||'.research/berrry-wine'),out=path.resolve('site/native');
const copy=(from,to=from)=>{const dest=path.join(out,to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(path.join(source,from),dest,{recursive:true});};
const index=fs.readFileSync(path.join(source,'index.html'),'utf8');
const section=index.split('const WINE_RUNTIME_SCRIPTS = Object.freeze([')[1].split(']);')[0];
const scripts=[...section.matchAll(/"([^"]+\.js)"/g)].map(m=>m[1]);
for(const name of ['lib','host.js','LICENSE','build/wine-assembly.wasm','build/wine-assembly.compat.wasm','src/api_table.json'])copy(name);
for(const name of fs.readdirSync(path.join(source,'fonts')))if(fs.statSync(path.join(source,'fonts',name)).isFile()||name==='subset')copy('fonts/'+name);
for(const name of ['liberation/LICENSE','comic-relief/OFL.txt','wine','anakron'])copy('fonts/'+name);
fs.cpSync('.research/original',path.join(out,'game'),{recursive:true});
const files=fs.readdirSync(path.join(out,'game'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:2,emulator:'https://github.com/vgrichina/berrry-wine',commit:'754c97d3ff22ce0a0cd06d08ac06dc0446fbcbb2',patches:['truecolor-palette.patch','browser-canvas-fallback.patch'],files:files.map(name=>({name,sha256:sha(path.join(out,'game',name))})),wasm:sha(path.join(out,'build/wine-assembly.wasm')),compatWasm:sha(path.join(out,'build/wine-assembly.compat.wasm'))},null,2)+'\n');
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#091820}#output{width:100%;height:100%;object-fit:contain;image-rendering:pixelated;display:block}#screen{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}#status{position:absolute;inset:40% 16px auto;color:#dbe9e6;font:14px system-ui;text-align:center}</style></head><body><canvas id="screen" width="640" height="480"></canvas><canvas id="output" width="512" height="320"></canvas><p id="status">Starting the original MicroMan…</p><script>window.WINE_SOURCE_VERSION='micro-original-2';window.WINE_THREADS=false;</script>
${scripts.map(s=>`<script src="${s}"></script>`).join('\n')}
<script type="module" src="boot.js"></script></body></html>`);
console.log(`Packaged original executable, ${files.length} original files, and pinned emulator.`);
