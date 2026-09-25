// render.html을 Playwright로 한 프레임씩 그려서 MP4로 만듭니다. (node build.mjs --hi 먼저)
// node video.mjs            → 전체 2분
// node video.mjs 56 70      → 56초~70초 구간만 미리보기(preview.mp4)
import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright'); import { spawn } from 'child_process';
const FPS = 30, DUR = 120;
const [a, b] = process.argv.slice(2).map(Number);
const PREVIEW = !isNaN(a), T0 = PREVIEW ? a : 0, T1 = PREVIEW ? (b || a + 10) : DUR;
const OUT = PREVIEW ? 'preview.mp4' : 'gwangpyeong-music-promo-v2.mp4';
const F = process.cwd() + '/node_modules/ffmpeg-static/ffmpeg';
const ff = spawn(F, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-ss', String(T0), '-t', String(T1 - T0), '-i', 'bgm.wav',
  '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'slow', '-crf', PREVIEW ? '23' : '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto('file://' + process.cwd() + '/render.html'); await p.evaluate(() => window.__ready);
const n0 = Math.round(T0 * FPS), n1 = Math.round(T1 * FPS);
for (let f = n0; f < n1; f++) {
  const d = await p.evaluate(t => { window.__render(t); return document.getElementById('cv').toDataURL('image/jpeg', .93) }, f / FPS);
  if (!ff.stdin.write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 300 === 0) console.log('frame', f, '/', n1);
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await br.close(); console.log('done', OUT);
