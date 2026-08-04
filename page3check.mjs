// 2페이지까지 읽는 지금, 3페이지에 남은 최근 공고가 있는지
import fs from 'node:fs/promises';
const UA={'User-Agent':'Mozilla/5.0 (compatible; GbEduJob/1.0)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
async function list(url){
  for(let a=0;a<2;a++){
    try{
      const html=await (await fetch(url,{headers:UA,signal:AbortSignal.timeout(25000)})).text();
      const rows=[];
      for(const tr of html.split(/<tr[ >]/).slice(1)){
        const m=tr.match(/<a[^>]*data-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/); if(!m) continue;
        const tds=[...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x=>strip(x[1]));
        const d=tds.find(x=>/^\d{4}[.\-]\d{2}[.\-]\d{2}$/.test(x));
        if(d) rows.push({id:m[1], t:strip(m[2]), d:d.replace(/\./g,'-')});
      }
      return [...new Map(rows.map(r=>[r.id,r])).values()];
    }catch(e){ if(a) return null; await sleep(1200); }
  }
}
const boards=JSON.parse(await fs.readFile('boards.json','utf8'));
const WEEK='2026-07-27';
let miss=0; const hits=[]; let fail=0;
for(const b of boards){
  const base=`https://www.gbe.kr/${b.sysid}/na/ntt/selectNttList.do?mi=${b.mi}&bbsId=${b.bbsId}`;
  const p1=await list(base); await sleep(120);
  if(!p1){ fail++; continue; }
  if(!p1.length) continue;
  const p2=await list(base+'&currPage=2'); await sleep(120);
  const p3=await list(base+'&currPage=3'); await sleep(120);
  if(!p3) continue;
  const have=new Set([...(p1||[]),...(p2||[])].map(x=>x.id));
  const missed=p3.filter(x=>!have.has(x.id) && x.d>=WEEK);
  if(missed.length){ miss+=missed.length;
    hits.push(`${missed.length}건  ${b.org}/${b.label}  예: [${missed[0].d}] ${missed[0].t.slice(0,34)}`); }
}
console.log(`2페이지까지 읽는 지금, 3페이지에만 있는 최근 1주일 공고: ${miss}건`);
if(hits.length) hits.forEach(h=>console.log('  '+h));
else console.log('  → 없음. 2페이지로 최근 1주일이 모두 담긴다');
if(fail) console.log(`(조회 실패 게시판 ${fail}개는 판정에서 제외)`);
