export async function prepareOriginal(){
 if(crossOriginIsolated)return;
 if(!navigator.serviceWorker)throw Error('Open this game in Chrome or Safari over HTTPS.');
 await navigator.serviceWorker.register('./isolate-sw.js');
 await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Browser setup timed out. Reload to try again.')),15000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(t);resolve();},{once:true});});
 const reloadKey='microman-isolation-reload';
 if(sessionStorage.getItem(reloadKey)===location.href){sessionStorage.removeItem(reloadKey);throw Error('This browser could not prepare the original game. Open it in a regular Chrome or Safari tab.');}
 sessionStorage.setItem(reloadKey,location.href);location.reload();
 await new Promise(()=>{});
}
