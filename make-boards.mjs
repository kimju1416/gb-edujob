// 게시판 목록을 캐시 파일로 굳힌다.
// 자동 발견은 각 기관 사이트를 23곳 열어야 해서 해외(Actions)에서 자주 실패한다.
// 게시판은 거의 바뀌지 않으므로 캐시를 1차 소스로 쓰고, 발견은 보강용으로만 돌린다.
import fs from 'node:fs/promises';
import { GB, findBoards } from './discover.mjs';
const POOL = /인력풀|인력뱅크|지원신청|지원 요청|자료실|한눈에|구직/;
const out = [];
for (const [sysid, name] of Object.entries(GB)) {
  const boards = (await findBoards(sysid)).filter(b => !POOL.test(b.label));
  const seen = new Set();
  for (const b of boards) {
    if (seen.has(b.bbsId)) continue;
    seen.add(b.bbsId);
    out.push({ sysid, org: name, mi: b.mi, bbsId: b.bbsId, label: b.label });
  }
  process.stderr.write('.');
}
console.error('');
await fs.writeFile('boards.json', JSON.stringify(out, null, 1));
console.log(`게시판 캐시 ${out.length}개 저장 (기관 ${Object.keys(GB).length}곳)`);
