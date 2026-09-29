// 광평중 음악중점반 홍보영상 2편 BGM — 오리지널 합성 트랙 (120 BPM, 70마디 = 정확히 2분 20초)
// 외부 샘플 0개. 전부 코드로 합성해서 저작권 걱정 없이 써도 됩니다.
// 흐름: 조율(A음) → 피아노 → 학교 음악 공간(스냅·글로켄슈필) → 첼로 독주 → 현 파트 → 오케스트라
//       → 무대(오케스트라 팝 그루브) → 브레이크 → 클라이맥스(A장조로 전조) → 엔딩(조율음 A로 끝)
// 장면 전환·사진 등장 시점마다 타격음·종소리·휙 소리를 맞춰 넣었습니다.
import fs from 'fs';

const SR = 44100, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, S16 = BEAT / 4;
const BARS = 70, DUR = BARS * BAR, N = Math.round(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);         // 드럼 버스
const ML = new Float32Array(N), MR = new Float32Array(N);       // 리듬 버스 (베이스·기타, 사이드체인 대상)
const PL = new Float32Array(N), PR = new Float32Array(N);       // 오케스트라 버스 (덕킹 약하게)
const REV = new Float32Array(N), DLY = new Float32Array(N);     // 센드
const events = { kick: [], clap: [], hat: [], lead: [], piano: [], pluck: [], crash: [], riser: [], tune: [], boom: [], glock: [] };

// ---- 구성 (마디 번호) ----
export const SEC = {
  intro: [0, 6],     // 0:00 조율음 → 피아노 솔로
  start: [6, 16],    // 0:12 타이틀 → 처음 만나는 악기 → 환영
  space: [16, 22],   // 0:32 학교 음악 공간
  grow: [22, 34],    // 0:44 STEP 01 첼로 독주 → 02 현 파트 → 03 오케스트라
  stage: [34, 50],   // 1:08 무대: 오케스트라 팝 그루브
  brk: [50, 52],     // 1:40 브레이크
  climax: [52, 60],  // 1:44 정기연주회: A장조로 전조
  outro: [60, 70],   // 2:00 엔딩 한 문장 → 모집 안내 카드 3장
};

const C = { // [베이스 루트, 코드음]
  G: [43, [55, 59, 62, 67]], DF: [42, [54, 57, 62, 66]], D: [38, [54, 57, 62, 66]], Em: [40, [52, 55, 59, 64]],
  C: [36, [52, 55, 60, 64]], Am: [45, [52, 57, 60, 64]], Bm: [35, [54, 59, 62, 66]], E: [40, [52, 56, 59, 64]],
  A: [45, [57, 61, 64, 69]], EGs: [44, [56, 59, 64, 68]], Fsm: [42, [54, 57, 61, 66]],
};
const PROG = []; // 마디별 코드
for (let b = 0; b < BARS; b++) PROG[b] = ['G', 'DF', 'Em', 'C'][b % 4];
const put = (b0, list) => list.forEach((c, i) => { PROG[b0 + i] = c; });
put(0, ['G', 'G']);
put(16, ['C', 'D', 'Bm', 'Em', 'C', 'D']);
put(22, ['Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D']);
put(34, ['G', 'DF', 'Em', 'C', 'G', 'DF', 'Em', 'C', 'C', 'D', 'Bm', 'Em', 'C', 'D', 'G', 'C']);
put(50, ['Em', 'E']);
put(52, ['A', 'EGs', 'Fsm', 'D', 'D', 'E', 'A', 'A']);
put(60, ['A', 'D', 'A', 'EGs', 'Fsm', 'D', 'A', 'E', 'A', 'A']);

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let seed = 20261015; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
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
// ---- 새 악기: 오케스트라 + 어쿠스틱 계열 ----
function out(j, v, pan, bus, rev = 0, dly = 0) { // pan -1..1
  const l = v * (1 - pan) , r = v * (1 + pan);
  if (bus === 'P') { PL[j] += l; PR[j] += r; } else if (bus === 'M') { ML[j] += l; MR[j] += r; } else { L[j] += l; R[j] += r; }
  if (rev) REV[j] += v * rev; if (dly) DLY[j] += v * dly;
}
function violin(t0, m, dur, g = 1, { from = null, pan = 0.1 } = {}) { // 현 리드: 톱니파 3겹 + 몸통 공명(포먼트) + 늦은 비브라토 + 활 소리
  events.lead.push([r4(t0), m, r4(dur)]);
  const n = idx(dur + 0.4), f0 = mtof(m), fs = from != null ? mtof(from) : f0;
  const b1 = svf(), b2 = svf(), b3 = svf(), nz = svf(); let p1 = (rnd() + 1) / 2, p2 = 0.3, p3 = 0.7;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const vib = 1 + 0.0065 * Math.sin(2 * Math.PI * 5.6 * t) * Math.min(1, Math.max(0, t - 0.2) * 3);
    const fr = (f0 + (fs - f0) * Math.exp(-t / 0.045)) * vib;
    p1 += fr / SR; p2 += fr * 1.0035 / SR; p3 += fr * 0.9968 / SR;
    const s = saw(p1 % 1) * 0.5 + saw(p2 % 1) * 0.3 + saw(p3 % 1) * 0.3 + nz(rnd(), fr * 2, 1).bp * 0.12;
    const body = b1(s, 470, 1.8).bp * 0.9 + b2(s, 1150, 2.2).bp * 0.8 + b3(s, 2900, 2.8).bp * 0.45 + s * 0.08;
    const e = Math.min(1, t / 0.07) * (0.9 + 0.1 * Math.min(1, t / 0.4)) * (t > dur ? Math.exp(-(t - dur) * 9) : 1);
    out(j, body * e * 0.2 * g, pan, 'P', 0.35, 0.1);
  }
}
function brass(t0, notes, dur, { gain = 0.1, swell = 0, cut = 3000, pan = 0 } = {}) { // 금관: 음 시작에 살짝 올려 부는 피치 + 세기에 따라 밝아지는 필터
  const det = [-0.06, 0, 0.07], fl = svf(), fr = svf(), phs = notes.map(() => det.map(() => (rnd() + 1) / 2));
  const n = idx(dur + 0.35), att = swell || 0.03;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const scoop = 1 - 0.02 * Math.exp(-t / 0.035); let sl = 0, sr = 0;
    notes.forEach((m, a) => det.forEach((d, b) => {
      phs[a][b] += mtof(m + d) * scoop / SR; const s = saw(phs[a][b] % 1);
      sl += s * [1, .6, .25][b]; sr += s * [.25, .6, 1][b];
    }));
    let e = Math.min(1, t / att); if (swell) e = e * e;
    e *= (t > dur ? Math.exp(-(t - dur) * 10) : 1);
    const c = 300 + cut * e * (swell ? 1 : 0.7 + 0.3 * Math.exp(-t * 5));
    const k = gain / notes.length;
    const vl = fl(sl, c, 0.8).lp * e * k, vr = fr(sr, c, 0.8).lp * e * k;
    PL[j] += vl * (1 - pan); PR[j] += vr * (1 + pan); REV[j] += (vl + vr) * 0.28;
  }
}
function choir(t0, notes, dur, { gain = 0.12, att = 0.6, rel = 1.2 } = {}) { // '아' 합창: 톱니파 → 모음 포먼트 3개
  const F = [[760, 4], [1180, 5], [2750, 7]], A = [1, 0.6, 0.32];
  const fl = F.map(() => svf()), fr = F.map(() => svf());
  const ph = notes.map(() => [(rnd() + 1) / 2, (rnd() + 1) / 2]), n = idx(dur + rel * 2.5);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let sl = 0, sr = 0;
    notes.forEach((m, a) => {
      const f = mtof(m), v1 = 1 + 0.005 * Math.sin(2 * Math.PI * 5.1 * t + a), v2 = 1 + 0.005 * Math.sin(2 * Math.PI * 4.7 * t + a * 2);
      ph[a][0] += f * 0.9975 * v1 / SR; ph[a][1] += f * 1.0025 * v2 / SR;
      sl += saw(ph[a][0] % 1); sr += saw(ph[a][1] % 1);
    });
    let ol = 0, or = 0; F.forEach(([fc, q], k) => { ol += fl[k](sl, fc, q).bp * A[k]; or += fr[k](sr, fc * 1.02, q).bp * A[k]; });
    const e = Math.min(1, t / att) * (t > dur ? Math.exp(-(t - dur) / rel * 2.2) : 1), k = gain / notes.length;
    PL[j] += ol * e * k; PR[j] += or * e * k; REV[j] += (ol + or) * e * k * 0.6;
  }
}
function glock(t0, m, g = 1) { // 글로켄슈필: 비조화 배음 + 짧은 타격
  events.glock.push([r4(t0), m]);
  const f0 = mtof(m), P = [[1, 1, 2.2], [2.76, .38, 4.5], [5.4, .18, 8], [8.93, .08, 12]], ph = P.map(() => 0), n = idx(1.8);
  const pan = Math.max(-0.6, Math.min(0.6, (m - 84) / 14));
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let s = 0; P.forEach(([r, a, d], k) => { ph[k] += f0 * r / SR; s += Math.sin(2 * Math.PI * ph[k]) * a * Math.exp(-t * d); });
    out(j, s * Math.min(1, t / 0.001) * 0.055 * g, pan, 'P', 0.35, 0.18);
  }
}
function flute(t0, m, dur, g = 1) { // 플루트: 사인 + 숨소리
  const f = svf(), n = idx(dur + 0.3); let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const fr = mtof(m) * (1 + 0.004 * Math.sin(2 * Math.PI * 5 * t) * Math.min(1, t * 2)); p += fr / SR;
    const s = Math.sin(2 * Math.PI * p) + Math.sin(4 * Math.PI * p) * 0.18 + f(rnd(), fr * 1.5, 2).bp * 0.25;
    const e = Math.min(1, t / 0.06) * (t > dur ? Math.exp(-(t - dur) * 8) : 1);
    out(j, s * e * 0.06 * g, -0.25, 'P', 0.45);
  }
}
function spic(t0, m, g = 1, pan = 0) { // 스피카토 현 (짧게 튕기는 활)
  const f = svf(), n = idx(0.22), ph = [(rnd() + 1) / 2, 0.4, 0.8];
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const fr = mtof(m); ph[0] += fr / SR; ph[1] += fr * 1.004 / SR; ph[2] += fr * 0.996 / SR;
    const s = saw(ph[0] % 1) + saw(ph[1] % 1) * 0.7 + saw(ph[2] % 1) * 0.7;
    const e = Math.min(1, t / 0.006) * Math.exp(-t * 17);
    out(j, f(s, 2600, 0.8).lp * e * 0.045 * g, pan, 'P', 0.25);
  }
}
function ks(t0, m, g, len, damp, pan, bright = 0.5, bus = 'M') { // 카플러스-스트롱 현 (뮤트 기타·베이스용)
  const f0 = mtof(m), P = Math.max(2, Math.round(SR / f0)), buf = new Float32Array(P);
  let lp = 0; for (let i = 0; i < P; i++) { lp = lp * (1 - bright) + rnd() * bright; buf[i] = lp; }
  const n = idx(len); let p = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const j = idx(t0) + i; if (j >= N) break;
    const y = buf[p]; buf[p] = (y + prev) * 0.5 * damp; prev = y; p = (p + 1) % P;
    const t = i / SR, e = Math.exp(-t * (1 / len) * 2.5);
    out(j, y * e * 0.28 * g, pan, bus, 0.12);
  }
}
function mute(t0, notes, g = 1) { notes.forEach((m, i) => ks(t0 + i * 0.007, m, g * 0.55, 0.16, 0.9, i % 2 ? 0.35 : -0.25, 0.7)); } // 뮤트 기타 스트럼
function bass2(t0, m, dur, g = 1) { // 핑거 베이스: 사인 + 부드러운 톱니
  const f = svf(); let p = 0; const n = idx(dur + 0.06);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    p += mtof(m) / SR;
    const s = Math.sin(2 * Math.PI * p) * 0.9 + saw(p % 1) * 0.35;
    const e = Math.min(1, t / 0.004) * Math.exp(-t * 1.6) * (t > dur ? Math.exp(-(t - dur) * 40) : 1);
    out(j, Math.tanh(f(s, 380 + 700 * Math.exp(-t * 22), 0.9).lp * 1.6) * e * 0.4 * g, 0, 'M');
  }
}
function snareB(t0, g = 1) { // 어쿠스틱 스네어: 몸통 + 스네어 줄
  const f = svf(), n = idx(0.28);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const body = (Math.sin(2 * Math.PI * 185 * t) * 0.6 + Math.sin(2 * Math.PI * 330 * t) * 0.3) * Math.exp(-t * 24);
    const nz = f(rnd(), 3400, 0.7).bp * Math.exp(-t * 13) * 1.2;
    out(j, (body + nz) * Math.min(1, t / 0.001) * 0.5 * g, 0.05, 'D', 0.3);
  }
}
function tom(t0, m, g = 1, pan = 0) {
  const f0 = mtof(m), f = svf(), n = idx(0.55); let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    p += f0 * (1 + 0.45 * Math.exp(-t * 22)) / SR;
    const v = (Math.sin(2 * Math.PI * p) * Math.exp(-t * 6.5) + f(rnd(), f0 * 4, 0.8).bp * Math.exp(-t * 40) * 0.25) * 0.55 * g;
    out(j, v, pan, 'D', 0.25);
  }
}
function shaker(t0, g = 1) {
  const f = svf(), n = idx(0.08);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    out(j, f(rnd(), 6800, 1.2).bp * Math.min(1, t / 0.012) * Math.exp(-t * 45) * 0.22 * g, 0.3, 'D');
  }
}
function snap(t0, g = 1) { // 핑거 스냅
  const f = svf(), n = idx(0.12);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    out(j, f(rnd(), 2300, 3).bp * Math.exp(-t * 55) * 0.9 * g, -0.2, 'D', 0.35);
  }
}
function revcym(tEnd, len, g = 1) { // 거꾸로 감긴 심벌: 다음 장면 직전에 빨려 들어가는 소리
  const f = svf(), n = idx(len), j0 = idx(tEnd - len);
  for (let i = 0; i < n; i++) {
    const j = j0 + i; if (j < 0 || j >= N) continue;
    const p = i / n; out(j, f(rnd(), 6500, 0.6).hp * p * p * p * 0.4 * g, 0, 'D', 0.3);
  }
}
function whoosh(tEnd, len, g = 1) { // 사진 전환용 휙
  const f = svf(), n = idx(len), j0 = idx(tEnd - len);
  for (let i = 0; i < n; i++) {
    const j = j0 + i; if (j < 0 || j >= N) continue;
    const p = i / n; out(j, f(rnd(), 400 + 5200 * p * p, 1.6).bp * Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.1)), 2) * 0.3 * g, (p - 0.5) * 1.2, 'P', 0.2);
  }
}
function timpRoll(t0, len, m, g0 = 0.2, g1 = 0.8) { for (let t = 0; t < len; t += 0.055) timpani(t0 + t, m, g0 + (g1 - g0) * t / len, 0.5); }
function hit(t0, ch, g = 1, { kickOn = true, len = 1.2 } = {}) { // 오케스트라 히트: 팀파니 + 금관 + 현 + 심벌
  const [root, ns] = C[ch];
  if (kickOn) kick(t0, 1.05 * g);
  crash(t0, 0.9 * g, 2.6); timpani(t0, root + 12 > 50 ? root : root + 12, 0.9 * g, 2);
  brass(t0, [ns[0], ns[2], ns[3], ns[1] + 12], len, { gain: 0.16 * g, cut: 3800 });
  strings(t0, ns.map(m => m + 12), len, { gain: 0.07 * g, att: 0.02, rel: 0.5, cut: 4500 });
}

// ================= 편곡 =================
// 1편과 같은 주제 선율 (G장조, 코드 G · D/F# · Em · C 에 맞춤) — 시리즈 통일감
const MEL = [
  [[0, 74, 2], [3, 71, 2], [6, 74, 2], [8, 79, 4], [12, 76, 4]],
  [[0, 78, 3], [3, 76, 2], [6, 74, 2], [8, 69, 4], [12, 74, 2], [14, 76, 2]],
  [[0, 79, 3], [3, 78, 2], [6, 76, 2], [8, 71, 4], [12, 74, 2], [14, 76, 2]],
  [[0, 76, 3], [3, 74, 2], [6, 72, 2], [8, 71, 6]],
];
const up = (mel, k) => mel.map(([s, m, l]) => [s, m + k, l]);
const chordOf = b => C[PROG[b]];
const play = (b, mel, fn) => { let prev = null; mel.forEach(([s, m, l]) => { fn(T(b, s), m, l * S16, prev); prev = m; }); };
const vio = (b, mel, g = 1, k = 0) => play(b, up(mel, k), (t, m, d, pv) => violin(t, m, d * 1.05, g, { from: pv != null && Math.abs(pv - m) <= 5 ? pv : null }));

// --- 인트로 0:00: 조율음 A → 5도 → 피아노 솔로 ---
tune(T(0), 69, 2.6, 1, -0.1);            // 오보에 A
tune(T(0, 10), 57, 1.4, 0.7, 0.3);       // 첼로 A
tune(T(0, 12), 64, 1.2, 0.6, -0.4);      // 비올라 E
tune(T(1, 2), 76, 1.0, 0.5, 0.5);        // 바이올린 E
riser(T(1), BAR, 0.4);
for (let b = 2; b < 6; b++) {            // 피아노 주제 (느리게)
  const [root] = chordOf(b);
  piano(T(b), root + 12, BAR * 0.95, 0.8); piano(T(b), root + 19, BAR * 0.95, 0.5);
  MEL[b % 4].forEach(([s, m, l]) => piano(T(b, s), m - 12, l * S16 * 1.3, 0.75 + (s === 0 ? 0.15 : 0)));
}
strings(T(4), chordOf(4)[1], BAR * 2, { gain: 0.06, att: 1.6 });
choir(T(4, 8), chordOf(5)[1], BAR * 1.4, { gain: 0.07, att: 1.2 });
revcym(T(6, 2), 1.6, 0.8);

// --- 타이틀 0:12: '광평중학교' 쾅(6마디 2/16) → '음악중점반'(11/16) ---
{ const [root, ns] = chordOf(6);
  piano(T(6), root, BAR, 0.7); strings(T(6), ns, BAR * 2, { gain: 0.08, att: 0.3 });
  hit(T(6, 2), 'Em', 1.0, { kickOn: true, len: 0.9 });
  hit(T(6, 11), 'C', 0.8, { kickOn: false, len: 0.6 }); timpani(T(6, 11), 36 + 12, 0.8);
  for (let s = 0; s < 16; s += 2) spic(T(7, s), [64, 60, 67, 64, 72, 67, 76, 72][s / 2], 0.8, s % 4 ? 0.3 : -0.3);
  brass(T(7), [52, 55, 60, 64], BAR * 0.9, { gain: 0.08, swell: 1.4 });
  whoosh(T(8), 0.5, 1); }

// --- 처음 만나는 악기 0:16 ---
for (let b = 8; b < 16; b++) {
  const [root, ns] = chordOf(b);
  piano(T(b), root, BAR * 0.9, 0.6); piano(T(b), root + 12, BAR * 0.9, 0.4);
  const pat = [ns[0], ns[1], ns[2], ns[3], ns[2], ns[1], ns[2], ns[3]];
  pat.forEach((m, e) => piano(T(b, e * 2), m, S16 * 3, 0.36 + (e % 4 === 0 ? 0.1 : 0)));
  strings(T(b), ns.map(m => m - 12), BAR, { gain: 0.075, att: 0.5 });
  bass2(T(b), root, BAR * 0.9, 0.55);
}
glock(T(8, 2), 79, 0.7); glock(T(8, 6), 83, 0.6); glock(T(9, 2), 81, 0.6); glock(T(9, 6), 86, 0.5);
// 현악 · 목관 · 금관 · 타악이 한 계열씩 등장 (10마디부터 두 박마다)
{ const t = [T(10, 0), T(10, 8), T(11, 0), T(11, 8)];
  [64, 67, 71, 76].forEach((m, i) => pluck(t[0] + i * 0.05, m, 1, i % 2 ? 0.4 : -0.4)); spic(t[0] + 0.25, 71, 1); spic(t[0] + 0.5, 76, 1);
  flute(t[1], 79, 0.45, 1.2); flute(t[1] + 0.5, 84, 0.45, 1);
  brass(t[2], [55, 60, 64, 67], 0.7, { gain: 0.14, cut: 3600 });
  timpani(t[3], 43, 0.8); snareB(t[3] + 0.25, 0.6); snareB(t[3] + 0.375, 0.7); tom(t[3] + 0.5, 50, 0.7); tom(t[3] + 0.625, 45, 0.8);
}
// 3년, 악기 하나를 끝까지 → 신입생 환영
for (let b = 12; b < 14; b++) { vio(b, MEL[b % 4], 0.85); choir(T(b), chordOf(b)[1], BAR, { gain: 0.06, att: 0.5 }); }
for (let b = 14; b < 16; b++) {
  MEL[b % 4].forEach(([s, m, l]) => { piano(T(b, s), m + 12, l * S16, 0.5); glock(T(b, s), m + 12, 0.45); });
  for (let q = 0; q < 4; q++) { if (b === 15 && q === 3) break; kick(T(b, q * 4), 0.45); }
  clap(T(b, 4), 0.55); clap(T(b, 12), 0.55); for (let s = 0; s < 16; s += 2) shaker(T(b, s), s % 4 ? 0.6 : 1);
}
riser(T(15), BAR, 0.5); whoosh(T(16), 0.8, 0.9);

// --- 학교 음악 공간 0:32 (16~21마디): 스냅·셰이커·피치카토 워킹베이스 + 글로켄슈필 ---
{ const b0 = SEC.space[0];
  for (let b = b0; b < b0 + 4; b++) {
    const [root, ns] = chordOf(b);
    [0, 7, 12, 7].forEach((d, q) => ks(T(b, q * 4), root + d + 12, 1.6, 0.5, 0.996, -0.1, 0.5, 'M')); // 워킹 베이스 (근음 → 5도 → 옥타브 → 5도)
    kick(T(b), 0.65); kick(T(b, 8), 0.55); snap(T(b, 4), 1.5); snap(T(b, 12), 1.5);
    for (let s = 0; s < 16; s += 2) shaker(T(b, s + (s % 4 ? 0.3 : 0)), s % 4 ? 0.75 : 1.2); // 살짝 스윙
    [2, 6, 10, 14].forEach(s => piano(T(b, s), ns[1], S16 * 1.2, 0.5)); [2, 6, 10, 14].forEach(s => piano(T(b, s), ns[3], S16 * 1.2, 0.45));
    strings(T(b), ns, BAR, { gain: 0.065, att: 0.4 });
  }
  // 제목(0~5박): 올라가는 종소리
  [72, 76, 79, 84, 88].forEach((m, i) => glock(T(b0, i * 2), m, 1));
  // 장소 5곳: 두 박마다 전환(6박째부터) → 휙 + 종소리 세 음
  for (let i = 0; i < 5; i++) {
    const tc = T(b0) + BEAT * (6 + i * 2), ns = chordOf(Math.floor(tc / BAR))[1];
    whoosh(tc, 0.35, 0.8);
    [ns[3] + 12, ns[1] + 24, ns[2] + 24].forEach((m, k) => glock(tc + k * S16, m, 1 - k * 0.15));
  }
  // 6장 그리드(20마디): 사진이 튀어나올 때마다 한 음씩 → 문장 등장에 맞춰 현 + 합창
  const bg = b0 + 4, tg = T(bg);
  [72, 76, 79, 83, 86, 91].forEach((m, j) => glock(tg + j * S16 * 0.8, m, 0.7));
  kick(tg, 0.6); crash(tg, 0.35, 2);
  const [rC, nC] = chordOf(bg), [rD, nD] = chordOf(bg + 1);
  strings(T(bg, 2), nC.map(m => m + 12), BAR * 0.95, { gain: 0.09, att: 0.4 }); choir(T(bg, 2), nC, BAR, { gain: 0.08, att: 0.4 });
  piano(T(bg, 2), rC + 12, BAR, 0.6); nC.forEach((m, k) => piano(T(bg, 2) + k * 0.04, m + 12, BAR, 0.4));
  vio(bg, [[4, 76, 4], [8, 79, 4], [12, 83, 4]], 0.7);
  strings(T(bg + 1), nD.map(m => m + 12), BAR * 0.75, { gain: 0.08, att: 0.3, rel: 0.5 }); piano(T(bg + 1), rD + 12, BAR * 0.8, 0.5);
  vio(bg + 1, [[0, 81, 10]], 0.6);
  for (let s = 0; s < 12; s += 2) ks(T(bg + 1, s), nD[s / 2 % 4] + 12, 0.8, 0.5, 0.995, s % 4 ? 0.4 : -0.4, 0.5, 'P');
  revcym(T(SEC.grow[0]), 1.1, 0.6);
}

// --- STEP 01 1:1 레슨 → 02 파트 연습 → 03 오케스트라 합주 (22~33마디): 악기가 한 겹씩 쌓임 ---
const CELLO = [ // Em C G D
  [[0, 52, 4], [4, 55, 4], [8, 59, 6], [14, 57, 2]], [[0, 55, 6], [6, 52, 2], [8, 60, 8]],
  [[0, 59, 4], [4, 62, 4], [8, 59, 4], [12, 55, 4]], [[0, 57, 8], [8, 54, 4], [12, 57, 4]]];
const VLN = [
  [[0, 71, 4], [4, 74, 4], [8, 76, 6], [14, 74, 2]], [[0, 72, 6], [6, 71, 2], [8, 67, 8]],
  [[0, 71, 4], [4, 74, 4], [8, 79, 4], [12, 78, 4]], [[0, 78, 8], [8, 74, 4], [12, 81, 4]]];
for (let b = SEC.grow[0]; b < SEC.grow[1] - 1; b++) {
  const k = b - SEC.grow[0], q = k % 4, [root, ns] = chordOf(b);
  strings(T(b), ns, BAR, { gain: k < 4 ? 0.035 : 0.05, att: 0.4, cut: 2600 });
  pluck(T(b), root + 12, 1, -0.2); pluck(T(b, 8), root + 19, 0.8, 0.2); // 피치카토 베이스
  if (k < 4) { vio(b, CELLO[q], 1.0); if (q % 2) piano(T(b, 8), ns[3] + 12, BAR / 2, 0.3); }
  if (k >= 4) { // 파트 연습: 피치카토 8분 + 바이올린 + 셰이커
    const pz = [ns[0] + 12, ns[2], ns[1] + 12, ns[2], ns[3], ns[2], ns[1] + 12, ns[3]];
    pz.forEach((m, e) => pluck(T(b, e * 2), m, 0.8, e % 2 ? 0.35 : -0.35));
    vio(b, k < 8 ? VLN[q] : up(VLN[q], 12), k < 8 ? 0.9 : 0.8);
    if (k < 8) vio(b, CELLO[q], 0.55);
    for (let s = 0; s < 16; s += 2) shaker(T(b, s), 0.6);
    kick(T(b), 0.5); kick(T(b, 8), 0.45);
  }
  if (k >= 8) { // 오케스트라: 스피카토 + 금관 + 팀파니 + 비트
    for (let s = 0; s < 16; s += 2) spic(T(b, s), [ns[0], ns[2], ns[3], ns[2]][s / 2 % 4] + 12, 0.9, s % 4 ? 0.35 : -0.35);
    brass(T(b), [ns[0] - 12, ns[1] - 12, ns[2] - 12], BAR * 0.95, { gain: 0.09, swell: 1.2 });
    timpani(T(b), root < 40 ? root + 12 : root, 0.7); kick(T(b, 4), 0.55); kick(T(b, 12), 0.5);
    snareB(T(b, 4), 0.5); snareB(T(b, 12), 0.55); clap(T(b, 12), 0.35);
    vio(b, CELLO[q], 0.5); choir(T(b), ns, BAR, { gain: 0.05, att: 0.5 });
  }
}
{ const b = SEC.grow[1] - 1, [root, ns] = chordOf(b); // '하나 둘 셋 넷': 박마다 오케스트라 타격
  [0, 1, 2, 3].forEach(i => {
    const t = T(b, i * 4), g = 0.55 + i * 0.15;
    timpani(t, [38, 40, 42, 43][i], g); kick(t, g); snareB(t, g * 0.8);
    brass(t, [ns[0], ns[1], ns[2], ns[3]].map(m => m + (i === 3 ? 12 : 0)), 0.3, { gain: 0.11 * g, cut: 3500 });
    spic(t, ns[i % 4] + 12, 1.1);
  });
  for (let s = 8; s < 16; s++) snareB(T(b, s), 0.25 + (s - 8) / 8 * 0.5);
  riser(T(b - 1), BAR * 2, 0.9); revcym(T(b + 1), 1.2, 1);
}

// --- 무대 (34~49마디): 오케스트라 팝 그루브. 4마디마다 드럼 필인, 뒤 8마디는 코드 진행이 바뀜 ---
const STAGE_B = [ // C D Bm Em | C D G C
  [[0, 76, 3], [3, 79, 3], [6, 76, 2], [8, 72, 4], [12, 74, 4]], [[0, 74, 3], [3, 78, 3], [6, 81, 2], [8, 78, 4], [12, 74, 4]],
  [[0, 74, 3], [3, 78, 3], [6, 81, 2], [8, 83, 6], [14, 81, 2]], [[0, 79, 6], [6, 78, 2], [8, 76, 8]],
  [[0, 72, 2], [2, 74, 2], [4, 76, 4], [8, 79, 4], [12, 76, 4]], [[0, 78, 4], [4, 81, 4], [8, 86, 6], [14, 84, 2]],
  [[0, 83, 8], [8, 81, 4], [12, 79, 4]], [[0, 76, 14]]];
function groove(b, { fill = false, big = false } = {}) {
  for (let q = 0; q < 4; q++) { if (fill && q === 3) break; kick(T(b, q * 4), q ? 0.9 : 1); }
  kick(T(b, 7), 0.35); // 싱코페이션 고스트 킥
  snareB(T(b, 4), 0.85); snareB(T(b, 12), 0.9); clap(T(b, 4), 0.55); clap(T(b, 12), 0.6);
  [3, 9, 11].forEach(s => snareB(T(b, s), 0.12)); // 고스트 노트
  for (let s = 0; s < 16; s += 2) hat(T(b, s), s === 14, s % 4 ? 0.45 : 0.6);
  for (let s = 1; s < 16; s += 2) shaker(T(b, s), 0.5);
  if (fill) { [[12, 57], [13, 55], [14, 50], [15, 45]].forEach(([s, m], i) => tom(T(b, s), m, 0.7 + i * 0.08, 0.5 - i * 0.33)); snareB(T(b, 14), 0.5); }
  const [root, ns] = chordOf(b);
  [[0, root, 3], [3, root, 1], [6, root + 12, 2], [8, root + 7, 3], [11, root, 1], [14, root + 12, 2]]
    .forEach(([s, m, l]) => bass2(T(b, s), m, l * S16, 0.9));
  [2, 6, 10, 14].forEach(s => mute(T(b, s), [ns[0] + 12, ns[1] + 12, ns[2] + 12], 0.9)); // 뮤트 기타 오프비트
  [7, 15].forEach(s => mute(T(b, s), [ns[1] + 12, ns[2] + 12], 0.45));
  brass(T(b), ns, S16 * 2.5, { gain: 0.11 * (big ? 1.2 : 1), cut: 3400 }); brass(T(b, 10), ns, S16 * 1.5, { gain: 0.09, cut: 3000 });
  [4, 12].forEach(s => { ns.forEach((m, k) => piano(T(b, s) + k * 0.012, m + 12, S16 * 1.5, 0.3)); });
  strings(T(b), ns, BAR, { gain: big ? 0.07 : 0.05, att: 0.2, cut: 3200 });
}
{ const s0 = SEC.stage[0];
  hit(T(s0), 'G', 1.05);
  for (let b = s0; b < SEC.stage[1]; b++) {
    const k = b - s0, fill = k % 4 === 3 && b !== SEC.stage[1] - 1;
    groove(b, { fill, big: k >= 8 });
    if (k >= 4 && k < 8) { vio(b, MEL[k % 4], 1.0); for (let s = 0; s < 16; s += 2) spic(T(b, s), chordOf(b)[1][(s / 2) % 4] + 12, 0.5); }
    if (k >= 8) {
      vio(b, STAGE_B[k - 8], 1.05);
      if (k < 12) choir(T(b), chordOf(b)[1], BAR, { gain: 0.07, att: 0.3 });
      for (let s = 0; s < 16; s += 2) spic(T(b, s), chordOf(b)[1][[0, 2, 1, 3][(s / 2) % 4]] + 12, 0.75, s % 4 ? 0.4 : -0.4);
      brass(T(b), chordOf(b)[1].slice(1).map(m => m - 12), BAR * 0.9, { gain: 0.06, swell: 0.8 });
    }
  }
  crash(T(s0 + 4), 0.6); crash(T(s0 + 8), 0.95); timpani(T(s0 + 8), 36 + 12, 0.8); crash(T(s0 + 12), 0.7);
  // 48마디: 사진 12장이 두 16분음표마다 튀어나옴 → 종소리 계단
  const bg = SEC.stage[1] - 2;
  [67, 71, 74, 79, 83, 86, 79, 83, 86, 91, 88, 91].forEach((m, j) => glock(T(bg, j * 2), m, 0.65));
  // 49마디 '우리 학교에서, 이웃 학교로, 경북의 가장 큰 무대까지' → 필인 → 브레이크
  hit(T(bg + 1), 'C', 0.8, { kickOn: false, len: 1.2 });
  [[8, 62], [10, 57], [12, 55], [13, 52], [14, 50], [15, 45]].forEach(([s, m], i) => tom(T(bg + 1, s), m, 0.6 + i * 0.07, 0.5 - i * 0.2));
  snareB(T(bg + 1, 14), 0.8); snareB(T(bg + 1, 15), 1);
}

// --- 브레이크 (50~51마디): '그리고 1년에 한 번, 가장 큰 무대' ---
{ const b = SEC.brk[0], [r0, n0] = chordOf(b), [r1, n1] = chordOf(b + 1);
  strings(T(b), n0, BAR, { gain: 0.1, att: 0.25, cut: 3000 }); choir(T(b), n0, BAR, { gain: 0.09, att: 0.3 });
  piano(T(b), r0 + 12, BAR, 0.7); MEL[2].forEach(([s, m, l]) => piano(T(b, s), m, l * S16 * 1.2, 0.85));
  bass2(T(b), r0, BAR * 0.95, 0.6);
  // 51마디(E): 박수 롤 → 한 글자씩, 팀파니 롤, A장조로 넘어갈 준비
  strings(T(b + 1), n1, BAR, { gain: 0.1, att: 0.1, cut: 3500 }); brass(T(b + 1), n1, BAR * 0.95, { gain: 0.1, swell: 1.6 });
  bass2(T(b + 1), r1, BAR * 0.95, 0.7); vio(b + 1, [[0, 80, 8], [8, 83, 8]], 0.9);
  for (let s = 0; s < 16; s++) if (s < 8 ? s % 4 === 0 : s < 12 ? s % 2 === 0 : true) { clap(T(b + 1, s), 0.3 + s / 16 * 0.65); snareB(T(b + 1, s), 0.15 + s / 16 * 0.4); }
  timpRoll(T(b + 1, 8), BAR / 2, 40, 0.15, 0.7);
  riser(T(b + 1), BAR, 1.1); revcym(T(b + 2), 1.4, 1);
}

// --- 클라이맥스 (52~59마디): 정기연주회. A장조로 전조, 합창·금관·스피카토 ---
const CLX = [up(MEL[0], 2), up(MEL[1], 2), up(MEL[2], 2), up(MEL[3], 2),
  [[0, 78, 3], [3, 81, 3], [6, 86, 2], [8, 85, 4], [12, 83, 4]], [[0, 83, 3], [3, 85, 3], [6, 88, 2], [8, 86, 4], [12, 85, 2], [14, 83, 2]],
  [[0, 85, 8], [8, 83, 4], [12, 81, 4]], [[0, 81, 16]]];
{ const c0 = SEC.climax[0];
  hit(T(c0), 'A', 1.15);
  for (let b = c0; b < SEC.climax[1]; b++) {
    const k = b - c0, [root, ns] = chordOf(b), last = b === SEC.climax[1] - 1;
    for (let q = 0; q < 4; q++) kick(T(b, q * 4), q ? 0.95 : 1.05);
    snareB(T(b, 4), 0.95); snareB(T(b, 12), 1); clap(T(b, 4), 0.5); clap(T(b, 12), 0.55);
    for (let s = 0; s < 16; s += 2) hat(T(b, s), s % 4 === 2, s % 4 ? 0.4 : 0.55);
    if (k >= 1 && k <= 5) { crash(T(b), 0.55, 1.8); timpani(T(b), root < 40 ? root + 12 : root, 0.85); } // 연혁: 한 해 넘어갈 때마다
    for (let s = 0; s < 16; s += 2) bass2(T(b, s), s % 8 === 6 ? root + 7 : root, S16 * 1.6, 0.85);
    for (let s = 0; s < 16; s += 2) spic(T(b, s), [ns[0], ns[2], ns[3], ns[2]][(s / 2) % 4] + (s < 8 ? 0 : 12), 0.6 + (s % 4 ? 0 : 0.3), s % 4 ? 0.45 : -0.45);
    brass(T(b), [ns[0] - 12, ns[1] - 12, ns[2] - 12, ns[3] - 12], BAR * 0.92, { gain: 0.1, swell: 0.25, cut: 3200 });
    brass(T(b, 14), ns, S16 * 1.8, { gain: 0.08, cut: 3600 });
    strings(T(b), ns.map(m => m + 12), BAR, { gain: 0.07, att: 0.15, cut: 4200 });
    choir(T(b), ns, BAR, { gain: 0.1, att: 0.2, rel: 0.8 });
    vio(b, CLX[k], 1.1); CLX[k].forEach(([s, m, l]) => piano(T(b, s), m + 12, l * S16, 0.35));
    if (last) { for (let s = 8; s < 16; s++) snareB(T(b, s), 0.35 + (s - 8) / 8 * 0.6); timpRoll(T(b, 8), BAR / 2, 45, 0.3, 0.9); }
  }
  riser(T(SEC.climax[1] - 2), BAR * 2, 0.9); revcym(T(SEC.climax[1]), 1.5, 1.1);
}

// --- 엔딩 (60~69마디): 한 문장 → 모집 안내 카드 3장 → 조율음 A ---
{ const o0 = SEC.outro[0];
  hit(T(o0), 'A', 1.2, { len: 3 });
  bass2(T(o0), 45, BAR, 1); choir(T(o0), C.A[1], BAR * 2, { gain: 0.09, att: 0.1, rel: 1.5 });
  vio(o0, [[0, 81, 8], [8, 85, 8]], 0.8); vio(o0 + 1, [[0, 86, 8], [8, 81, 8]], 0.7);
  for (let b = o0 + 1; b < SEC.outro[1]; b++) {
    const [root, ns] = chordOf(b), lastTwo = b >= SEC.outro[1] - 2;
    strings(T(b), ns, lastTwo ? BAR * 1.8 : BAR, { gain: lastTwo ? 0.08 : 0.09, att: 0.4, rel: lastTwo ? 1.6 : 0.9 });
    if (!lastTwo) {
      piano(T(b), root, BAR, 0.55);
      const pat = [ns[0], ns[1], ns[2], ns[3], ns[2], ns[1], ns[2], ns[3]];
      pat.forEach((m, e) => piano(T(b, e * 2), m + 12, S16 * 3, 0.3 + (e % 4 === 0 ? 0.08 : 0)));
      if (b >= o0 + 2) for (let s = 0; s < 16; s += 4) ks(T(b, s), root + 12, 0.7, 0.45, 0.996, -0.1, 0.5, 'M');
    }
  }
  // 카드 넘어갈 때마다 종소리
  [[o0 + 2, [81, 85, 88]], [o0 + 4, [78, 81, 85]], [o0 + 6, [81, 85, 88, 93]]].forEach(([b, ms]) => ms.forEach((m, k) => glock(T(b) + k * S16, m, 0.55)));
  MEL.forEach((mel, i) => { if (i < 4) mel.forEach(([s, m, l]) => piano(T(o0 + 2 + i, s), m + 2, l * S16 * 1.3, 0.55)); }); // 주제 선율을 A장조로 한 번 더
  const bl = SEC.outro[1] - 2; // 마지막 A 코드를 아르페지오로 굴리고 여운
  [57, 61, 64, 69, 73, 76, 81].forEach((m, i) => piano(T(bl, i), m, BAR * 2.5 - i * S16, 0.55));
  glock(T(bl, 8), 93, 0.4);
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
