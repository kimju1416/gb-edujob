import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright'); import { spawn } from 'child_process';
const FPS = 30, N = 900, F = process.cwd() + '/node_modules/ffmpeg-static/ffmpeg';
const ff = spawn(F, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', 'bgm.wav',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', 'gwangpyeong-music-promo.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto('file://' + process.cwd() + '/gwangpyeong-music-promo.html'); await p.evaluate(() => window.__ready);
for (let f = 0; f < N; f++) {
  const d = await p.evaluate(t => { window.__render(t); return document.getElementById('cv').toDataURL('image/jpeg', .95) }, f / FPS);
  if (!ff.stdin.write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log('frame', f);
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done');
