import fs from 'node:fs/promises';
const UA={'User-Agent':'Mozilla/5.0 (compatible; GbJobBoard/0.1)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const flat=s=>s.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ')
  .replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
  .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();

// 본문에서 '접수 마감일'을 뽑는다. 주의할 함정 세 가지:
//  ① 물결표가 전각(～〜∼)이나 하이픈일 수 있다  ② '계약/근무 기간'의 종료일을 접수 마감으로 오인하면 안 된다
//  ③ 원문에 연도 오타가 있다(2026.7.20~2025.7.31 같은 사례 실재)
const TIL = '[~～〜∼\\-–—]';
function pickDeadline(body, regDate){
  // '접수기간' 문구 이후 80자 안에서만 찾되, 계약/근무 기간 문구가 나오면 거기서 끊는다
  const seg = body.match(new RegExp(`(?:원서\\s?접수|접수\\s?기간|접수\\s?일시|제출\\s?기간|응시\\s?원서)[\\s\\S]{0,80}`));
  let scope = seg ? seg[0].split(/계약\s?기간|근무\s?기간|임용\s?기간/)[0] : '';
  let cand = null;
  // (a) 기간형: 2026. 7.31. ~ 2026. 8. 3.
  let r = scope.match(new RegExp(`${TIL}\\s*(\\d{4})\\s*[.\\-/]\\s*(\\d{1,2})\\s*[.\\-/]\\s*(\\d{1,2})`));
  if (r) cand = `${r[1]}-${p2(r[2])}-${p2(r[3])}`;
  // (b) 연도 생략형: 7.31.(금) ~ 8. 3.(월)  → 등록일의 연도를 빌린다
  if (!cand) {
    r = scope.match(new RegExp(`${TIL}\\s*(\\d{1,2})\\s*[.\\-/]\\s*(\\d{1,2})`));
    if (r) cand = `${regDate.slice(0,4)}-${p2(r[1])}-${p2(r[2])}`;
  }
  // (c) 단일 마감형: 2026.08.03. 도착분까지
  if (!cand) {
    r = scope.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})[^\d]{0,12}(?:까지|도착|마감)/);
    if (r) cand = `${r[1]}-${p2(r[2])}-${p2(r[3])}`;
  }
  if (!cand) return null;
  // 이상치 방어: 마감일이 등록일보다 빠르거나, 등록 후 180일을 넘으면 신뢰하지 않는다
  if (cand < regDate) {
    const fixed = `${+regDate.slice(0,4)+1}${cand.slice(4)}`;   // 연도 오타면 다음 해로 보정 시도
    if (fixed >= regDate && fixed <= addDays(regDate,180)) return fixed;
    return null;
  }
  if (cand > addDays(regDate, 180)) return null;
  return cand;
}
const p2 = n => String(n).padStart(2,'0');
const addDays = (d,n) => new Date(Date.parse(d)+n*864e5).toISOString().slice(0,10);

const src = JSON.parse(await fs.readFile('jobs-raw.json','utf8'));
const items = src.items;
console.error(`상세 ${items.length}건 수집 시작...`);
let ok=0, nodl=0, done=0;
const CONC = 4;                 // 순차 처리는 해외에서 18분 넘게 걸린다
let cursor = 0;
async function worker(){
 while (cursor < items.length) {
  const i = cursor++;
  const it=items[i];
  // 일시적인 네트워크 실패로 마감일을 통째로 잃지 않도록 한 번 더 시도한다
  for (let attempt=0; attempt<2; attempt++){
    try{
      const html = await (await fetch(it.url,{headers:UA,signal:AbortSignal.timeout(40000)})).text();
      const body = flat(html);
      // 1) 게시판이 제공하는 마감일자 필드가 가장 믿을 만하다
      const m = body.match(/마감\s?일자\s*(\d{4})[./-](\d{2})[./-](\d{2})/);
      if (m) it.deadline = `${m[1]}-${m[2]}-${m[3]}`;
      else it.deadline = pickDeadline(body, it.date);
      if (it.deadline) ok++; else nodl++;
      it.snippet = body.slice(0, 200);   // 본문 앞부분(요약용)
      delete it.err;
      break;
    }catch(e){
      it.err = e.message;
      if (attempt === 0) await sleep(1200);
    }
  }
  if (++done % 100 === 0) process.stderr.write(`${done} `);
  await sleep(120);
 }
}
await Promise.all(Array.from({length:CONC}, worker));
console.error('');
await fs.writeFile('jobs-detail.json', JSON.stringify(items,null,2));
console.log(`마감일 확보 ${ok}건 / 못 찾음 ${nodl}건 / 오류 ${items.filter(x=>x.err).length}건`);
const today='2026-08-01';
const live=items.filter(x=>x.deadline && x.deadline>=today);
console.log(`오늘(${today}) 기준 아직 유효한 공고: ${live.length}건`);
const dd={};
for(const x of live){ const d=Math.round((new Date(x.deadline)-new Date(today))/864e5); dd['D-'+d]=(dd['D-'+d]||0)+1; }
console.log('마감까지:', Object.entries(dd).sort((a,b)=>parseInt(a[0].slice(2))-parseInt(b[0].slice(2))).slice(0,10).map(([k,v])=>k+':'+v).join('  '));
