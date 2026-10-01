// 사용: node render.mjs [preview|full]   (playwright-core + 시스템 chromium 필요)
import {chromium} from 'playwright-core';
import http from 'http';import fs from 'fs';import path from 'path';import {spawn} from 'child_process';
const dir=path.dirname(new URL(import.meta.url).pathname);
const mime={'.html':'text/html','.js':'text/javascript','.woff2':'font/woff2','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const srv=http.createServer((q,r)=>{const f=path.join(dir,decodeURIComponent(q.url.split('?')[0]));
  if(!f.startsWith(dir)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)}).listen(0);
const port=srv.address().port;const mode=process.argv[2]||'full';
const exe=process.env.CHROME||fs.readdirSync('/opt/pw-browsers').filter(d=>d.startsWith('chromium-')).map(d=>`/opt/pw-browsers/${d}/chrome-linux/chrome`)[0];
const br=await chromium.launch({executablePath:exe,args:['--no-sandbox','--font-render-hinting=none']});
const pg=await br.newPage({viewport:{width:1920,height:1080}});
pg.on('pageerror',e=>console.error('PAGEERR',e.message));pg.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text())});
await pg.goto(`http://localhost:${port}/index.html?render=1`);await pg.evaluate(()=>window.ready);
const grab=()=>pg.evaluate(()=>document.getElementById('c').toDataURL('image/png').split(',')[1]);
if(mode==='preview'){
  const out=process.argv[3]||'prev';fs.mkdirSync(out,{recursive:true});
  const ts=(process.argv[4]||'0.3,1.8,3,5,7,9,11,13,15,17,19,21,23,25,27,29').split(',').map(Number);
  for(const t of ts){await pg.evaluate(t=>window.renderAt(t),t);fs.writeFileSync(`${out}/t${String(t).replace('.','_')}.png`,Buffer.from(await grab(),'base64'))}
}else{
  const FPS=30,N=30*FPS;const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(FPS),'-i','-','-i','music.wav','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-shortest','-movflags','+faststart','sangmo-promo.mp4'],{cwd:dir,stdio:['pipe','inherit','inherit']});
  for(let i=0;i<N;i++){await pg.evaluate(t=>window.renderAt(t),i/FPS);const buf=Buffer.from(await grab(),'base64');if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%60===0)console.log('frame',i)}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));
}
await br.close();srv.close();
