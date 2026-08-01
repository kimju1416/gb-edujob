import { GB, findBoards } from './discover.mjs';
import fs from 'node:fs/promises';
const UA={'User-Agent':'Mozilla/5.0 (compatible; JobRadar/0.1)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const POOL = /인력풀|인력뱅크|지원신청|지원 요청|자료실|한눈에|구직/;   // 구직자 등록·안내 게시판은 제외

async function listBoard(url){
  const html = await (await fetch(url,{headers:UA,signal:AbortSignal.timeout(20000)})).text();
  const rows=[];
  for (const tr of html.split(/<tr[ >]/).slice(1)) {
    const a = tr.match(/<a[^>]*data-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>strip(m[1]));
    const date = tds.find(x=>/^\d{4}[.\-]\d{2}[.\-]\d{2}$/.test(x));
    const title = strip(a[2]);
    if (title && date) rows.push({ id:a[1], title, date: date.replace(/\./g,'-') });
  }
  return [...new Map(rows.map(r=>[r.id,r])).values()];
}

const all=[]; const boardStat=[];
for (const [sysid,name] of Object.entries(GB)) {
  const boards = (await findBoards(sysid)).filter(b=>!POOL.test(b.label));
  const seen=new Set();
  for (const b of boards) {
    if (seen.has(b.bbsId)) continue; seen.add(b.bbsId);
    try{
      const rows = await listBoard(b.url);
      boardStat.push({ org:name, label:b.label, n:rows.length, mi:b.mi, bbsId:b.bbsId });
      for (const r of rows) all.push({ ...r, org:name, sysid, board:b.label,
        url:`https://www.gbe.kr/${sysid}/na/ntt/selectNttInfo.do?mi=${b.mi}&bbsId=${b.bbsId}&nttSn=${r.id}` });
    }catch(e){ boardStat.push({ org:name, label:b.label, n:-1 }); }
    await sleep(250);
  }
  process.stderr.write('.');
}
console.error('');
const uniq=[...new Map(all.map(r=>[r.url,r])).values()];
await fs.writeFile('jobs-raw.json', JSON.stringify({ boards:boardStat, items:uniq }, null, 2));

console.log(`게시판 ${boardStat.length}개 / 수집 공고 ${uniq.length}건 (각 1페이지)\n`);
const byDate={}; for(const r of uniq) byDate[r.date]=(byDate[r.date]||0)+1;
const days=Object.keys(byDate).sort().reverse();
console.log('최근 날짜별 공고 수:');
for(const d of days.slice(0,7)) console.log(`  ${d}  ${'█'.repeat(Math.min(40,byDate[d]))} ${byDate[d]}건`);
console.log('\n빈 게시판(0건):', boardStat.filter(b=>b.n===0).length, '개 / 오류:', boardStat.filter(b=>b.n===-1).length, '개');
