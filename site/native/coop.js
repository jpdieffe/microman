export class NativeCoop {
 constructor(wine){
  this.wine=wine;this.e=wine.instance.exports;this.d=new DataView(wine.memory.buffer);this.bytes=new Uint8Array(wine.memory.buffer);
  if(![0x56,0xff,0xd1,0x83,0xc4,0x04].every((byte,i)=>this.bytes[this.a(0x4140b5)+i]===byte))throw Error('This multiplayer patch requires the original MicroMan v2.0 executable.');
  this.enabled=false;this.remote={};this.pending=null;this.p2=0;this.frames=0;this.hits=0;this.support=[false,false];
  this.globals=[0x42fb40,...Array.from({length:10},(_,i)=>0x42e0f0+i*4),0x42e12c,0x42e130,0x42fa64,0x42fa68];
  this.guestGlobals=null;
  const e=this.e,self=this;
  wine.instance={exports:{...e,run(n){
   const result=e.run(n);
   if(e.get_last_run_halt()===5&&e.get_eip()===0x4140b5)self.beforeCallback();
   return result;
  }}};
  e.set_bp(0x4140b5);
 }
 a(v){return v-0x400000+0x12000;}
 u(v){return this.d.getUint32(this.a(v),true);}
 s(v){return this.d.getInt16(this.a(v),true);}
 w(v,n){this.d.setUint32(this.a(v),n,true);}
 h(v,n){this.d.setInt16(this.a(v),n,true);}
 state(p){return {p,x:this.s(p+4),y:this.s(p+6),state:this.s(p+0x70),hp:this.s(p+0x50),callback:this.u(p+0xa2)};}
 spawn(engine,host){
  const capacity=this.s(engine+0x8fe4),pool=this.u(engine+0x9008),playerPool=this.u(engine+0x900c);
  if(this.s(engine+0x8fe6)===1){
   const slot=pool+(capacity-1)*250;
   if(slot+250!==playerPool||this.s(slot)!==9999)return;
   this.h(engine+0x8fe4,capacity-1);this.h(engine+0x8fe6,2);this.w(engine+0x900c,slot);this.h(host,1);
  }
  const first=this.u(engine+0x900c),slot=host===first?first+250:first;
  if(this.s(slot)!==9999&&slot!==this.p2)return;
  this.bytes.copyWithin(this.a(slot),this.a(host),this.a(host)+250);
  this.p2=slot;this.h(slot,slot===first?0:1);
  this.h(slot+6,this.s(host+6)-36);this.h(slot+0x70,5);this.h(slot+0x8a,0);
  this.h(slot+0xba,9999);this.h(slot+0xd6,9999);this.h(slot+0xea,9999);
  this.h(engine+0x8ff6,this.s(engine+0x8ff6)+1);this.h(engine+0x9002,this.s(engine+0x9002)+1);
  this.guestGlobals=this.globals.map(v=>this.u(v));
  this.guestGlobals[0]=slot;
  this.room=this.s(engine+0x51d2);
 }
 restore(){
  if(this.saved){this.guestGlobals=this.globals.map(v=>this.u(v));this.globals.forEach((v,i)=>this.w(v,this.saved[i]));this.saved=null;}
 }
 reset(){
  this.restore();
  if(this.p2&&this.s(this.p2)!==9999){const engine=this.u(0x42fb2c);this.h(this.p2,9999);this.h(engine+0x8ff6,this.s(engine+0x8ff6)-1);this.h(engine+0x9002,this.s(engine+0x9002)-1);}
  this.p2=0;this.pending=null;this.support=[false,false];
 }
 beforeCallback(){
  this.hits++;
  this.restore();
  if(this.pending){this.finishPlayer(this.pending);this.pending=null;}
  const engine=this.u(0x42fb2c),host=this.u(0x42fb40),p=this.e.get_esi();
  if(!engine||!host)return;
  if(p===host){
   this.frames++;
   if(this.enabled&&this.s(host+0x70)!==1&&(!this.p2||this.s(this.p2)===9999))this.spawn(engine,host);
   if(!this.enabled&&this.p2&&this.s(this.p2)!==9999){
    this.h(this.p2,9999);this.h(engine+0x8ff6,this.s(engine+0x8ff6)-1);this.h(engine+0x9002,this.s(engine+0x9002)-1);this.p2=0;
   }
  }
  if(p===host||p===this.p2){
   const which=p===host?0:1;
   if(which===1){
    this.saved=this.globals.map(v=>this.u(v));
    this.globals.forEach((v,i)=>this.w(v,this.guestGlobals[i]));this.w(0x42fb40,p);
    const r=this.remote;
    [r.x<0,r.x>0,r.y<0,r.y>0,r.jump,r.fire].forEach((v,i)=>this.w(0x42e0f0+i*4,v?0x8000:0));
    if(!r.jump)this.w(0x42e108,0);if(!r.fire)this.w(0x42e10c,0);
    if(this.u(0x42e108))this.w(0x42e100,0);if(this.u(0x42e10c))this.w(0x42e104,0);
   }
   if(this.support[which]&&[2,3,5].includes(this.s(p+0x70))){this.h(p+0x70,2);this.h(p+0x8a,0);}
   this.pending={which,p,before:this.state(p),other:which?host:this.p2};
  }
 }
 finishPlayer({which,p,before,other}){
  if(!this.enabled||!other||this.s(p)===9999||this.s(other)===9999)return;
  const engine=this.u(0x42fb2c),room=this.s(engine+0x51d2);
  if(room!==this.room){
   this.room=room;this.h(other+4,this.s(p+4));this.h(other+6,Math.max(18,this.s(p+6)-36));this.h(other+0x70,5);this.h(other+0x8a,0);this.h(other+0xba,9999);this.support=[false,false];return;
  }
  const me=this.state(p),friend=this.state(other),half=(this.s(p+0x12)+this.s(other+0x12))/2;
  const overlap=Math.abs(me.x-friend.x)<14;
  const wasAbove=before.y<=friend.y-half+8;
  if(overlap&&wasAbove&&me.y>=friend.y-half-1&&me.y>=before.y&&[2,3,5].includes(me.state)){
   this.h(p+6,friend.y-half-1);this.h(p+0x70,2);this.h(p+0x8a,0);this.h(p+0x82,0);this.support[which]=true;
  }else this.support[which]=overlap&&Math.abs(me.y-(friend.y-half-1))<=2&&[2,3,5].includes(me.state);
 }
 inspect(){const engine=this.u(0x42fb2c),host=this.saved?this.saved[0]:this.u(0x42fb40);return {frames:this.frames,hits:this.hits,room:engine&&this.s(engine+0x51d2),host:host&&this.state(host),guest:this.p2&&this.state(this.p2),support:this.support,pending:this.pending?.which};}
}
