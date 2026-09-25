// node snap.mjs 3 10 14 ... → snaps/t003.0.jpg ... (확인용 스틸)
import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright'); import fs from 'fs';
fs.mkdirSync('snaps', { recursive: true });
const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
await p.goto('file://' + process.cwd() + '/render.html'); await p.evaluate(() => window.__ready);
for (const t of process.argv.slice(2).map(Number)) {
  const d = await p.evaluate(t => { window.__render(t); return document.getElementById('cv').toDataURL('image/jpeg', .8) }, t);
  fs.writeFileSync(`snaps/t${t.toFixed(1).padStart(5, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
}
console.log('errors:', errs.length ? errs : 'none'); await br.close();
