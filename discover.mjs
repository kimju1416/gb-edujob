// 경북 각 기관 사이트맵/메인에서 '채용·구인' 게시판을 자동 발견
const UA={'User-Agent':'Mozilla/5.0 (compatible; JobRadar/0.1)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const dec=s=>s.replace(/&amp;/g,'&').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();

export const GB = {
  main:'경북교육청', ph:'포항', gj:'경주', gc:'김천', ad:'안동', gm:'구미', yj:'영주', yc:'영천',
  sje:'상주', mg:'문경', gs:'경산', us:'의성', cs:'청송', yy:'영양', yd:'영덕', cd:'청도',
  gr:'고령', sj:'성주', cg:'칠곡', ycg:'예천', bh:'봉화', uj:'울진', ul:'울릉',
};
const WANT = /채용|구인|모집|일자리|인력/;
const SKIP = /구직|결과|합격|공무원\s?임용|시험\s?안내/;

export async function findBoards(sysid){
  const out=new Map();
  for (const path of [`/${sysid}/main.do`, `/${sysid}/sitemap.do`]) {
    try{
      const html = await (await fetch('https://www.gbe.kr'+path,{headers:UA,signal:AbortSignal.timeout(20000)})).text();
      for (const m of html.matchAll(/href="([^"]*selectNttList\.do\?mi=(\d+)&(?:amp;)?bbsId=(\d+))"[^>]*>([\s\S]{0,60}?)<\/a>/g)) {
        const label = dec(m[4]);
        if (!label || !WANT.test(label) || SKIP.test(label)) continue;
        const key = m[2]+'_'+m[3];
        if (!out.has(key)) out.set(key, { mi:m[2], bbsId:m[3], label,
          url:`https://www.gbe.kr/${sysid}/na/ntt/selectNttList.do?mi=${m[2]}&bbsId=${m[3]}` });
      }
    }catch(e){}
    await sleep(250);
  }
  return [...out.values()];
}

if (process.env.RUN_DISCOVER) {
  let total=0;
  for (const [sysid,name] of Object.entries(GB)) {
    const b = await findBoards(sysid);
    total += b.length;
    console.log(`${name.padEnd(8)} ${b.length}개  ${b.map(x=>x.label).join(' / ') || '(못 찾음)'}`);
    await sleep(200);
  }
  console.log('\n총 발견 게시판:', total, '개');
}
