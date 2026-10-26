import {Room} from './room.js';
import {parseCode} from './protocol.js';
import {prepareOriginal} from './isolate.js';
const $=id=>document.getElementById(id),keys=new Set(),pointers=new Map();
const empty=()=>({x:0,y:0,jump:false,fire:false,regroup:false});
let mode='',room=null,frame=null,native=null,remote=empty(),connected=false,ready=false,stream=null,state=null,toastUntil=0,peerHidden=false,paused=false;
const settings=()=>({turn:$('turn').value.trim(),username:$('username').value,credential:$('credential').value,host:$('peer-host').value.trim(),path:$('peer-path').value.trim()||'/'});
function toast(text,ms=5500){$('toast').textContent=text;toastUntil=performance.now()+ms;}
function overlay(title,text,action,label='Try again'){$('overlay').hidden=false;$('overlay-title').textContent=title;$('overlay-text').textContent=text;$('overlay-action').hidden=!action;$('overlay-action').textContent=label;$('overlay-action').onclick=action;}
function input(){const values=new Set(pointers.values()),has=(key,...codes)=>values.has(key)||codes.some(c=>keys.has(c));return{x:Number(has('right','ArrowRight','KeyD'))-Number(has('left','ArrowLeft','KeyA')),y:Number(has('down','ArrowDown','KeyS'))-Number(has('up','ArrowUp','KeyW')),jump:has('jump','Space'),fire:has('fire','KeyZ','KeyX','ControlLeft','ControlRight'),regroup:false};}
function release(){keys.clear();pointers.clear();document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('active'));native?.input();room?.input(empty());}
function pauseIfNeeded(){
 const next=!!(document.hidden||peerHidden||mode==='host'&&!connected&&room?.hadPartner);
 if(native&&next!==paused){native.command(806);paused=next;}
 if(next&&connected)overlay('Paused','Keep both game tabs visible to continue.');else if(ready&&connected)$('overlay').hidden=true;
}
function update(next){
 state=next;const me=mode==='guest'?next.guest:next.host;
 $('location').textContent=`Room ${next.room||1}`;$('score').textContent='Original MicroMan · Adventure 1';
 $('health-fill').style.width=Math.max(0,Math.min(100,(me?.hp??10)*10))+'%';
 $('partner-status').textContent=connected?'P1 gold · P2 mint · Jump on each other':mode==='host'?'Room open · Your friend can join anytime':'Solo adventure';
 if(mode==='host')room?.send({type:'state',state:{room:next.room,host:next.host||null,guest:next.guest||null,paused}});
}
async function enter(kind){
 mode=kind;ready=false;paused=false;peerHidden=false;release();$('lobby').hidden=true;$('game').hidden=false;document.body.classList.add('playing');$('invite').hidden=kind==='solo';$('player-name').textContent=kind==='guest'?'PLAYER 2':'PLAYER 1';$('remote-video').hidden=kind!=='guest';$('options').hidden=true;
 $('restart').disabled=kind==='guest';$('native-menu').disabled=kind==='guest';$('music').disabled=kind==='guest';
 if(kind==='guest'){overlay('Connecting to your friend…','Keep this tab open.');return;}
 overlay('Starting MicroMan','Loading your original Windows game…');
 frame=document.createElement('iframe');frame.id='native-frame';frame.title='Original MicroMan';frame.allow='autoplay; fullscreen';frame.src='native/index.html';$('arena').prepend(frame);
}
function startStream(){if(!native||!room?.accepted||!ready)return;native.setPartner(true);if(!stream)stream=native.stream();room.stream(stream);}
async function connect(host,code){
 if(!host)ready=false;
 room?.close();connected=false;remote=empty();
 const current=room=new Room({
  status:text=>toast(text),
  connected:()=>{if(room!==current)return;connected=true;current.hadPartner=true;peerHidden=false;native?.setPartner(true);room.send({type:'presence',hidden:document.hidden});if(host){pauseIfNeeded();toast('Your friend joined. Jump onto each other to reach higher.');}else{overlay('Connected','Waiting for the original game video…');room.send({type:'video-ready'});}},
  videoReady:startStream,
  stream:async media=>{const video=$('remote-video');video.srcObject=media;video.muted=true;try{await video.play();ready=true;$('overlay').hidden=true;toast('Tap Enable sound to hear the game.');$('enable-audio').hidden=false;}catch{overlay('Game connected','Tap Play to start the game video.',async()=>{await video.play();ready=true;$('overlay').hidden=true;},'Play');}},
  input:value=>{remote=value;native?.remote(value);if(value.regroup)native?.regroup();},
  state:next=>{update(next);if(next.paused)overlay('Paused','Waiting for the host to resume.');else if(ready)$('overlay').hidden=true;},
  presence:value=>{peerHidden=value;remote=empty();native?.remote(remote);pauseIfNeeded();},
  latency:ms=>$('latency').textContent=ms+' ms',
  disconnected:()=>{if(room!==current)return;connected=false;remote=empty();native?.remote(remote);release();pauseIfNeeded();overlay('Connection lost',host?'Your friend can rejoin the same room, or you can continue solo.':'Ask your host to keep the room open, then reconnect.',host?continueSolo:()=>connect(false,code),host?'Continue solo':'Reconnect');},
  error:message=>{if(room!==current)return;toast(message,12000);if(!current.accepted)overlay('Could not connect',message,()=>connect(host,code));}
 },settings());
 try{const result=await current.open(host,code);if(room!==current)return;$('room-code').textContent=result;toast(host?`Room ${result} is open. Tap ROOM to copy the invitation.`:'Connecting…',9000);}catch(error){if(room===current)overlay('Could not open the room',error.message,()=>connect(host,code));}
}
function continueSolo(){if(room)room.hadPartner=false;peerHidden=false;native?.setPartner(false);pauseIfNeeded();$('overlay').hidden=true;}
async function begin(kind){try{await enter(kind);if(kind==='host')await connect(true);}catch(e){overlay('Could not start',e.message,()=>location.reload());}}
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame?.contentWindow||event.data?.source!=='microman-original')return;
 const data=event.data;
 if(data.type==='key'&&controls.includes(data.code)){if(data.down)keys.add(data.code);else keys.delete(data.code);}
 if(data.type==='release')release();
 if(data.type==='ready'){native=frame.contentWindow.original;ready=true;native.audio();native.setPartner(connected);if(connected)startStream();$('overlay').hidden=true;pauseIfNeeded();}
 if(data.type==='state'&&data.state)update(data.state);
 if(data.type==='error')overlay('Could not start the original game',data.message,()=>location.reload());
});
$('host').onclick=()=>begin('host');$('solo').onclick=()=>begin('solo');
$('join-form').onsubmit=async event=>{event.preventDefault();const code=parseCode($('code').value);if(!code){$('status').textContent='Enter a two-character room code.';return;}await enter('guest');connect(false,code);};
$('invite').onclick=async()=>{if(!room?.code)return;const url=new URL(location.href);url.hash='room='+room.code;try{await navigator.clipboard.writeText(url.href);toast(`Invitation copied. Room ${room.code}.`);}catch{toast(url.href,20000);}};
const menu=()=>{$('options').hidden=!$('options').hidden;$('menu-toggle').setAttribute('aria-expanded',String(!$('options').hidden));release();};$('home').onclick=menu;$('menu-toggle').onclick=menu;
$('regroup').onclick=()=>{if(native)native.regroup();else room?.input({...empty(),regroup:true});$('options').hidden=true;};
$('restart').onclick=()=>{native?.restart();$('options').hidden=true;};
$('native-menu').onchange=()=>{native?.menu($('native-menu').checked);$('options').hidden=true;};
$('sound').onchange=()=>{if(mode==='guest')$('remote-video').muted=!$('sound').checked;else{native?.audio();native?.command(910);}};
$('music').onchange=()=>{native?.audio();native?.command(942);};
$('enable-audio').onclick=()=>{const video=$('remote-video');video.muted=false;video.play().catch(()=>{});$('enable-audio').hidden=true;};
$('touch').checked=matchMedia('(pointer:coarse)').matches;$('touch').onchange=()=>document.body.classList.toggle('touch',$('touch').checked);$('touch').onchange();
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Rotate your phone for a wider view.');}};
$('leave').onclick=async()=>{room?.close();room=null;release();stream?.getTracks().forEach(t=>t.stop());stream=null;await native?.stop();frame?.remove();frame=null;native=null;mode='';connected=false;ready=false;$('remote-video').srcObject=null;$('game').hidden=true;$('lobby').hidden=false;document.body.classList.remove('playing');};
const controls=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','KeyZ','KeyX','Space','ControlLeft','ControlRight'];
addEventListener('keydown',event=>{if(mode&&!(event.target instanceof HTMLInputElement)&&controls.includes(event.code)){event.preventDefault();keys.add(event.code);native?.audio();}});
addEventListener('keyup',event=>keys.delete(event.code));addEventListener('blur',release);
document.addEventListener('visibilitychange',()=>{release();room?.send({type:'presence',hidden:document.hidden});pauseIfNeeded();});
document.querySelectorAll('[data-key]').forEach(button=>{button.onpointerdown=event=>{event.preventDefault();button.setPointerCapture(event.pointerId);pointers.set(event.pointerId,button.dataset.key);button.classList.add('active');native?.audio();};const end=event=>{pointers.delete(event.pointerId);button.classList.toggle('active',[...pointers.values()].includes(button.dataset.key));};button.onpointerup=end;button.onpointercancel=end;button.onlostpointercapture=end;});
const shared=parseCode(new URLSearchParams(location.hash.slice(1)).get('room'));if(shared)$('code').value=shared;
setInterval(()=>{if(mode==='guest')room?.input(input());else if(native){native.input(paused?empty():input());native.remote(paused?empty():remote);}if(performance.now()>toastUntil)$('toast').textContent='';},33);
for(const id of ['host','solo','join'])$(id).disabled=true;
try{await prepareOriginal();sessionStorage.removeItem('microman-isolation-reload');for(const id of ['host','solo','join'])$(id).disabled=false;$('status').textContent='Ready. Original game, online co-op, no installation.';}catch(error){$('status').textContent=error.message;}
if(new URLSearchParams(location.search).has('debug'))window.micro={get native(){return native;},get state(){return state;},get room(){return room;},input};
