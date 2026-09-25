// src.html에 폰트 서브셋·BGM·비트 이벤트·사진을 넣어서 단일 HTML로 빌드합니다.
// node build.mjs        → gwangpyeong-music-promo-v2.html (웹 재생용, 사진 1152px)
// node build.mjs --hi   → render.html (영상 렌더용, 사진 원본 1920px)
import fs from 'fs'; import { execFileSync } from 'child_process';
const HI = process.argv.includes('--hi');
const FF = 'node_modules/ffmpeg-static/ffmpeg';
const src = fs.readFileSync('src.html', 'utf8');
const cfg = fs.readFileSync('config.js', 'utf8');
const chars = [...new Set([...src + cfg].filter(c => c.charCodeAt(0) > 31))].join('');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const fams = ['Black+Han+Sans', 'Anton', 'DM+Mono:wght@400;500', 'Noto+Sans+KR:wght@500;700;900'];
let css = '';
for (const f of fams) {
  const url = `https://fonts.googleapis.com/css2?family=${f}&text=${encodeURIComponent(chars)}&display=block`;
  let c = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  for (const m of [...c.matchAll(/url\((https:[^)]+)\)/g)]) {
    const b = Buffer.from(await (await fetch(m[1])).arrayBuffer());
    c = c.replace(m[1], `data:font/woff2;base64,${b.toString('base64')}`);
  }
  css += c.replace(/\/\*.*?\*\//g, '');
}
if (!fs.existsSync('bgm.mp3') || fs.statSync('bgm.mp3').mtimeMs < fs.statSync('bgm.wav').mtimeMs)
  execFileSync(FF, ['-y', '-loglevel', 'error', '-i', 'bgm.wav', '-codec:a', 'libmp3lame', '-b:a', '192k', 'bgm.mp3']);
const mp3 = fs.readFileSync('bgm.mp3').toString('base64');
const ev = fs.readFileSync('events.json', 'utf8');

// 사진: ../photos/*.jpg → 웹용은 1152px로 줄여서 넣기
const dir = '../photos', photos = {};
fs.mkdirSync('.web', { recursive: true });
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort()) {
  const key = f.replace(/\.jpg$/, '');
  let p = `${dir}/${f}`;
  if (!HI) {
    const o = `.web/${f}`;
    if (!fs.existsSync(o)) execFileSync(FF, ['-y', '-loglevel', 'error', '-i', p, '-vf', "scale='min(1152,iw)':-2", '-q:v', '5', o]);
    p = o;
  }
  photos[key] = 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64');
}
const out = src.replace('/*FONTS*/', () => css).replace('/*CONFIG*/', () => cfg)
  .replace('/*EVENTS*/null', () => ev).replace('/*AUDIO*/', () => mp3)
  .replace('/*PHOTOS*/{}', () => JSON.stringify(photos));
const name = HI ? 'render.html' : 'gwangpyeong-music-promo-v2.html';
fs.writeFileSync(name, out);
console.log(name, (out.length / 1048576).toFixed(1) + 'MB', 'photos', Object.keys(photos).length, 'faces', (css.match(/@font-face/g) || []).length);
