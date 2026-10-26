import {webkit,devices} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createServer} from '../scripts/serve.mjs';
await mkdir('test-results',{recursive:true});const server=createServer(4203),browser=await webkit.launch({headless:true,...(process.env.WEBKIT_EXECUTABLE?{executablePath:process.env.WEBKIT_EXECUTABLE}:{})}),errors=[];
try{
 const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:844,height:390}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4203/?debug');await page.locator('#solo').tap({timeout:30000});
 await page.waitForFunction(()=>micro.native&&micro.state?.host?.state===2,{},{timeout:90000});
 const before=await page.evaluate(()=>micro.native.inspect().host.x);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');
 assert.ok(await page.evaluate(()=>micro.native.inspect().host.x)>before);
 await page.keyboard.down('Space');await page.waitForTimeout(200);await page.keyboard.up('Space');
 assert.ok(await page.evaluate(()=>micro.native.inspect().host.y)<242);
 await page.screenshot({path:'test-results/original-webkit.png'});assert.deepEqual(errors,[]);
 console.log('PASS: original Windows game runs, moves and jumps in iPhone-sized WebKit.');
}catch(e){const page=browser.contexts()[0].pages()[0];console.error('ERRORS',errors);console.error(JSON.stringify(await page.evaluate(()=>({status:document.querySelector('#status').textContent,overlay:document.querySelector('#overlay').innerText,state:window.micro?.state,isolation:crossOriginIsolated,frames:[...document.querySelectorAll('iframe')].map(f=>({text:f.contentDocument?.body.innerText,state:f.contentWindow.original?.inspect()}))})),null,2));await page.screenshot({path:'test-results/webkit-failure.png'});throw e;}
finally{await browser.close();server.close();}
