import {NativeCoop} from './coop.js';
const output=document.getElementById('output'),screen=document.getElementById('screen'),status=document.getElementById('status');
const ctx=output.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
let wine,coop,playing=false,audioStream,stopped=false,whole=false;
const notify=(type,data={})=>parent.postMessage({source:'microman-original',type,...data},location.origin);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const inspect=()=>coop?.inspect();
// The full original window remains clickable, including its native menus.
function point(event){const r=output.getBoundingClientRect(),scale=Math.min(r.width/output.width,r.height/output.height);return{x:(event.clientX-r.left-(r.width-output.width*scale)/2)/scale+(whole?0:38),y:(event.clientY-r.top-(r.height-output.height*scale)/2)/scale+(whole?0:76)};}
output.style.touchAction='none';
output.onpointerdown=event=>{if(!wine)return;event.preventDefault();output.setPointerCapture(event.pointerId);const p=point(event);wine.renderer.handleMouseDown(p.x,p.y,event.button);audio();};
output.onpointermove=event=>{if(wine){const p=point(event);wine.renderer.handleMouseMove(p.x,p.y);}};
output.onpointerup=output.onpointercancel=event=>{if(wine){const p=point(event);wine.renderer.handleMouseUp(p.x,p.y,event.button);}};
addEventListener('keydown',event=>{if(!wine)return;event.preventDefault();wine.renderer.handleKeyDown(event.keyCode,{code:event.code,location:event.location,repeat:event.repeat});if(event.key.length===1&&!event.ctrlKey&&!event.altKey)wine.renderer.handleKeyPress(event.key.charCodeAt(0));notify('key',{code:event.code,down:true});});
addEventListener('keyup',event=>{if(!wine)return;wine.renderer.handleKeyUp(event.keyCode,{code:event.code,location:event.location});notify('key',{code:event.code,down:false});});
addEventListener('blur',()=>notify('release'));
function input(value={}){
 if(!wine?.renderer)return;
 [value.x<0,value.x>0,value.y<0,value.y>0,value.jump,value.fire].forEach((v,i)=>wine.renderer.pokeAsyncKeyState([37,39,38,40,32,17][i],!!v));
}
function command(id){if(wine?.instance)wine.instance.exports.post_message_q(65537,0x111,id,0);}
function audio(){
 wine?.primeAudio();
 const ac=wine?._audioCtx;
 if(ac&&!audioStream){audioStream=ac.createMediaStreamDestination();const attach=()=>{if(ac._wineMaster){ac._wineMaster.connect(audioStream);return true;}return false;};if(!attach()){const t=setInterval(()=>{if(stopped||attach())clearInterval(t);},100);}}
 return audioStream?.stream;
}
function paint(){
 if(stopped)return;
 const state=inspect();
 wine?.renderer?.repaint();
 if(whole){if(output.width!==640){output.width=640;output.height=480;}ctx.drawImage(screen,0,0);}
 else{
  if(output.width!==512){output.width=512;output.height=320;}
  ctx.drawImage(screen,38,76,512,320,0,0,512,320);
  if(state?.guest){for(const [i,p] of [state.host,state.guest].entries())if(p){ctx.fillStyle=i?'#7ce0bf':'#ffe174';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('P'+(i+1),p.x+1,Math.max(9,p.y-21));}}
 }
 requestAnimationFrame(paint);
}
window.original={input,command,inspect,audio,get wine(){return wine;},get coop(){return coop;},get output(){return output;},
 setPartner(on){if(coop)coop.enabled=on;},remote(value){if(coop)coop.remote=value;},
 start(){command(32505);playing=true;},
 async restart(){coop?.reset();command(32505);for(let i=0;i<100;i++){const dialog=Object.values(wine.renderer.windows).find(w=>w.title==='New Game');if(dialog){wine.instance.exports.send_message(dialog.hwnd,0x111,6,0);break;}await sleep(25);}},
 regroup(){if(coop?.p2){const h=coop.u(0x42fb40);coop.h(coop.p2+4,coop.s(h+4));coop.h(coop.p2+6,coop.s(h+6)-36);coop.h(coop.p2+0x70,5);coop.h(coop.p2+0x8a,0);}},
 async stop(){stopped=true;input();await wine?.stop();},
 menu(on){whole=on;},
 stream(){const stream=output.captureStream(30);const sound=audio();for(const track of sound?.getAudioTracks()||[])stream.addTrack(track);return stream;},
};
try{
 if(!crossOriginIsolated)throw Error('Browser isolation is not ready. Reload the page.');
 wine=new WineAssembly();wine.threads=false;wine.logToUI=()=>{};
 await wine.init(screen);
 const manifest=await(await fetch('manifest.json')).json();
 await wine.loadExe('game/micro1.exe');
 await wine.loadFiles(manifest.files.map(({name})=>({url:'game/'+name,vfsPath:'c:\\'+name})),{required:true});
 coop=new NativeCoop(wine);
 wine.run(40000);
 for(let i=0;i<200&&!wine.renderer.windows[65538];i++)await sleep(25);
 // Preserve the original welcome screen inside the game files; acknowledge it
 // through its own dialog procedure so the browser launcher can start a game.
 if(wine.renderer.windows[65538])wine.instance.exports.send_message(65538,0x111,1,0);
 for(let i=0;i<200&&!coop.u(0x42fb2c);i++)await sleep(25);
 await sleep(250);
 window.original.start();
 let started=false;
 const deadline=performance.now()+60000;
 while(performance.now()<deadline){const s=inspect();if(s?.host&&[2,3,5].includes(s.host.state)&&s.room===1){started=true;break;}await sleep(50);}
 if(!started)throw Error('The original game did not finish starting. Reload to try again.');
 status.hidden=true;paint();notify('ready');
 setInterval(()=>{if(!stopped)notify('state',{state:inspect()});},100);
}catch(error){status.textContent=error.message;notify('error',{message:error.message});console.error(error);}
