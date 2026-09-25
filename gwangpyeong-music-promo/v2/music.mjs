// 광평중 음악중점반 홍보영상 2편 BGM — 오리지널 시네마틱 오케스트라 (120 BPM, 60마디 = 정확히 2분)
// 외부 샘플 0개. 현·금관·목관·하프·팀파니·큰북·심벌즈를 전부 코드로 합성해서 저작권 걱정 없이 써도 됩니다.
// 흐름: 조율(A음) → 피아노 → 하프·현·플루트 → 피치카토와 스피카토 → 투티 → 클라이맥스 → 엔딩
import fs from 'fs';

const SR = 44100, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, S16 = BEAT / 4;
const BARS = 60, DUR = BARS * BAR, N = Math.round(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);         // 타악기
const OL = new Float32Array(N), OR = new Float32Array(N);       // 오케스트라
const REV = new Float32Array(N);                                // 홀 리버브 센드
// 영상 싱크용 이벤트 (이름은 1편 규칙 유지: kick=큰북, clap=스네어 악센트, stab=금관 화음, lead=주제 선율)
const events = { kick: [], clap: [], stab: [], lead: [], piano: [], pluck: [], crash: [], riser: [], tune: [], boom: [] };

// ---- 구성 (마디 번호) ----
export const SEC = {
  intro: [0, 6],     // 0:00 조율음 → 피아노 솔로
  start: [6, 16],    // 0:12 하프 + 현 + 플루트
  grow: [16, 28],    // 0:32 피치카토 → 스피카토, 큰북이 조금씩
  stage: [28, 44],   // 0:56 투티 (현 스피카토 + 금관 리듬)
  brk: [44, 46],     // 1:28 브레이크
  climax: [46, 54],  // 1:32 클라이맥스 (트럼펫·바이올린 주제)
  outro: [54, 60],   // 1:48 엔딩
};
const inS = (b, s) => b >= SEC[s][0] && b < SEC[s][1];

const C = { // [베이스 루트, 코드음]
  G: [43, [55, 59, 62, 67]], DF: [42, [54, 57, 62, 66]], Em: [40, [52, 55, 59, 64]], C: [36, [52, 55, 60, 64]],
  Am: [45, [52, 57, 60, 64]], D: [38, [54, 57, 62, 66]], Cm7: [36, [52, 55, 59, 64]],
};
const PROG = [];
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
const put = (j, l, r, rev) => { OL[j] += l; OR[j] += r; REV[j] += (l + r) * rev; };

// ================= 타악기 =================
function bassDrum(t0, g = 1) { // 오케스트라 큰북
  events.kick.push([r4(t0), g]);
  const f = svf(), n = idx(1.4); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    ph += (48 + 22 * Math.exp(-t * 14)) / SR;
    const v = (Math.sin(2 * Math.PI * ph) * Math.exp(-t * 3.2) + f(rnd(), 180, 0.6).lp * Math.exp(-t * 18) * 1.4) * g * 0.9 * Math.min(1, t / 0.004);
    L[j] += v; R[j] += v; REV[j] += v * 0.35;
  }
}
function snare(t0, g = 1, accent = false) { // 오케스트라 스네어
  if (accent) events.clap.push(r4(t0));
  const f = svf(), n = idx(0.22);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const v = (f(rnd(), 3200, 0.7).bp * 1.1 + Math.sin(2 * Math.PI * 185 * t) * 0.35 * Math.exp(-t * 40)) * Math.exp(-t * 20) * g * 0.5;
    L[j] += v * 0.9; R[j] += v; REV[j] += v * 0.35;
  }
}
function roll(t0, len, g0, g1, accentEnd = false) { // 스네어 롤 (32분음표)
  const step = S16 / 2, n = Math.round(len / step);
  for (let i = 0; i < n; i++) snare(t0 + i * step + rnd() * 0.004, g0 + (g1 - g0) * i / n);
  if (accentEnd) events.clap.push(r4(t0 + len));
}
function cymbal(t0, g = 1, len = 3.2) { // 크래시 심벌즈
  events.crash.push(r4(t0));
  const f = svf(), f2 = svf(), n = idx(len);
  const parts = [3150, 4480, 5920, 7310, 8660].map(fr => ({ fr, ph: 0 }));
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let m = 0; for (const p of parts) { p.ph += p.fr * (1 + 0.002 * Math.sin(t * 7)) / SR; m += (p.ph % 1 < 0.5 ? 1 : -1); }
    const nz = f(rnd() + m * 0.08, 5200, 0.5).hp * Math.exp(-t * 1.25) * 0.4;
    const sh = f2(rnd(), 2500, 0.8).bp * Math.exp(-t * 9) * 0.3;
    const v = (nz + sh) * g;
    L[j] += v * (1 + rnd() * 0.08); R[j] += v; REV[j] += v * 0.5;
  }
}
function swell(t0, len, g = 1) { // 서스펜디드 심벌 롤 (점점 커짐)
  events.riser.push([r4(t0), len]);
  const f = svf(), n = idx(len + 0.4);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const p = Math.min(1, t / len), e = t < len ? p * p * p : Math.exp(-(t - len) * 8);
    const v = f(rnd(), 3000 + 5000 * p, 0.8).hp * e * 0.35 * g;
    L[j] += v; R[j] += v * 1.05; REV[j] += v * 0.5;
  }
}
function timpani(t0, m, g = 1, len = 1.8) {
  events.boom.push(r4(t0));
  const f0 = mtof(m), f = svf(), n = idx(len); let p1 = 0, p2 = 0, p3 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const fr = f0 * (1 + 0.05 * Math.exp(-t * 18));
    p1 += fr / SR; p2 += fr * 1.504 / SR; p3 += fr * 1.742 / SR;
    const v = (Math.sin(2 * Math.PI * p1) * Math.exp(-t * 2) + Math.sin(2 * Math.PI * p2) * 0.35 * Math.exp(-t * 4) + Math.sin(2 * Math.PI * p3) * 0.2 * Math.exp(-t * 6)
      + f(rnd(), 500, 0.7).lp * Math.exp(-t * 35) * 0.7) * g * 0.75 * Math.min(1, t / 0.002);
    L[j] += v; R[j] += v; REV[j] += v * 0.3;
  }
}
function timpRoll(t0, len, m, g0, g1) { const step = S16 / 2, n = Math.round(len / step); for (let i = 0; i < n; i++) timpani(t0 + i * step, m, g0 + (g1 - g0) * i / n, 0.5); }

// ================= 선율 악기 =================
function tune(t0, m, len, g = 1, pan = 0) { // 오보에 조율음
  events.tune.push([r4(t0), m, len]);
  const f = svf(), n = idx(len + 0.6); let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    p += mtof(m) * (1 + 0.0045 * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, Math.max(0, t - 0.6) * 1.5)) / SR;
    let s = 0; for (let k = 1; k <= 9; k++) s += Math.sin(2 * Math.PI * p * k) * [0, 1, .8, .9, .5, .45, .3, .2, .12, .08][k];
    const e = Math.min(1, t / 0.18) * (t > len ? Math.exp(-(t - len) * 6) : 1);
    const v = f(s, 3200, 0.8).lp * e * 0.03 * g;
    put(j, v * (1 - pan), v * (1 + pan), 0.5);
  }
}
function piano(t0, m, dur, g = 1) {
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
    const v = s * Math.min(1, t / 0.003) * (t > dur ? Math.exp(-(t - dur) * 7) : 1) * 0.11 * g;
    put(j, v * (1 - pan), v * (1 + pan), 0.38);
  }
}
function harp(t0, m, g = 1, pan = 0) { // 하프 (밝은 카플러스-스트롱)
  events.piano.push([r4(t0), m, 1, g]);
  const f0 = mtof(m), P = Math.max(2, Math.round(SR / f0)), buf = new Float32Array(P);
  for (let i = 0; i < P; i++) buf[i] = rnd() * (0.5 + 0.5 * Math.sin(Math.PI * i / P));
  const n = idx(2.2); let p = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const j = idx(t0) + i; if (j >= N) break;
    const y = buf[p]; buf[p] = (y * 0.7 + prev * 0.3) * 0.9985; prev = y; p = (p + 1) % P;
    const v = y * 0.5 * g;
    put(j, v * (1 - pan), v * (1 + pan), 0.45);
  }
}
function pizz(t0, m, g = 1, pan = 0) { // 현 피치카토
  events.pluck.push([r4(t0), m]);
  const f0 = mtof(m), P = Math.max(2, Math.round(SR / f0)), buf = new Float32Array(P);
  let lp = 0; for (let i = 0; i < P; i++) { lp = lp * 0.55 + rnd() * 0.45; buf[i] = lp; }
  const n = idx(0.7); let p = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const j = idx(t0) + i; if (j >= N) break;
    const y = buf[p]; buf[p] = (y + prev) * 0.5 * 0.993; prev = y; p = (p + 1) % P;
    const v = y * 0.6 * g * Math.exp(-(i / SR) * 4.5);
    put(j, v * (1 - pan), v * (1 + pan), 0.35);
  }
}
// 현악 합주: 음마다 여러 명이 약간씩 다른 음정·비브라토로 켜는 소리
function strings(t0, notes, dur, { gain = 0.1, att = 0.5, rel = 0.9, cut = 2600, trem = 0, pan = 0, cres = 0 } = {}) {
  const V = 5, fl = svf(), fr = svf(), hl = svf(), hr = svf();
  const vs = notes.flatMap(m => [...Array(V)].map((_, k) => ({ m, det: (rnd()) * 0.09, rate: 4.6 + rnd() * 0.8, dep: 0.0035 + rnd() * 0.0015, ph: (rnd() + 1) / 2, vph: rnd() * 6, pan: (k / (V - 1) - 0.5) * 1.4 + pan })));
  const n = idx(dur + rel * 2.5);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let sl = 0, sr = 0;
    for (const v of vs) {
      v.ph += mtof(v.m + v.det) * (1 + v.dep * Math.sin(2 * Math.PI * v.rate * t + v.vph)) / SR;
      const s = saw(v.ph % 1); sl += s * (1 - v.pan) * 0.5; sr += s * (1 + v.pan) * 0.5;
    }
    let e = Math.min(1, t / att) * (t > dur ? Math.exp(-(t - dur) / rel * 2.2) : 1);
    if (cres) e *= 0.25 + 0.75 * Math.min(1, t / dur) ** cres;
    if (trem) e *= 0.7 + 0.3 * Math.abs(Math.sin(2 * Math.PI * trem * t));
    const c = cut * (0.55 + 0.45 * Math.min(1, t / att)) * (cres ? 0.6 + 0.4 * Math.min(1, t / dur) : 1);
    const k = gain * e / vs.length * 1.8;
    const vl = hl(fl(sl, c, 0.6).lp, 140, 0.7).hp * k, vr = hr(fr(sr, c, 0.6).lp, 140, 0.7).hp * k;
    put(j, vl, vr, 0.32);
  }
}
function spic(t0, m, g = 1, pan = 0, len = 0.13) { // 스피카토 (짧게 튀기는 활)
  const f = svf(), ps = [0, 0, 0].map(() => (rnd() + 1) / 2), det = [-0.07, 0, 0.07], n = idx(len + 0.12);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let s = 0; det.forEach((d, k) => { ps[k] += mtof(m + d) / SR; s += saw(ps[k] % 1); });
    const e = Math.min(1, t / 0.006) * Math.exp(-t * (t > len ? 40 : 9));
    const v = f(s, 2200 + 1800 * Math.exp(-t * 20), 0.7).lp * e * 0.05 * g;
    put(j, v * (1 - pan), v * (1 + pan), 0.3);
  }
}
function brass(t0, notes, dur, { gain = 0.12, bright = 1, att = 0.03, pan = 0, stab = false } = {}) { // 금관
  if (stab) events.stab.push([r4(t0), r4(dur)]);
  const vs = notes.flatMap(m => [-0.05, 0.05].map(d => ({ m, d, ph: (rnd() + 1) / 2 })));
  const fl = svf(), fr = svf(), n = idx(dur + 0.35);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const scoop = -0.25 * Math.exp(-t * 30), vib = 0.003 * Math.sin(2 * Math.PI * 5.3 * t) * Math.min(1, Math.max(0, t - 0.3) * 2);
    let s = 0; for (const v of vs) { v.ph += mtof(v.m + v.d + scoop) * (1 + vib) / SR; s += saw(v.ph % 1); }
    const e = Math.min(1, t / att) * (t > dur ? Math.exp(-(t - dur) * 14) : 1);
    const c = 300 + (900 + 2600 * bright) * Math.min(1, t / (att + 0.05)) * (0.8 + 0.2 * Math.exp(-t * 3));
    const v0 = s / vs.length;
    const vl = Math.tanh(fl(v0, c, 0.8).lp * 1.5) * e * gain, vr = Math.tanh(fr(v0, c * 0.97, 0.8).lp * 1.5) * e * gain;
    put(j, vl * (1 - pan), vr * (1 + pan), 0.35);
  }
}
function flute(t0, m, dur, g = 1, pan = 0.2) {
  const f = svf(), n = idx(dur + 0.25); let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    p += mtof(m) * (1 + 0.005 * Math.sin(2 * Math.PI * 5 * t) * Math.min(1, t * 2)) / SR;
    const s = Math.sin(2 * Math.PI * p) + 0.25 * Math.sin(4 * Math.PI * p) + 0.08 * Math.sin(6 * Math.PI * p) + f(rnd(), mtof(m) * 2, 3).bp * 0.25;
    const e = Math.min(1, t / 0.07) * (t > dur ? Math.exp(-(t - dur) * 18) : 1);
    const v = s * e * 0.05 * g;
    put(j, v * (1 - pan), v * (1 + pan), 0.45);
  }
}

// ================= 편곡 =================
const MEL = [ // 1편과 같은 주제 선율
  [[0, 74, 2], [3, 71, 2], [6, 74, 2], [8, 79, 4], [12, 76, 4]],
  [[0, 78, 3], [3, 76, 2], [6, 74, 2], [8, 69, 4], [12, 74, 2], [14, 76, 2]],
  [[0, 79, 3], [3, 78, 2], [6, 76, 2], [8, 71, 4], [12, 74, 2], [14, 76, 2]],
  [[0, 76, 3], [3, 74, 2], [6, 72, 2], [8, 71, 6]],
];
const chordOf = b => C[PROG[b]];
const low = b => { const [r] = chordOf(b); return [r, r + 12]; };

// --- 인트로: 조율음 A → 피아노 솔로 ---
tune(T(0), 69, 2.6, 1, -0.1); tune(T(0, 10), 57, 1.4, 0.7, 0.3); tune(T(0, 12), 64, 1.2, 0.6, -0.4); tune(T(1, 2), 76, 1.0, 0.5, 0.5);
swell(T(1), BAR, 0.35);
for (let b = 2; b < 6; b++) {
  const [root] = chordOf(b);
  piano(T(b), root + 12, BAR * 0.95, 0.8); piano(T(b), root + 19, BAR * 0.95, 0.5);
  MEL[b % 4].forEach(([s, m, l]) => piano(T(b, s), m - 12, l * S16 * 1.3, 0.75 + (s === 0 ? 0.15 : 0)));
}
strings(T(4), chordOf(4)[1], BAR * 2, { gain: 0.05, att: 1.6 });

// --- 시작: 하프 아르페지오 + 현 + 플루트 ---
for (let b = SEC.start[0]; b < SEC.start[1]; b++) {
  const [root, ns] = chordOf(b);
  const arp = [root + 12, ns[0], ns[1], ns[2], ns[3], ns[2] + 12, ns[3], ns[1]];
  arp.forEach((m, e) => harp(T(b, e * 2), m, 0.5 + (e === 0 ? 0.2 : 0), (e / 7 - 0.5) * 0.8));
  strings(T(b), low(b), BAR, { gain: 0.07, att: 0.5, cut: 1200 });
  if (b >= 8) strings(T(b), ns, BAR, { gain: 0.07, att: 0.6, cut: 2200 });
  if (b >= 10 && b < 14) MEL[b % 4].forEach(([s, m, l]) => flute(T(b, s), m, l * S16 * 1.1, 0.9));
  if (b >= 14) { MEL[b % 4].forEach(([s, m, l]) => strings(T(b, s), [m], l * S16, { gain: 0.05, att: 0.08, cut: 3500, rel: 0.4 })); }
}
swell(T(15), BAR, 0.6);

// --- 성장: 피치카토 → 스피카토, 큰북이 조금씩 ---
for (let b = SEC.grow[0]; b < SEC.grow[1]; b++) {
  const [root, ns] = chordOf(b), k = b - SEC.grow[0];
  strings(T(b), low(b), BAR, { gain: 0.08, att: 0.25, cut: 1400 });
  strings(T(b), ns, BAR, { gain: 0.06 + k * 0.004, att: 0.3, cut: 2400 });
  const pz = [ns[0] + 12, ns[2], ns[1] + 12, ns[2], ns[3], ns[2], ns[1] + 12, ns[3]];
  if (k < 8) pz.forEach((m, e) => pizz(T(b, e * 2), m, 0.9, e % 2 ? 0.35 : -0.35));
  if (k >= 4) { bassDrum(T(b), 0.5); timpani(T(b), root + 12, 0.35); }
  if (k >= 6) MEL[b % 4].forEach(([s, m, l]) => flute(T(b, s), m, l * S16, 0.8));
  if (k >= 8) {
    for (let e = 0; e < 8; e++) spic(T(b, e * 2), pz[e] + 12, 0.7 + (e % 4 === 0 ? 0.3 : 0), e % 2 ? 0.3 : -0.3);
    for (let e = 0; e < 16; e += 2) spic(T(b, e), root + 24, 0.5, 0);
    snare(T(b, 4), 0.35, true); snare(T(b, 12), 0.35, true); bassDrum(T(b, 8), 0.45);
    brass(T(b), [root + 12, root + 19], BAR * 0.95, { gain: 0.05, att: 0.5, bright: 0.2 });
  }
}
{ const b = SEC.grow[1] - 1;
  strings(T(b), chordOf(b)[1].map(m => m + 12), BAR, { gain: 0.08, trem: 12, cres: 2, cut: 4000 });
  roll(T(b, 4), BAR * 0.75, 0.15, 0.9, true); swell(T(b), BAR, 0.9); timpRoll(T(b, 8), BAR / 2, 38, 0.3, 0.9);
}

// --- 투티 공통 ---
const RHY = [0, 3, 6, 10, 12];                    // 금관 리듬 (x..x..x...x.x...)
function tutti(b, { melody = false, big = false } = {}) {
  const [root, ns] = chordOf(b);
  bassDrum(T(b), 1); bassDrum(T(b, 8), 0.8); if (big) bassDrum(T(b, 10), 0.6);
  snare(T(b, 4), 0.6, true); snare(T(b, 12), 0.6, true);
  timpani(T(b), root + 12, 0.7); timpani(T(b, 6), root + 12, 0.45); timpani(T(b, 10), root + 12, 0.5);
  const hi = [ns[3] + 12, ns[1] + 12, ns[2] + 12, ns[1] + 12];
  for (let s = 0; s < 16; s++) spic(T(b, s), hi[s % 4], s % 4 === 0 ? 1 : 0.65, s % 2 ? 0.4 : -0.4);            // 바이올린 16분
  for (const s of [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15]) spic(T(b, s), root + 12, 0.9, -0.1, 0.1);          // 첼로·베이스 리듬
  RHY.forEach((s, k) => brass(T(b, s), [root + 12, root + 19, root + 24], S16 * (k === 4 ? 3.5 : 1.5), { gain: 0.1, bright: 0.8, stab: true }));
  strings(T(b), low(b), BAR, { gain: 0.08, att: 0.05, cut: 1600 });
  strings(T(b), ns.map(m => m + 12), BAR, { gain: big ? 0.08 : 0.05, att: 0.2, cut: 3800 });
  if (melody) MEL[b % 4].forEach(([s, m, l]) => {
    events.lead.push([r4(T(b, s)), m, r4(l * S16)]);
    brass(T(b, s), [m - 12], l * S16, { gain: 0.11, bright: 0.5, att: 0.04, pan: -0.2 });                           // 호른
    if (big) { brass(T(b, s), [m], l * S16, { gain: 0.09, bright: 1.1, att: 0.02, pan: 0.2 }); strings(T(b, s), [m + 12], l * S16, { gain: 0.07, att: 0.05, cut: 5000, rel: 0.3 }); }
  });
}
for (let b = SEC.stage[0]; b < SEC.stage[1]; b++) tutti(b, { melody: b >= SEC.stage[0] + 8 });
cymbal(T(SEC.stage[0]), 1); cymbal(T(SEC.stage[0] + 8), 0.9);
roll(T(SEC.stage[1] - 1, 12), BEAT, 0.3, 0.8);

// --- 브레이크 ---
for (let b = SEC.brk[0]; b < SEC.brk[1]; b++) {
  const [root, ns] = chordOf(b);
  strings(T(b), [...low(b), ...ns], BAR, { gain: 0.11, att: 0.15, cut: 3000 });
  piano(T(b), root + 12, BAR, 0.7);
  MEL[b % 4].forEach(([s, m, l]) => piano(T(b, s), m, l * S16 * 1.2, 0.85));
}
{ const b = SEC.brk[1] - 1;
  for (let s = 0; s < 16; s++) if (s < 8 ? s % 4 === 0 : s < 12 ? s % 2 === 0 : true) snare(T(b, s), 0.25 + s / 16 * 0.6, true);
  swell(T(b), BAR, 1.1); timpRoll(T(b, 8), BAR / 2, 43, 0.3, 1);
  strings(T(b), chordOf(b)[1].map(m => m + 12), BAR, { gain: 0.07, trem: 12, cres: 2, cut: 4200 });
}

// --- 클라이맥스 ---
for (let b = SEC.climax[0]; b < SEC.climax[1]; b++) tutti(b, { melody: true, big: true });
cymbal(T(SEC.climax[0]), 1.15); timpani(T(SEC.climax[0]), 43, 1);
cymbal(T(SEC.climax[0] + 4), 1); timpani(T(SEC.climax[0] + 4), 43, 0.9);
{ const b = SEC.climax[1] - 1;
  roll(T(b, 8), BAR / 2, 0.4, 1); swell(T(b, 4), BAR * 0.75, 0.9);
  for (let s = 8; s < 16; s += 2) timpani(T(b, s), 38 + (s - 8) / 2 * 2, 0.5 + s / 32);
}

// --- 엔딩 ---
{ const b0 = SEC.outro[0];
  bassDrum(T(b0), 1.1); cymbal(T(b0), 1.2, 4); timpani(T(b0), 43, 1.1, 2.6);
  brass(T(b0), [55, 59, 62, 67, 71], BAR * 0.9, { gain: 0.14, bright: 1.1, att: 0.02, stab: true });
  strings(T(b0), [31, 43, 55, 59, 62, 67, 71, 74, 79], BAR * 0.9, { gain: 0.12, att: 0.03, cut: 4500, rel: 1.2 });
  for (let b = b0 + 1; b < SEC.outro[1]; b++) {
    const [root, ns] = chordOf(b), last = b >= SEC.outro[1] - 2;
    strings(T(b), [...low(b), ...ns], last ? BAR * 1.8 : BAR, { gain: last ? 0.11 : 0.13, att: 0.4, rel: last ? 1.6 : 0.9, cut: 2600 });
    if (b < SEC.outro[1] - 2) {
      MEL[(b - b0 - 1) % 4].forEach(([s, m, l]) => flute(T(b, s), m, l * S16 * 1.2, 1.15));
      [0, 4, 8, 12].forEach((s, e) => harp(T(b, s), [root + 12, ns[1], ns[2], ns[3]][e], 0.45));
    }
  }
  const bl = SEC.outro[1] - 2; // 마지막 G 코드를 하프로 굴리고 여운
  [43, 50, 55, 59, 62, 67, 71, 74, 79].forEach((m, i) => harp(T(bl, i), m, 0.55, (i / 8 - 0.5) * 0.8));
  tune(T(bl, 8), 69, 2.2, 0.35, 0);         // 첫 장면의 A음으로 수미상관
}

// ================= 믹스 (큰 홀 리버브) =================
function reverb(input, combs, aps, fb) {
  const out = new Float32Array(N);
  for (const c of combs) {
    const buf = new Float32Array(c); let p = 0, lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[p]; lp = y * 0.45 + lp * 0.55; buf[p] = input[i] + lp * fb; p = (p + 1) % c; out[i] += y; }
  }
  for (const a of aps) {
    const buf = new Float32Array(a); let p = 0;
    for (let i = 0; i < N; i++) { const b = buf[p], y = -out[i] + b; buf[p] = out[i] + b * 0.5; p = (p + 1) % a; out[i] = y; }
  }
  return out;
}
const pre = idx(0.025), RV = new Float32Array(N); for (let i = pre; i < N; i++) RV[i] = REV[i - pre];
const rvL = reverb(RV, [2491, 2587, 2386, 2275, 2043, 2170], [556, 441, 341], 0.88);
const rvR = reverb(RV, [2528, 2624, 2422, 2312, 2080, 2206], [579, 464, 364], 0.88);

const oL = new Float32Array(N), oR = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  let l = L[i] * 0.5 + OL[i] * 1.0 + rvL[i] * 0.045;
  let r = R[i] * 0.5 + OR[i] * 1.0 + rvR[i] * 0.045;
  l = Math.tanh(l * 1.05); r = Math.tanh(r * 1.05);
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
for (const k of Object.keys(events)) events[k].sort((a, b) => (Array.isArray(a) ? a[0] : a) - (Array.isArray(b) ? b[0] : b));
fs.writeFileSync('events.json', JSON.stringify({ ...events, SEC, PROG }));
console.log('ok', { dur: DUR, peak: peak.toFixed(3), kick: events.kick.length, clap: events.clap.length, lead: events.lead.length, pluck: events.pluck.length });
