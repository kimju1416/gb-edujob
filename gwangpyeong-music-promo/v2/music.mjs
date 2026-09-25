// 광평중 음악중점반 홍보영상 2편 BGM — 오리지널 합성 트랙 (120 BPM, 60마디 = 정확히 2분)
// 외부 샘플 0개. 전부 코드로 합성해서 저작권 걱정 없이 써도 됩니다.
// 흐름: 조율(A음) → 피아노 → 피치카토 → 비트 → 클라이맥스 → 엔딩
import fs from 'fs';

const SR = 44100, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, S16 = BEAT / 4;
const BARS = 60, DUR = BARS * BAR, N = Math.round(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);         // 드럼 버스
const ML = new Float32Array(N), MR = new Float32Array(N);       // 음악 버스 (사이드체인 대상)
const PL = new Float32Array(N), PR = new Float32Array(N);       // 피아노·현 버스 (덕킹 약하게)
const REV = new Float32Array(N), DLY = new Float32Array(N);     // 센드
const events = { kick: [], clap: [], hat: [], stab: [], lead: [], piano: [], pluck: [], crash: [], riser: [], tune: [], boom: [] };

// ---- 구성 (마디 번호) ----
export const SEC = {
  intro: [0, 6],     // 0:00 조율음 → 피아노 솔로
  start: [6, 16],    // 0:12 시작: 피아노 아르페지오 + 현 패드
  grow: [16, 28],    // 0:32 성장: 피치카토, 킥이 조금씩
  stage: [28, 44],   // 0:56 무대: 풀 비트
  brk: [44, 46],     // 1:28 브레이크
  climax: [46, 54],  // 1:32 클라이맥스
  outro: [54, 60],   // 1:48 엔딩
};
const inS = (b, s) => b >= SEC[s][0] && b < SEC[s][1];

const C = { // [베이스 루트, 코드음]
  G: [43, [55, 59, 62, 67]], DF: [42, [54, 57, 62, 66]], Em: [40, [52, 55, 59, 64]], C: [36, [52, 55, 60, 64]],
  Am: [45, [52, 57, 60, 64]], D: [38, [54, 57, 62, 66]], Cm7: [36, [52, 55, 59, 64]], Bm: [35, [54, 59, 62, 66]],
};
const PROG = []; // 마디별 코드
for (let b = 0; b < BARS; b++) {
  let n;
  if (b < 2) n = 'G';
  else if (inS(b, 'grow')) n = ['Em', 'C', 'G', 'D'][b % 4];
  else if (inS(b, 'brk')) n = ['Em', 'C'][b % 2];
  else if (inS(b, 'climax')) n = ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'D'][b - SEC.climax[0]];
  else if (inS(b, 'outro')) n = ['G', 'Cm7', 'Am', 'D', 'G', 'G'][b - SEC.outro[0]];
  else n = ['G', 'DF', 'Em', 'C'][b % 4];
  PROG.push(n);
}

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let seed = 20261208; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
function svf() {
  let ic1 = 0, ic2 = 0;
  return (x, fc, q = 0.7) => {
    fc = Math.max(30, Math.min(fc, SR * 0.45));
    const g = Math.tan(Math.PI * fc / SR), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  };
}
const saw = ph => 2 * (ph - Math.floor(ph + 0.5));
const idx = t => Math.round(t * SR);
const T = (bar, s16 = 0) => bar * BAR + s16 * S16;
const r4 = x => +x.toFixed(4);

// ================= 악기 =================
function kick(t0, g = 1) {
  events.kick.push([r4(t0), g]);
  const n = idx(0.45); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    ph += (44 + 115 * Math.exp(-t * 30)) / SR;
    let v = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 6) * (t < 0.002 ? t / 0.002 : 1);
    v += t < 0.004 ? rnd() * 0.45 * (1 - t / 0.004) : 0;
    v = Math.tanh(v * 1.6) * 0.95 * g;
    L[j] += v; R[j] += v;
  }
}
function clap(t0, g = 1) {
  events.clap.push(r4(t0));
  const f = svf(), n = idx(0.35);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let e = 0;
    for (const o of [0, 0.009, 0.018]) if (t >= o) e = Math.max(e, Math.exp(-(t - o) * 180));
    e = Math.max(e, t > 0.02 ? Math.exp(-(t - 0.02) * 16) * 0.55 : 0);
    const v = f(rnd(), 1500, 1.4).bp * e * 1.3 * g;
    L[j] += v; R[j] += v; REV[j] += v * 0.35;
  }
}
function snare(t0, g = 1) {
  const f = svf(), n = idx(0.16);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const v = (f(rnd(), 2500, 0.8).bp * 1.2 + Math.sin(2 * Math.PI * 190 * t) * 0.4) * Math.exp(-t * 28) * g;
    L[j] += v; R[j] += v; REV[j] += v * 0.2;
  }
}
function hat(t0, open = false, g = 1) {
  events.hat.push(r4(t0));
  const f = svf(), n = idx(open ? 0.3 : 0.06), pan = open ? 0.15 : -0.15;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const v = f(rnd(), 9000, 0.7).hp * Math.exp(-t * (open ? 13 : 70)) * 0.3 * g;
    L[j] += v * (1 - pan); R[j] += v * (1 + pan);
  }
}
function crash(t0, g = 1, len = 2.4) {
  events.crash.push(r4(t0));
  const f = svf(), f2 = svf(), n = idx(len);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const nz = f(rnd(), 5000, 0.5).hp * Math.exp(-t * 2) * 0.33;
    const boom = Math.sin(2 * Math.PI * (38 + 30 * Math.exp(-t * 8)) * t) * Math.exp(-t * 2.6) * 0.8;
    const sh = f2(rnd(), 1200, 0.6).bp * Math.exp(-t * 10) * 0.4;
    const v = (nz + boom + sh) * g;
    L[j] += v * (1 + rnd() * 0.05); R[j] += v; REV[j] += nz * 0.45 * g;
  }
}
function timpani(t0, m, g = 1, len = 1.6) { // 팀파니 한 방
  events.boom.push(r4(t0));
  const f0 = mtof(m), f = svf(), n = idx(len); let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const fr = f0 * (1 + 0.06 * Math.exp(-t * 20));
    p1 += fr / SR; p2 += fr * 1.504 / SR;
    const v = (Math.sin(2 * Math.PI * p1) * Math.exp(-t * 2.2) + Math.sin(2 * Math.PI * p2) * 0.3 * Math.exp(-t * 5)
      + f(rnd(), 400, 0.7).lp * Math.exp(-t * 30) * 0.6) * g * 0.7 * Math.min(1, t / 0.002);
    L[j] += v; R[j] += v; REV[j] += v * 0.25;
  }
}
function riser(t0, len, g = 1) {
  events.riser.push([r4(t0), len]);
  const f = svf(), n = idx(len);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const p = t / len, v = f(rnd(), 300 + 9000 * p * p, 2.5).bp * p * p * 0.5 * g;
    ML[j] += v; MR[j] += v * 0.9; REV[j] += v * 0.3;
  }
}
function tune(t0, m, len, g = 1, pan = 0) { // 오보에 같은 조율음
  events.tune.push([r4(t0), m, len]);
  const f = svf(), n = idx(len + 0.6); let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const vib = 1 + 0.0045 * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, Math.max(0, t - 0.6) * 1.5);
    p += mtof(m) * vib / SR;
    let s = 0; for (let k = 1; k <= 9; k++) s += Math.sin(2 * Math.PI * p * k) * [0, 1, .8, .9, .5, .45, .3, .2, .12, .08][k];
    const e = Math.min(1, t / 0.18) * (t > len ? Math.exp(-(t - len) * 6) : 1);
    const v = f(s, 3200, 0.8).lp * e * 0.03 * g;
    PL[j] += v * (1 - pan); PR[j] += v * (1 + pan); REV[j] += v * 0.5;
  }
}
function piano(t0, m, dur, g = 1) { // 가산 합성 피아노 (약간의 비조화성)
  events.piano.push([r4(t0), m, r4(dur), g]);
  const f0 = mtof(m), n = idx(Math.min(dur + 1.2, 4)), pan = Math.max(-0.6, Math.min(0.6, (m - 64) / 30));
  const B = 0.00035, hs = [];
  for (let k = 1; k <= 10; k++) hs.push({ f: f0 * k * Math.sqrt(1 + B * k * k), a: Math.pow(k, -1.25) * (k === 1 ? 1 : 0.8), d: 0.9 + k * 0.55 + f0 / 900, ph: 0 });
  const hf = svf();
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let s = 0;
    for (const h of hs) { if (h.f > SR * 0.45) continue; h.ph += h.f / SR; s += Math.sin(2 * Math.PI * h.ph) * h.a * Math.exp(-t * h.d); }
    s += t < 0.01 ? hf(rnd(), 3000, 0.7).bp * (1 - t / 0.01) * 0.4 : 0;
    const e = Math.min(1, t / 0.003) * (t > dur ? Math.exp(-(t - dur) * 7) : 1);
    const v = s * e * 0.085 * g;
    PL[j] += v * (1 - pan); PR[j] += v * (1 + pan); REV[j] += v * 0.38;
  }
}
function pluck(t0, m, g = 1, pan = 0) { // 카플러스-스트롱 피치카토
  events.pluck.push([r4(t0), m]);
  const f0 = mtof(m), P = Math.max(2, Math.round(SR / f0)), buf = new Float32Array(P);
  let lp = 0; for (let i = 0; i < P; i++) { lp = lp * 0.5 + rnd() * 0.5; buf[i] = lp; }
  const n = idx(0.9); let p = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const j = idx(t0) + i; if (j >= N) break;
    const y = buf[p]; const nx = (y + prev) * 0.5 * 0.994; prev = y; buf[p] = nx; p = (p + 1) % P;
    const v = y * 0.3 * g * Math.exp(-(i / SR) * 3.5);
    ML[j] += v * (1 - pan); MR[j] += v * (1 + pan); REV[j] += v * 0.3; DLY[j] += v * 0.15;
  }
}
function strings(t0, notes, dur, { gain = 0.11, att = 0.5, rel = 0.9, cut = 2400, oct = 0 } = {}) { // 현 패드
  const det = [-0.12, -0.06, -0.02, 0.02, 0.06, 0.12], pans = [-0.9, -0.5, -0.15, 0.15, 0.5, 0.9];
  const fl = svf(), fr = svf(), phs = notes.map(() => det.map(() => (rnd() + 1) / 2));
  const n = idx(dur + rel * 2.5);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let sl = 0, sr = 0;
    const vib = 1 + 0.003 * Math.sin(2 * Math.PI * 5 * t + 1.3);
    notes.forEach((m, a) => det.forEach((d, b) => {
      phs[a][b] += mtof(m + oct * 12 + d) * vib / SR; const s = saw(phs[a][b] % 1);
      sl += s * (1 - pans[b]) * 0.5; sr += s * (1 + pans[b]) * 0.5;
    }));
    const e = Math.min(1, t / att) * (t > dur ? Math.exp(-(t - dur) / rel * 2.2) : 1);
    const c = cut * (0.6 + 0.4 * Math.min(1, t / att));
    const vl = fl(sl, c, 0.7).lp * e * gain / notes.length, vr = fr(sr, c, 0.7).lp * e * gain / notes.length;
    PL[j] += vl; PR[j] += vr; REV[j] += (vl + vr) * 0.3;
  }
}
function stab(t0, notes, dur, { cut0 = 6000, cut1 = 900, cutDecay = 9, gain = 0.18 } = {}) { // 슈퍼소 스탭
  events.stab.push([r4(t0), r4(dur)]);
  const det = [-0.11, -0.05, 0, 0.05, 0.11], pans = [-0.8, -0.4, 0, 0.4, 0.8];
  const fl = svf(), fr = svf(), phs = notes.map(() => det.map(() => (rnd() + 1) / 2));
  const n = idx(dur + 0.25);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let sl = 0, sr = 0;
    notes.forEach((m, a) => det.forEach((d, b) => {
      phs[a][b] += mtof(m + d) / SR; const s = saw(phs[a][b] % 1);
      sl += s * (1 - pans[b]) * 0.5; sr += s * (1 + pans[b]) * 0.5;
    }));
    const e = Math.min(1, t / 0.004) * (t > dur ? Math.exp(-(t - dur) * 30) : 1);
    const c = cut1 + (cut0 - cut1) * Math.exp(-t * cutDecay);
    const vl = fl(sl, c, 0.9).lp * e * gain / notes.length, vr = fr(sr, c, 0.9).lp * e * gain / notes.length;
    ML[j] += vl; MR[j] += vr; REV[j] += (vl + vr) * 0.25;
  }
}
function bass(t0, m, dur, g = 1) {
  const f = svf(); let p = 0; const n = idx(dur + 0.03);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    p += mtof(m) / SR;
    const s = saw(p % 1) * 0.6 + Math.sin(2 * Math.PI * p) * 0.7;
    const e = Math.min(1, t / 0.003) * (t > dur ? Math.exp(-(t - dur) * 60) : 1);
    const v = Math.tanh(f(s, 350 + 1400 * Math.exp(-t * 18), 1.1).lp * 1.8) * e * 0.4 * g;
    ML[j] += v; MR[j] += v;
  }
}
function lead(t0, m, dur, g = 1) {
  events.lead.push([r4(t0), m, r4(dur)]);
  const f = svf(); let p = 0, p2 = 0; const n = idx(dur + 0.08);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const fr = mtof(m) * (1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t * 4));
    p += fr / SR; p2 += fr * 1.005 / SR;
    const s = ((p % 1) < 0.35 ? 1 : -1) * 0.5 + saw(p2 % 1) * 0.5;
    const e = Math.min(1, t / 0.003) * (0.55 + 0.45 * Math.exp(-t * 7)) * (t > dur ? Math.exp(-(t - dur) * 40) : 1);
    const v = f(s, 1200 + 5500 * Math.exp(-t * 14), 1.2).lp * e * 0.15 * g;
    ML[j] += v; MR[j] += v; DLY[j] += v * 0.45; REV[j] += v * 0.3;
  }
}
function arp(t0, m, g = 1) {
  const f = svf(); let p = 0; const n = idx(0.18);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    p += mtof(m) / SR;
    const v = f(saw(p % 1), 800 + 4500 * Math.exp(-t * 30), 1.5).lp * Math.exp(-t * 16) * 0.06 * g;
    ML[j] += v * 0.7; MR[j] += v * 1.2; DLY[j] += v * 0.5;
  }
}

// ================= 편곡 =================
// 1편과 같은 주제 선율 (시리즈 통일감)
const MEL = [
  [[0, 74, 2], [3, 71, 2], [6, 74, 2], [8, 79, 4], [12, 76, 4]],
  [[0, 78, 3], [3, 76, 2], [6, 74, 2], [8, 69, 4], [12, 74, 2], [14, 76, 2]],
  [[0, 79, 3], [3, 78, 2], [6, 76, 2], [8, 71, 4], [12, 74, 2], [14, 76, 2]],
  [[0, 76, 3], [3, 74, 2], [6, 72, 2], [8, 71, 6]],
];
const STAB = [0, 3, 6, 10, 12];
const chordOf = b => C[PROG[b]];

// --- 인트로: 조율음 A → 5도 → 피아노 솔로 ---
tune(T(0), 69, 2.6, 1, -0.1);            // 오보에 A
tune(T(0, 10), 57, 1.4, 0.7, 0.3);       // 첼로 A
tune(T(0, 12), 64, 1.2, 0.6, -0.4);      // 비올라 E
tune(T(1, 2), 76, 1.0, 0.5, 0.5);        // 바이올린 E
riser(T(1), BAR, 0.5);
for (let b = 2; b < 6; b++) {            // 피아노 주제 (느리게, 여린 셈)
  const [root] = chordOf(b);
  piano(T(b), root + 12, BAR * 0.95, 0.8); piano(T(b), root + 19, BAR * 0.95, 0.5);
  MEL[b % 4].forEach(([s, m, l]) => piano(T(b, s), m - 12, l * S16 * 1.3, 0.75 + (s === 0 ? 0.15 : 0)));
}
strings(T(4), chordOf(4)[1], BAR * 2, { gain: 0.06, att: 1.6 });

// --- 시작: 피아노 아르페지오 + 현 ---
for (let b = SEC.start[0]; b < SEC.start[1]; b++) {
  const [root, ns] = chordOf(b);
  piano(T(b), root, BAR * 0.9, 0.7); piano(T(b), root + 12, BAR * 0.9, 0.5);
  const pat = [ns[0], ns[1], ns[2], ns[3] - 12 + 12, ns[2], ns[1], ns[2], ns[3]];
  pat.forEach((m, e) => piano(T(b, e * 2), m, S16 * 3, 0.42 + (e % 4 === 0 ? 0.12 : 0)));
  if (b >= 8) strings(T(b), ns.map(m => m - 12), BAR, { gain: 0.08, att: 0.6 });
  if (b >= 10 && b < 14) MEL[b % 4].forEach(([s, m, l]) => piano(T(b, s), m, l * S16 * 1.2, 0.8));
  if (b === 14 || b === 15) MEL[b % 4].forEach(([s, m, l]) => piano(T(b, s), m + 12, l * S16, 0.55));
}
riser(T(15), BAR, 0.6);

// --- 성장: 피치카토 + 현 + 킥 조금씩 ---
for (let b = SEC.grow[0]; b < SEC.grow[1]; b++) {
  const [root, ns] = chordOf(b), k = b - SEC.grow[0];
  strings(T(b), ns, BAR, { gain: 0.055, att: 0.3, cut: 2800 });
  bass(T(b), root, BAR * 0.45, 0.55); bass(T(b, 8), root, BAR * 0.45, 0.5);
  const pz = [ns[0] + 12, ns[2], ns[1] + 12, ns[2], ns[3], ns[2], ns[1] + 12, ns[3]];
  pz.forEach((m, e) => pluck(T(b, e * 2), m, 0.9, e % 2 ? 0.35 : -0.35));
  if (k >= 4) { pluck(T(b, 1), pz[0] + 12, 0.35, 0.6); pluck(T(b, 9), pz[4] + 12, 0.35, -0.6); }
  if (k >= 4) { kick(T(b), 0.55); kick(T(b, 8), 0.55); }
  if (k >= 8) { for (let s = 2; s < 16; s += 4) hat(T(b, s), false, 0.5); clap(T(b, 12), 0.45); }
  if (k >= 6) MEL[b % 4].forEach(([s, m, l]) => piano(T(b, s), m, l * S16, 0.55));
}
{ const b = SEC.grow[1] - 1; // 빌드업
  for (let s = 0; s < 16; s++) if (s < 8 ? s % 4 === 0 : s < 12 ? s % 2 === 0 : true) snare(T(b, s), 0.3 + s / 16 * 0.7);
  riser(T(b - 1), BAR * 2, 1);
}

// --- 드롭 공통 ---
function drop(b, { melody = false, big = false } = {}) {
  const [root, ns] = chordOf(b);
  for (let q = 0; q < 4; q++) kick(T(b, q * 4));
  clap(T(b, 4)); clap(T(b, 12));
  for (let s = 0; s < 16; s++) s % 4 === 2 ? hat(T(b, s), true, 0.65) : hat(T(b, s), false, s % 2 ? 0.4 : 0.65);
  STAB.forEach((s, k) => stab(T(b, s), ns, S16 * (k === 4 ? 3 : 1.6), { gain: big ? 0.2 : 0.17 }));
  for (const s of [2, 6, 10, 14]) bass(T(b, s), root + 12, S16 * 1.7);
  bass(T(b), root, S16 * 1.2, 0.8);
  const an = [...ns.map(n => n + 12), ns[1] + 24];
  for (let s = 0; s < 16; s++) arp(T(b, s), an[(s * 3) % an.length], 0.9);
  if (melody) MEL[b % 4].forEach(([s, m, l]) => lead(T(b, s), m, l * S16));
  if (big) {
    strings(T(b), ns.map(m => m + 12), BAR, { gain: 0.07, att: 0.08, cut: 4200 });
    MEL[b % 4].forEach(([s, m, l]) => piano(T(b, s), m + 12, l * S16, 0.5));
  }
}
for (let b = SEC.stage[0]; b < SEC.stage[1]; b++) drop(b, { melody: b >= SEC.stage[0] + 8 });
crash(T(SEC.stage[0]), 1); crash(T(SEC.stage[0] + 8), 0.9);
snare(T(SEC.stage[1] - 1, 14), 0.8); snare(T(SEC.stage[1] - 1, 15), 1);

// --- 브레이크 ---
for (let b = SEC.brk[0]; b < SEC.brk[1]; b++) {
  const [root, ns] = chordOf(b);
  strings(T(b), ns, BAR, { gain: 0.12, att: 0.2, cut: 3000 });
  piano(T(b), root + 12, BAR, 0.7);
  MEL[b % 4].forEach(([s, m, l]) => piano(T(b, s), m, l * S16 * 1.2, 0.85));
  bass(T(b), root, BAR * 0.95, 0.6);
}
{ const b = SEC.brk[1] - 1;
  for (let s = 0; s < 16; s++) if (s < 8 ? s % 4 === 0 : s < 12 ? s % 2 === 0 : true) clap(T(b, s), 0.3 + s / 16 * 0.65);
  riser(T(b), BAR, 1.15);
  timpani(T(b, 12), 43, 0.5); timpani(T(b, 14), 43, 0.7);
}

// --- 클라이맥스 ---
for (let b = SEC.climax[0]; b < SEC.climax[1]; b++) drop(b, { melody: true, big: true });
crash(T(SEC.climax[0]), 1.15); timpani(T(SEC.climax[0]), 43, 1);
crash(T(SEC.climax[0] + 4), 1); timpani(T(SEC.climax[0] + 4), 43, 0.9);
{ const b = SEC.climax[1] - 1;
  for (let s = 12; s < 16; s++) snare(T(b, s), 0.6 + (s - 12) * 0.12);
  for (let s = 8; s < 16; s += 2) timpani(T(b, s), 38 + (s - 8) / 2 * 2, 0.5 + s / 32);
}

// --- 엔딩 ---
{ const b0 = SEC.outro[0];
  kick(T(b0), 1.1); crash(T(b0), 1.2, 3); timpani(T(b0), 43, 1.1, 2.4);
  stab(T(b0), [...C.G[1], 79], BAR * 0.9, { cut0: 7000, cut1: 800, cutDecay: 1.4, gain: 0.24 });
  bass(T(b0), 43, BAR * 0.9, 1);
  for (let b = b0 + 1; b < SEC.outro[1]; b++) {
    const [root, ns] = chordOf(b), last = b >= SEC.outro[1] - 2;
    strings(T(b), ns, last ? BAR * 1.8 : BAR, { gain: last ? 0.09 : 0.1, att: 0.4, rel: last ? 1.6 : 0.9 });
    if (!last || b === SEC.outro[1] - 2) piano(T(b), root, BAR * (last ? 3.5 : 1), 0.6);
    if (b < SEC.outro[1] - 2) MEL[(b - b0 - 1) % 4].forEach(([s, m, l]) => piano(T(b, s), m, l * S16 * 1.3, 0.7));
  }
  const bl = SEC.outro[1] - 2; // 마지막 G 코드를 아르페지오로 굴리고 여운
  [55, 59, 62, 67, 71, 74, 79].forEach((m, i) => piano(T(bl, i), m, BAR * 2.5 - i * S16, 0.55));
  tune(T(bl, 8), 69, 2.2, 0.35, 0);         // 첫 장면의 A음으로 수미상관
}

// ================= 믹스 =================
const sc = new Float32Array(N).fill(1);
for (const [k, g] of events.kick) {
  const j0 = idx(k), n = idx(0.3), depth = 0.7 * Math.min(1, g);
  for (let i = 0; i < n && j0 + i < N; i++) {
    const t = i / SR, d = 1 - depth * Math.exp(-t / 0.07) * (t < 0.004 ? t / 0.004 : 1);
    sc[j0 + i] = Math.min(sc[j0 + i], d);
  }
}
const dT = idx(S16 * 3), dl = new Float32Array(N), dr = new Float32Array(N);
for (let i = 0; i < N; i++) { dl[i] = DLY[i] + (i >= dT ? dr[i - dT] * 0.45 : 0); dr[i] = i >= dT ? dl[i - dT] : 0; }
function reverb(input, combs, aps, fb) {
  const out = new Float32Array(N);
  for (const c of combs) {
    const buf = new Float32Array(c); let p = 0, lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[p]; lp = y * 0.55 + lp * 0.45; buf[p] = input[i] + lp * fb; p = (p + 1) % c; out[i] += y; }
  }
  for (const a of aps) {
    const buf = new Float32Array(a); let p = 0;
    for (let i = 0; i < N; i++) { const b = buf[p], y = -out[i] + b; buf[p] = out[i] + b * 0.5; p = (p + 1) % a; out[i] = y; }
  }
  return out;
}
const rvL = reverb(REV, [1557, 1617, 1491, 1422, 1277, 1356], [556, 441, 341], 0.86);
const rvR = reverb(REV, [1580, 1640, 1514, 1445, 1300, 1379], [579, 464, 364], 0.86);

const oL = new Float32Array(N), oR = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const m = sc[i], mp = 1 - (1 - m) * 0.4;
  let l = L[i] * 0.42 + (ML[i] * 0.62 + dl[i] * 0.3) * m + PL[i] * 1.5 * mp + rvL[i] * 0.05;
  let r = R[i] * 0.42 + (MR[i] * 0.62 + dr[i] * 0.3) * m + PR[i] * 1.5 * mp + rvR[i] * 0.05;
  l = Math.tanh(l * 1.1); r = Math.tanh(r * 1.1);
  const t = i / SR, fade = t > DUR - 2.5 ? Math.max(0, (DUR - t) / 2.5) : 1;
  oL[i] = l * fade; oR[i] = r * fade;
  peak = Math.max(peak, Math.abs(oL[i]), Math.abs(oR[i]));
}
const norm = 0.93 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oL[i] * norm)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oR[i] * norm)) * 32767), 46 + i * 4);
}
fs.writeFileSync('bgm.wav', buf);
fs.writeFileSync('events.json', JSON.stringify({ ...events, SEC, PROG }));
console.log('ok', { dur: DUR, peak: peak.toFixed(3), kicks: events.kick.length, piano: events.piano.length, pluck: events.pluck.length });
