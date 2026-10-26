export const STEP=1/60,WIDTH=512,HEIGHT=320,PW=14,PH=32,HEAD_WIDTH=22;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const emptyInput=()=>({x:0,y:0,jump:false,fire:false,regroup:false});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export const body=p=>({x:p.x-PW/2,y:p.y-p.h,w:PW,h:p.h});
const objBox=e=>({x:e.x-e.w/2,y:e.y-e.h/2,w:e.w,h:e.h});
const enemySprites=new Set([22,23,24,29,30,31,48,49,50,51,52,53,56]);
function makePlayer(id){return {id,active:id===0,room:0,x:96+id*38,y:260,vx:0,vy:0,h:PH,face:1,ground:false,support:null,climbing:false,duck:false,health:100,invulnerable:0,hurt:0,dead:0,shot:0,teleport:0,jumpHeld:false,jumpBuffer:0,coyote:0,shield:0,checkpoint:{room:0,x:96+id*38,y:260}};}
export class World{
 constructor(data,run=1){this.data=data;this.run=run;this.time=0;this.players=[makePlayer(0),makePlayer(1)];this.inputs=[emptyInput(),emptyInput()];this.entities=new Map();this.bullets=[];this.events=[];this.nextEvent=1;this.nextBullet=1;this.score=0;this.phase='playing';this.visited=new Set([0]);this.upgrades={power:false,jump:false,rapid:false,guided:false};this.load(0);}
 event(type,p,extra={}){this.events.push({id:this.nextEvent++,type,time:this.time,room:p.room,x:p.x,y:p.y,...extra});this.events=this.events.slice(-80);}
 load(room){if(this.entities.has(room))return;const original=this.data.rooms[room];if(!original)throw new Error('Unknown original room');
  this.entities.set(room,original.objects.filter(o=>o.sprite>=0).map(o=>({...o,room,alive:true,originX:o.x,originY:o.y,oldX:o.x,oldY:o.y,phase:o.id*.7,dir:o.args[1]&1?-1:1,health:o.sprite===23?24:o.sprite===24?12:o.behavior===26?35:3,cooldown:.8+(o.id%5)*.3,enemy:enemySprites.has(o.sprite),active:true})));}
 join(){const p=this.players[1];if(!p.active){p.active=true;this.regroup(1);}this.inputs[1]=emptyInput();}
 solids(room){const r=this.data.rooms[room],rects=[];
  for(let i=0;i<r.tiles.length;i++){const tile=this.data.tiles[r.tiles[i]];if(!tile||!(tile.flags&2))continue;let [l,t,rr,b]=tile.solid;if(l<0){l=t=0;rr=31;b=19;}rects.push({x:i%16*32+l,y:Math.floor(i/16)*20+t,w:rr-l+1,h:b-t+1});}
  for(const e of this.entities.get(room)||[])if(e.alive&&e.active&&[21,26,27,28].includes(e.sprite))rects.push({...objBox(e),entity:e.id});return rects;
 }
 ladders(room){const r=this.data.rooms[room],rects=[];for(let i=0;i<r.tiles.length;i++){const tile=this.data.tiles[r.tiles[i]];if(!tile||!(tile.flags&4))continue;const [l,t,rr,b]=tile.ladder;rects.push({x:i%16*32+l,y:Math.floor(i/16)*20+t,w:rr-l+1,h:b-t+1});}return rects;}
 blocked(p){return this.solids(p.room).some(r=>overlap(body(p),r));}
 safe(p,x,y){const offsets=[[0,0],[28,0],[-28,0],[0,-34],[48,0],[-48,0],[0,-70]];for(const [dx,dy]of offsets){const test={...p,x:clamp(x+dx,10,502),y:clamp(y+dy,PH,HEIGHT)};if(!this.blocked(test)&&!this.players.some(q=>q!==p&&q.active&&!q.dead&&q.room===p.room&&overlap(body(test),body(q))))return {x:test.x,y:test.y};}
  let best=null,distance=Infinity;for(let yy=PH;yy<=HEIGHT;yy+=10)for(let xx=16;xx<WIDTH;xx+=16){const test={...p,x:xx,y:yy},d=(xx-x)**2+(yy-y)**2;if(d<distance&&!this.blocked(test)){best={x:xx,y:yy};distance=d;}}return best||{x:96,y:260};
 }
 regroup(id){const p=this.players[id],q=this.players[1-id];if(!q.active||q.dead)return;this.load(q.room);p.room=q.room;Object.assign(p,this.safe(p,q.x+q.face*32,q.y));p.vx=p.vy=0;p.dead=0;p.health=100;p.invulnerable=2;p.support=null;p.climbing=false;p.teleport=1;p.checkpoint={room:p.room,x:p.x,y:p.y};this.visited.add(p.room);this.event('teleport',p);}
 damage(p,amount){if(p.dead||p.invulnerable||p.shield)return;p.health=Math.max(0,p.health-amount);p.invulnerable=1.1;p.hurt=.25;this.event('hit',p,{player:p.id});if(!p.health){p.dead=1.1;p.vx=p.vy=0;p.support=null;this.event('death',p,{player:p.id});}}
 respawn(p){const cp=p.checkpoint;this.load(cp.room);p.room=cp.room;Object.assign(p,this.safe(p,cp.x,cp.y));p.health=100;p.dead=0;p.vx=p.vy=0;p.invulnerable=2;p.teleport=1;p.support=null;p.climbing=false;this.event('respawn',p,{player:p.id});}
 moveX(p,dx){p.x+=dx;for(const r of this.solids(p.room))if(overlap(body(p),r)){if(dx>0)p.x=r.x-PW/2;else if(dx<0)p.x=r.x+r.w+PW/2;p.vx=0;}}
 moveY(p,dy){p.y+=dy;for(const r of this.solids(p.room))if(overlap(body(p),r)){if(dy>0){p.y=r.y;p.ground=true;p.support=r.entity===undefined?null:`e${r.entity}`;}else if(dy<0){p.y=r.y+r.h+p.h;p.climbing=false;}p.vy=0;}}
 transition(p){let side=-1;if(p.x>WIDTH)side=2;else if(p.x<0)side=3;else if(p.y-p.h<-12)side=0;else if(p.y>HEIGHT+8)side=1;if(side<0)return;
  const dest=this.data.rooms[p.room].links[side];if(dest===null||!this.data.rooms[dest]){if(side===2)p.x=WIDTH;else if(side===3)p.x=0;else if(side===0){p.y=p.h-12;p.vy=0;}else{p.shield=0;p.invulnerable=0;this.damage(p,100);}return;}
  if(dest>=199){p.shield=0;p.invulnerable=0;this.damage(p,100);return;}
  p.room=dest;this.load(dest);if(side===2)p.x=5;else if(side===3)p.x=WIDTH-5;else if(side===0)p.y=HEIGHT-2;else p.y=p.h+2;p.support=null;p.teleport=.4;
  if(this.blocked(p))Object.assign(p,this.safe(p,p.x,p.y));p.checkpoint={room:p.room,x:p.x,y:p.y};this.visited.add(dest);this.event('room',p,{player:p.id});
 }
 playerStep(p,input,dt){
  p.jumped=false;if(!p.active)return;if(p.dead){p.dead-=dt;if(p.dead<=0)this.respawn(p);return;}
  p.invulnerable=Math.max(0,p.invulnerable-dt);p.hurt=Math.max(0,p.hurt-dt);p.shield=Math.max(0,p.shield-dt);p.shot=Math.max(0,p.shot-dt);p.teleport=Math.max(0,p.teleport-dt);
  if(input.regroup&&!p.regroupHeld)this.regroup(p.id);p.regroupHeld=input.regroup;
  p.jumpBuffer=input.jump&&!p.jumpHeld?.12:Math.max(0,p.jumpBuffer-dt);p.jumpHeld=input.jump;p.coyote=p.ground?.09:Math.max(0,p.coyote-dt);
  const ladder=this.ladders(p.room).find(r=>overlap({...body(p),x:p.x-4,w:8,h:p.h+3},r));
  if(ladder&&Math.abs(input.y)>.3){p.climbing=true;p.support=null;}
  if(!ladder)p.climbing=false;
  const duck=input.y>.4&&p.ground&&!ladder;if(!duck&&p.h<PH){const test={...p,h:PH};if(!this.blocked(test)&&!this.players.some(q=>q!==p&&q.active&&q.room===p.room&&!q.dead&&overlap(body(test),body(q))))p.h=PH;}else if(duck)p.h=20;p.duck=p.h<PH;
  if(input.x>.1)p.face=1;else if(input.x<-.1)p.face=-1;
  const target=clamp(input.x,-1,1)*(p.duck?65:130);p.vx+=(target-p.vx)*Math.min(1,dt*18);
  if(p.jumpBuffer&&(p.coyote||p.climbing||p.support!==null)){p.vy=-(this.upgrades.jump?420:310);if(typeof p.support==='number')p.vy+=Math.min(0,this.players[p.support].vy);p.ground=false;p.support=null;p.climbing=false;p.coyote=0;p.jumpBuffer=0;p.jumped=true;this.event('jump',p,{player:p.id});}
  if(p.climbing){p.vy=clamp(input.y,-1,1)*95;if(Math.abs(input.x)<.15)p.x+=(ladder.x+ladder.w/2-p.x)*.3;}else p.vy=Math.min(450,p.vy+820*dt);
  p.ground=false;p.support=null;this.moveX(p,p.vx*dt);this.moveY(p,p.vy*dt);
  if(input.fire&&!p.shot){p.shot=this.upgrades.rapid?.15:.27;this.fire(p);}
 }
 resolvePlayers(before){const [a,b]=this.players;if(!a.active||!b.active||a.dead||b.dead||a.room!==b.room)return;
  for(const [top,base]of [[a,b],[b,a]]){const oldTop=before[top.id],oldBase=before[base.id];if(oldTop.room!==top.room||oldBase.room!==base.room)continue;
   const horizontal=Math.abs(top.x-base.x)<HEAD_WIDTH-2,wasAbove=oldTop.y<=oldBase.y-oldBase.h+3,landed=top.y>=base.y-base.h-1,relative=top.vy-base.vy;
   if(horizontal&&wasAbove&&landed&&relative>=-1&&!top.climbing){const test={...top,y:base.y-base.h};if(!this.blocked(test)){top.y=test.y;top.vy=Math.min(0,base.vy);top.ground=true;top.support=base.id;if(oldTop.support!==base.id)this.event('land',top,{player:top.id});return;}}
  }
  if(!overlap(body(a),body(b)))return;
  const direction=a.x<=b.x?-1:1,penetration=PW-Math.abs(a.x-b.x),oldA=a.x,oldB=b.x;this.moveX(a,direction*penetration/2);this.moveX(b,-direction*penetration/2);
  if(overlap(body(a),body(b))){if(Math.abs(a.x-oldA)<penetration/2-.01)this.moveX(b,-direction*(PW-Math.abs(a.x-b.x)));else this.moveX(a,direction*(PW-Math.abs(a.x-b.x)));}a.vx=b.vx=(a.vx+b.vx)/2;
 }
 carryPlayers(before){for(const p of this.players){const old=before[p.id];if(typeof old.support!=='number'||!p.active||p.dead||p.room!==old.room||p.jumped)continue;const base=this.players[old.support],wasBase=before[old.support];if(base.dead||base.room!==p.room||Math.abs(old.x-wasBase.x)>HEAD_WIDTH)continue;
   const dx=base.x-wasBase.x;this.moveX(p,dx);const target=base.y-base.h;if(Math.abs(p.x-base.x)<HEAD_WIDTH-2&&p.y>=target-6){const test={...p,y:target};if(!this.blocked(test)){p.y=target;p.vy=Math.min(0,base.vy);p.ground=true;p.support=base.id;}}
  }}
 fire(p){const angles=this.upgrades.rapid?[-.14,0,.14]:[0];for(const angle of angles)this.bullets.push({id:this.nextBullet++,room:p.room,x:p.x+p.face*13,y:p.y-(p.duck?9:18),vx:p.face*Math.cos(angle)*370,vy:Math.sin(angle)*370,life:1.5,enemy:false,power:this.upgrades.power?2:1,guided:this.upgrades.guided});this.event('shoot',p,{player:p.id});}
 enemyFire(e,target){const dx=target.x-e.x,dy=target.y-target.h/2-e.y,len=Math.hypot(dx,dy)||1,speed=e.sprite===23?170:130;this.bullets.push({id:this.nextBullet++,room:e.room,x:e.x,y:e.y,vx:dx/len*speed,vy:dy/len*speed,life:4,enemy:true,power:1,guided:false});}
 updateEntities(dt,activeRooms){for(const room of activeRooms){for(const e of this.entities.get(room)||[]){e.oldX=e.x;e.oldY=e.y;if(!e.alive)continue;
   if(e.sprite===21){const horizontal=e.behavior===15||e.behavior===16,origin=horizontal?e.originX:e.originY,goal=e.args[2]||origin-80,t=(1-Math.cos(this.time*.9+e.phase))*.5;if(horizontal)e.x=origin+(goal-origin)*t;else e.y=origin+(goal-origin)*t;}
   if([26,27,28].includes(e.sprite))e.active=(this.time+e.phase+(e.args[2]||0)/20)%4<3;
   if(!e.enemy)continue;const targets=this.players.filter(p=>p.active&&!p.dead&&p.room===room);if(!targets.length)continue;const target=targets.reduce((a,b)=>Math.abs(a.x-e.x)<Math.abs(b.x-e.x)?a:b);
   e.cooldown-=dt;
   if([22,48,49,24].includes(e.sprite)){const lo=e.args[2]&&e.args[3]?Math.min(e.args[2],e.args[3]):e.originX-70,hi=e.args[2]&&e.args[3]?Math.max(e.args[2],e.args[3]):e.originX+70;e.x+=e.dir*(e.sprite===48?55:30)*dt;if(e.x<lo||e.x>hi){e.x=clamp(e.x,lo,hi);e.dir*=-1;}}
   if(e.sprite===52){e.x=e.originX+Math.sin(this.time*.8+e.phase)*70;e.y=clamp(e.originY+Math.sin(this.time*1.3+e.phase)*25,35,285);}
   if(e.sprite===31){e.x+=e.dir*95*dt;if(e.x<-40)e.x=550;if(e.x>550)e.x=-40;}
   if(e.sprite===23)e.y=e.originY+(1-Math.cos(this.time*.7))*.5*Math.max(0,e.args[3]-e.originY);
   if(![22,48,49,31].includes(e.sprite)&&e.cooldown<=0){this.enemyFire(e,target);e.cooldown=e.sprite===23?.75:e.sprite===24?1.2:1.8;}
  }}
 }
 interactions(p,input){if(!p.active||p.dead)return;
  for(const e of this.entities.get(p.room)||[]){if(!e.alive)continue;const rect=objBox(e);if(!overlap(body(p),rect))continue;
   if(e.enemy){this.damage(p,20);continue;}
   if(e.sprite>=35&&e.sprite<=39){const upgrade={35:'power',36:'jump',37:'rapid',38:'guided'}[e.sprite];if(upgrade)this.upgrades[upgrade]=true;else for(const q of this.players)q.shield=20;e.alive=false;this.score+=250;this.event('upgrade',p,{sprite:e.sprite});}
   if(e.sprite===54||e.sprite===55){p.health=Math.min(100,p.health+(e.sprite===54?25:60));e.alive=false;this.event('energy',p);}
   if(e.sprite===57&&p.vy>=0){p.vy=-490;p.ground=false;p.support=null;this.event('spring',p);}
   if(e.sprite===58&&!e.activated){e.activated=true;for(const q of this.players)if(q.active&&q.room===p.room)q.checkpoint={room:q.room,x:q.x,y:q.y};p.health=100;this.event('checkpoint',p);}
   if(e.sprite===41&&input.y<-.3&&!p.teleport){if(e.args[4]===999){this.phase='won';this.event('win',p);return;}Object.assign(p,this.safe(p,e.args[4],e.args[5]+PH/2));p.vx=p.vy=0;p.teleport=1;p.support=null;p.climbing=false;this.event('teleport',p);}
  }
 }
 updateBullets(dt){for(const b of this.bullets){b.life-=dt;if(b.life<=0)continue;
   if(b.guided&&!b.enemy){const targets=(this.entities.get(b.room)||[]).filter(e=>e.alive&&e.enemy);if(targets.length){const e=targets.reduce((a,e)=>Math.hypot(a.x-b.x,a.y-b.y)<Math.hypot(e.x-b.x,e.y-b.y)?a:e),dx=e.x-b.x,dy=e.y-b.y,len=Math.hypot(dx,dy)||1;b.vx+=(dx/len*340-b.vx)*dt*4;b.vy+=(dy/len*340-b.vy)*dt*4;}}
   for(let n=0;n<3&&b.life>0;n++){b.x+=b.vx*dt/3;b.y+=b.vy*dt/3;const hit={x:b.x-2,y:b.y-2,w:4,h:4};if(this.solids(b.room).some(r=>overlap(hit,r))){b.life=0;break;}
    if(b.enemy){for(const p of this.players)if(p.active&&!p.dead&&p.room===b.room&&overlap(body(p),hit)){this.damage(p,12);b.life=0;break;}}
    else for(const e of this.entities.get(b.room)||[])if(e.alive&&e.enemy&&overlap(objBox(e),hit)){e.health-=b.power;b.life=0;this.event('spark',e);if(e.health<=0){e.alive=false;this.score+=e.sprite===23||e.behavior===26?1500:100;this.event('explosion',e,{sprite:e.sprite});}break;}
   }
  }this.bullets=this.bullets.filter(b=>b.life>0&&b.x>-40&&b.x<552&&b.y>-40&&b.y<360).slice(-180);
 }
 step(dt=STEP){this.time+=dt;if(this.phase!=='playing')return;const before=this.players.map(p=>({...p})),rooms=[...new Set(this.players.filter(p=>p.active).map(p=>p.room))];for(const r of rooms)this.load(r);this.updateEntities(dt,rooms);
  for(const p of this.players){if(typeof p.support==='string'){const e=(this.entities.get(p.room)||[]).find(e=>'e'+e.id===p.support);if(e?.active){this.moveX(p,e.x-e.oldX);this.moveY(p,e.y-e.oldY);}}this.playerStep(p,this.inputs[p.id]||emptyInput(),dt);}
  this.carryPlayers(before);this.resolvePlayers(before);for(const p of this.players)if(p.active&&!p.dead){this.transition(p);this.interactions(p,this.inputs[p.id]||emptyInput());}this.updateBullets(dt);
 }
 snapshot(){const rooms=new Set(this.players.filter(p=>p.active).map(p=>p.room));return {run:this.run,time:this.time,phase:this.phase,score:this.score,visited:[...this.visited],upgrades:{...this.upgrades},players:this.players.map(p=>({...p,checkpoint:{...p.checkpoint}})),entities:[...rooms].flatMap(r=>(this.entities.get(r)||[]).filter(e=>e.alive).map(({id,room,x,y,w,h,sprite,dir,active,health,enemy,activated})=>({id,room,x,y,w,h,sprite,dir,active,health,enemy,activated}))),bullets:this.bullets.filter(b=>rooms.has(b.room)).map(b=>({...b})),events:this.events.filter(e=>this.time-e.time<3)};}
}
