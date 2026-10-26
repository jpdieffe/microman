export const PROTOCOL='microman-coop-v1',ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function parseCode(value){const s=String(value||'').trim().toUpperCase();return s.length===2&&[...s].every(c=>ALPHABET.includes(c))?s:null;}
export function newCode(){const a=new Uint8Array(2);crypto.getRandomValues(a);return [...a].map(v=>ALPHABET[v%ALPHABET.length]).join('');}
const finite=(n,limit=1e7)=>Number.isFinite(n)&&Math.abs(n)<=limit;
export const validInput=d=>d?.type==='input'&&Number.isSafeInteger(d.seq)&&d.seq>=0&&finite(d.x,1)&&finite(d.y,1)&&['jump','fire','regroup'].every(k=>typeof d[k]==='boolean');
export function validState(s){return s&&Number.isSafeInteger(s.run)&&finite(s.time)&&['playing','won'].includes(s.phase)&&finite(s.score)&&Array.isArray(s.visited)&&s.visited.length<=256&&s.visited.every(Number.isInteger)&&s.upgrades&&['power','jump','rapid','guided'].every(k=>typeof s.upgrades[k]==='boolean')
 &&Array.isArray(s.players)&&s.players.length===2&&s.players.every(p=>p&&[p.id,p.room,p.x,p.y,p.vx,p.vy,p.h,p.health,p.dead,p.shield,p.invulnerable].every(n=>finite(n))&&typeof p.active==='boolean')
 &&Array.isArray(s.entities)&&s.entities.length<=100&&s.entities.every(e=>e&&[e.id,e.room,e.x,e.y,e.w,e.h,e.sprite,e.health].every(n=>finite(n)))
 &&Array.isArray(s.bullets)&&s.bullets.length<=180&&s.bullets.every(b=>b&&[b.id,b.room,b.x,b.y,b.vx,b.vy,b.life].every(n=>finite(n)))
 &&Array.isArray(s.events)&&s.events.length<=80&&s.events.every(e=>e&&[e.id,e.room,e.x,e.y,e.time].every(n=>finite(n))&&['jump','land','shoot','hit','death','respawn','room','teleport','upgrade','energy','checkpoint','spring','win','spark','explosion'].includes(e.type));}
