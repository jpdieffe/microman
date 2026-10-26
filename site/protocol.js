export const PROTOCOL='microman-original-v2',ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function parseCode(value){const s=String(value||'').trim().toUpperCase();return s.length===2&&[...s].every(c=>ALPHABET.includes(c))?s:null;}
export function newCode(){const a=new Uint8Array(2);crypto.getRandomValues(a);return [...a].map(v=>ALPHABET[v%ALPHABET.length]).join('');}
const finite=(n,limit=1e7)=>Number.isFinite(n)&&Math.abs(n)<=limit;
export function validNativeState(s){return s&&Number.isInteger(s.room)&&s.room>=0&&s.room<=256&&typeof s.paused==='boolean'&&[s.host,s.guest].every(p=>p===null||p===0||p&&[p.x,p.y,p.hp,p.state].every(n=>finite(n,65536)));}
export const validInput=d=>d?.type==='input'&&Number.isSafeInteger(d.seq)&&d.seq>=0&&finite(d.x,1)&&finite(d.y,1)&&['jump','fire','regroup'].every(k=>typeof d[k]==='boolean');
