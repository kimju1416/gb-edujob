// 1페이지만 수집해서 놓치는 게 있는지 — 2페이지까지 긁어 비교
import fs from 'node:fs/promises';
const UA={'User-Agent':'Mozilla/5.0 (compatible; GbEduJob/1.0)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
async function list(url){
  const html=await (await fetch(url,{headers:UA,signal:AbortSignal.timeout(25000)})).text();
  const rows=[];
  for(const tr of html.split(/<tr[ >]/).slice(1)){
    const a=tr.match(/<a[^>]*data-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/); if(!a) continue;
    const tds=[...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>strip(m[1]));
    const d=tds.find(x=>/^\d{4}[.\-]\d{2}[.\-]\d{2}$/.test(x));
    if(d) rows.push({id:a[1], t:strip(a[2]), d:d.replace(/\./g,'-')});
  }
  return [...new Map(rows.map(r=>[r.id,r])).values()];
}
const boards=JSON.parse(await fs.readFile('boards.json','utf8'));
const TODAY='2026-08-02', WEEK='2026-07-27';
let p1All=0, p2New=0; const busy=[];
for(const b of boards){
  const base=`https://www.gbe.kr/${b.sysid}/na/ntt/selectNttList.do?mi=${b.mi}&bbsId=${b.bbsId}`;
  try{
    const p1=await list(base);
    if(!p1.length) continue;
    const p2=await list(base+'&currPage=2');
    const ids=new Set(p1.map(x=>x.id));
    // 2페이지에 있는데 1페이지엔 없는 '최근 1주일' 공고 = 놓친 것
    const missed=p2.filter(x=>!ids.has(x.id) && x.d>=WEEK);
    p1All+=p1.length; p2New+=missed.length;
    if(missed.length) busy.push({b:b.org+'/'+b.label, n:missed.length,
      ex:missed.slice(0,2).map(x=>`[${x.d}] ${x.t.slice(0,38)}`)});
  }catch(e){}
  await sleep(150);
}
console.log(`1페이지 수집 ${p1All}건`);
console.log(`2페이지에만 있는 최근 1주일 공고: ${p2New}건  ← 지금 놓치고 있는 양\n`);
if(busy.length){
  console.log('놓치는 게시판:');
  busy.sort((a,b)=>b.n-a.n).forEach(x=>{ console.log(`  ${x.n}건  ${x.b}`); x.ex.forEach(e=>console.log('        '+e)); });
} else console.log('놓치는 공고 없음 — 1페이지로 최근 1주일이 모두 담긴다');
