import { GB, findBoards } from './discover.mjs';
import fs from 'node:fs/promises';
const UA={'User-Agent':'Mozilla/5.0 (compatible; JobRadar/0.1)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const POOL = /인력풀|인력뱅크|지원신청|지원 요청|자료실|한눈에|구직/;   // 구직자 등록·안내 게시판은 제외

async function listBoard(url){
  // 재시도는 2회까지, 타임아웃은 25초. 이보다 늘리면 느린 요청 하나가 전체를 붙잡는다
  // (45초×3회로 뒀다가 게시판 수집 한 단계가 36분을 넘겼다).
  let html;
  for (let a=0; a<2; a++){
    try{ html = await (await fetch(url,{headers:UA,signal:AbortSignal.timeout(25000)})).text(); break; }
    catch(e){ if (a===1) throw e; await sleep(1200); }
  }
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

// 게시판 목록: 캐시(boards.json)가 1차 소스.
// 자동 발견은 기관 사이트 23곳을 열어야 해서 해외에서 자주 실패한다(실측: 103개 → 13개).
// 캐시를 먼저 쓰고, 발견에 성공하면 새 게시판만 얹는다.
async function loadBoards(){
  let cached = [];
  try {
    cached = JSON.parse(await fs.readFile('boards.json','utf8'));
    console.error(`게시판 캐시 ${cached.length}개 로드`);
  } catch(e){ console.error('게시판 캐시 없음 — 자동 발견에만 의존한다'); }
  const byOrg = new Map();
  for (const b of cached) {
    if (!byOrg.has(b.sysid)) byOrg.set(b.sysid, new Map());
    byOrg.get(b.sysid).set(b.bbsId, b);
  }
  // 자동 발견은 기관 사이트 23곳을 여는 무거운 작업이다. 캐시가 충분하면 건너뛴다.
  // (매일 돌 필요가 없다 — 게시판이 새로 생기는 일은 드물다. 주 1회 정도 SKIP_DISCOVER 없이 돌리면 된다)
  if (process.env.SKIP_DISCOVER === '1' && cached.length >= 50) {
    console.error('자동 발견 생략 (캐시 사용)');
  } else {
    let added = 0;
    for (const [sysid, name] of Object.entries(GB)) {
      try {
        const found = (await findBoards(sysid)).filter(b=>!POOL.test(b.label));
        if (!byOrg.has(sysid)) byOrg.set(sysid, new Map());
        for (const b of found) if (!byOrg.get(sysid).has(b.bbsId)) {
          byOrg.get(sysid).set(b.bbsId, { sysid, org:name, mi:b.mi, bbsId:b.bbsId, label:b.label });
          added++;
        }
      } catch(e){ /* 발견 실패는 캐시로 메운다 */ }
    }
    if (added) console.error(`자동 발견으로 새 게시판 ${added}개 추가`);
  }
  return [...byOrg.entries()].map(([sysid, m]) => [sysid, [...m.values()]]);
}

// 게시판을 평탄화해 동시 4개씩 처리한다.
// 순차 처리는 해외에서 한 요청이 느려지면 전체가 밀린다(실측: 게시판 수집 한 단계가 36분 초과).
const targets = [];
for (const [sysid, boards] of await loadBoards()) {
  const seen = new Set();
  for (const b0 of boards) {
    if (seen.has(b0.bbsId)) continue; seen.add(b0.bbsId);
    targets.push({ ...b0, sysid, org: GB[sysid] || sysid,
      url:`https://www.gbe.kr/${sysid}/na/ntt/selectNttList.do?mi=${b0.mi}&bbsId=${b0.bbsId}` });
  }
}
console.error(`게시판 ${targets.length}개 수집 시작 (동시 4)`);

const all=[]; const boardStat=[];
const CONC = 4;
let cursor = 0;
async function worker(){
  while (cursor < targets.length) {
    const b = targets[cursor++];
    try{
      const rows = await listBoard(b.url);
      boardStat.push({ org:b.org, label:b.label, n:rows.length, mi:b.mi, bbsId:b.bbsId });
      for (const r of rows) all.push({ ...r, org:b.org, sysid:b.sysid, board:b.label,
        url:`https://www.gbe.kr/${b.sysid}/na/ntt/selectNttInfo.do?mi=${b.mi}&bbsId=${b.bbsId}&nttSn=${r.id}` });
    }catch(e){ boardStat.push({ org:b.org, label:b.label, n:-1 }); }
    process.stderr.write('.');
    await sleep(120);
  }
}
await Promise.all(Array.from({length:CONC}, worker));
console.error('');
const uniq=[...new Map(all.map(r=>[r.url,r])).values()];
await fs.writeFile('jobs-raw.json', JSON.stringify({ boards:boardStat, items:uniq }, null, 2));

console.log(`게시판 ${boardStat.length}개 / 수집 공고 ${uniq.length}건 (각 1페이지)\n`);
const byDate={}; for(const r of uniq) byDate[r.date]=(byDate[r.date]||0)+1;
const days=Object.keys(byDate).sort().reverse();
console.log('최근 날짜별 공고 수:');
for(const d of days.slice(0,7)) console.log(`  ${d}  ${'█'.repeat(Math.min(40,byDate[d]))} ${byDate[d]}건`);
console.log('\n빈 게시판(0건):', boardStat.filter(b=>b.n===0).length, '개 / 오류:', boardStat.filter(b=>b.n===-1).length, '개');
