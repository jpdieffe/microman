import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validInput,validNativeState,parseCode} from '../site/protocol.js';
test('the shipped executable is the original v2.0 game, unchanged',()=>{
 const exe=fs.readFileSync('site/native/game/micro1.exe');
 assert.equal(createHash('sha256').update(exe).digest('hex'),'3aaa31d4cf814cddbf2a19d83905751ce8faf46f7d60194d35d31c8127cc684e');
 const manifest=JSON.parse(fs.readFileSync('site/native/manifest.json'));
 assert.equal(manifest.files.length,17);
 for(const file of manifest.files)assert.equal(createHash('sha256').update(fs.readFileSync('site/native/game/'+file.name)).digest('hex'),file.sha256,file.name);
 assert.equal(createHash('sha256').update(fs.readFileSync('site/native/build/wine-assembly.wasm')).digest('hex'),manifest.wasm);
 assert.equal(createHash('sha256').update(fs.readFileSync('site/native/build/wine-assembly.compat.wasm')).digest('hex'),manifest.compatWasm);
});
test('network packets reject malformed inputs and native HUD state',()=>{
 assert.equal(parseCode(' ab '),'AB');assert.equal(parseCode('ABC'),null);
 const input={type:'input',seq:1,x:1,y:0,jump:true,fire:false,regroup:false};assert.ok(validInput(input));
 assert.ok(!validInput({...input,x:Infinity}));assert.ok(!validInput({...input,seq:-1}));assert.ok(!validInput({...input,fire:'yes'}));
 const state={room:1,paused:false,host:{x:125,y:242,hp:10,state:2},guest:null};assert.ok(validNativeState(state));
 assert.ok(!validNativeState({...state,room:999}));assert.ok(!validNativeState({...state,host:{...state.host,x:NaN}}));
});
