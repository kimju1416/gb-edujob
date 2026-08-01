import fs from 'node:fs/promises';
const items = JSON.parse(await fs.readFile('jobs-detail.json','utf8'));
const TODAY = process.env.TODAY || new Date().toISOString().slice(0,10);

// 1) 지원 대상이 아닌 글 제외 (결과·합격자·시험안내 등)
const NOT_JOB = /합격자|최종\s?합격|합격\s?발표|채용후보자\s?등록|서류전형\s?결과|면접시험\s?시행|필기시험\s?(시간|장소)|시험\s?계획|선정\s?결과|결과\s?공고|취소|정정\s?공고|참고자료|운영\s?매뉴얼/;
// 2) 직종 분류
const KIND = [
  ['기간제교원', /기간제\s?교(원|사)|계약제\s?교(원|사)|계약직\s?교원/],
  ['시간강사',   /시간\s?강사|강사\s?채용|시간제\s?강사/],
  ['협력·두레강사', /두레\s?강사|협력\s?강사|1수업\s?2교사/],
  ['방과후·늘봄', /방과후|늘봄|돌봄\s?강사|프로그램\s?강사|외부\s?강사|맞춤형.*강사|스포츠\s?강사/],
  ['돌봄전담사', /돌봄\s?전담/],
  ['교육공무직', /교육공무직|조리(원|사|실무사)|특수교육\s?실무|행정\s?실무|실무사/],
  ['공무원 대체인력', /지방공무원|일반직|임기제|결원\s?대체/],
  ['특수·보조인력', /도우미|보조\s?인력|지원\s?인력|보조원/],
  ['당직·시설', /당직|경비|시설\s?관리|미화|환경\s?관리/],
  ['영양·보건', /영양(사|교사)|보건(교사|강사)|간호/],
  ['자원봉사', /자원\s?봉사|봉사자/],
];
const LEVEL = [['유치원',/유치원|병설유|단설유/],['초등',/초등학교|초등|[가-힣]{2,6}초\b/],
               ['중학교',/중학교|[가-힣]{2,6}중\b/],['고등학교',/고등학교|[가-힣]{2,6}고\b/],
               ['특수학교',/특수학교|명도학교|혜당학교/]];

// 시군 목록 — 본청 게시판에 올라온 학교 공고의 실제 지역을 제목에서 뽑아낸다
const CITIES = ['포항','경주','김천','안동','구미','영주','영천','상주','문경','경산','의성','청송',
                '영양','영덕','청도','고령','성주','칠곡','예천','봉화','울진','울릉'];
// 더 구체적인 분류가 있으면 포괄적인 것은 버린다 (협력강사가 '시간강사'로도 잡히는 문제)
const NARROWER = { '시간강사': ['협력·두레강사','방과후·늘봄','돌봄전담사','특수·보조인력'] };

const out=[];
for (const it of items) {
  if (!it.title || NOT_JOB.test(it.title)) continue;
  let kinds = KIND.filter(([,re])=>re.test(it.title)).map(x=>x[0]);
  for (const [broad, narrows] of Object.entries(NARROWER))
    if (kinds.includes(broad) && kinds.some(k=>narrows.includes(k)))
      kinds = kinds.filter(k=>k!==broad);
  const lv = LEVEL.find(([,re])=>re.test(it.title));
  // 지역: 제목에 시군명이 있으면 그것을 우선 (본청 게시판 공고 대부분이 개별 학교 건이다)
  const city = CITIES.find(c=>it.title.includes(c));
  const org = city || it.org;
  // 마감일: 있으면 그대로, 없으면 null (화면에서 '마감일 확인' 표시)
  const dl = it.deadline || null;
  // 만료 판정: 마감일이 지났거나, 마감일이 없는데 등록 30일 초과
  const expired = dl ? dl < TODAY : (it.date < new Date(Date.parse(TODAY)-30*864e5).toISOString().slice(0,10));
  out.push({ t:it.title, o:org, b:it.board, d:it.date, dl, u:it.url,
             k:kinds.length?kinds:['기타'], lv: lv?lv[0]:null, x:expired });
}
// 같은 공고가 본청 게시판과 지원청 게시판에 동시에 올라온다(URL이 달라 앞 단계에선 안 걸러진다).
// 제목을 정규화해 마감일과 묶어 중복을 제거하고, 지역이 더 구체적인 쪽을 남긴다.
const norm = t => t.replace(/[\s\[\](){}·<>「」『』"'’‘“”]/g,'').replace(/제?\d+차|재공고|공고문?|모집|채용/g,'');
const seen = new Map();
for (const it of out) {
  const key = norm(it.t) + '|' + (it.dl || it.d);
  const prev = seen.get(key);
  if (!prev) { seen.set(key, it); continue; }
  // 본청('경북교육청')보다 시군 이름이 붙은 쪽이 정보가 낫다
  const better = (prev.o === '경북교육청' && it.o !== '경북교육청') ? it : prev;
  seen.set(key, better);
}
const deduped = [...seen.values()];
console.log(`중복 제거: ${out.length} → ${deduped.length}건 (같은 공고가 본청·지원청에 중복 게시)`);
out.length = 0; out.push(...deduped);

const live = out.filter(x=>!x.x);
await fs.writeFile('jobs.json', JSON.stringify({
  built: new Date().toISOString().slice(0,16).replace('T',' '),
  today: TODAY,
  items: out.sort((a,b)=> (a.dl?0:1)-(b.dl?0:1) || (a.dl||'9999').localeCompare(b.dl||'9999') || b.d.localeCompare(a.d)),
}));
console.log(`전체 ${items.length}건 → 지원 가능 공고 ${out.length}건 (결과·안내 ${items.length-out.length}건 제외)`);
console.log(`그중 유효(마감 전) ${live.length}건 / 마감일 명시 ${live.filter(x=>x.dl).length}건`);
const kc={}; for(const x of live) for(const k of x.k) kc[k]=(kc[k]||0)+1;
console.log('\n[유효 공고 직종별]');
Object.entries(kc).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('   '+k.padEnd(16)+v+'건'));
const oc={}; for(const x of live) oc[x.o]=(oc[x.o]||0)+1;
console.log('\n[지역별]', Object.entries(oc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v).join(' · '));
