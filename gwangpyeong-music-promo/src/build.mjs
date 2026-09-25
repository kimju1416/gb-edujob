import fs from 'fs'; import { execFileSync } from 'child_process';
const src = fs.readFileSync('src.html', 'utf8');
const chars = [...new Set([...src].filter(c => c.charCodeAt(0) > 31))].join('');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const fams = ['Black+Han+Sans', 'Anton', 'DM+Mono:wght@400;500', 'Noto+Sans+KR:wght@500;700'];
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
execFileSync('node_modules/ffmpeg-static/ffmpeg', ['-y', '-loglevel', 'error', '-i', 'bgm.wav', '-codec:a', 'libmp3lame', '-b:a', '192k', 'bgm.mp3']);
const mp3 = fs.readFileSync('bgm.mp3').toString('base64');
const ev = fs.readFileSync('events.json', 'utf8');
const out = src.replace('/*FONTS*/', () => css).replace('/*EVENTS*/null', () => ev).replace('/*AUDIO*/', () => mp3);
fs.writeFileSync('gwangpyeong-music-promo.html', out);
console.log('fonts css', (css.length / 1024).toFixed(0) + 'KB', 'html', (out.length / 1024).toFixed(0) + 'KB', 'faces', (css.match(/@font-face/g) || []).length);
