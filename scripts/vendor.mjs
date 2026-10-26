import {copyFile,mkdir} from 'node:fs/promises';
await mkdir('site/vendor',{recursive:true});
await copyFile('node_modules/peerjs/dist/peerjs.min.js','site/vendor/peerjs.min.js');
await copyFile('node_modules/peerjs/LICENSE','site/vendor/peerjs-LICENSE.txt');
