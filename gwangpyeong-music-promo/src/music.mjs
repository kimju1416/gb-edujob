// 광평중 음악중점반 홍보 BGM — 오리지널 합성 트랙 (128 BPM, 16마디 = 정확히 30초)
// 외부 샘플 0개, 전부 수학으로 합성 → 저작권 100% 자유 (상업적 사용 OK)
import fs from 'fs';

const SR = 44100, BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4, S16 = BEAT / 4;
const DUR = 30, N = Math.round(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);         // drum bus
const ML = new Float32Array(N), MR = new Float32Array(N);       // music bus (sidechained)
const REV = new Float32Array(N), DLY = new Float32Array(N);     // sends
const events = { kick: [], clap: [], hat: [], stab: [], lead: [], tick: [], crash: [], riser: [], bass: [] };

// ---- 구조 (마디 0~15) ----
// 0: 인트로(틱+필터 패드) 1: 빌드업(하이햇+스네어롤+라이저) 2~9: DROP A
// 10~11: 브레이크(패드+멜로디, 11마디 클랩 롤+라이저) 12~14: DROP B(+멜로디) 15: 피날레 히트
const isDrop = b => (b >= 2 && b <= 9) || (b >= 12 && b <= 14);
const CH = [ // G  D/F#  Em  C/E
  { root: 43, notes: [55, 59, 62, 67] },
  { root: 38, notes: [54, 57, 62, 66] },
  { root: 40, notes: [52, 55, 59, 64] },
  { root: 36, notes: [52, 55, 60, 64] },
];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function tptLP() { // TPT state variable filter (lowpass/bandpass/highpass)
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
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const idx = t => Math.round(t * SR);

function kick(t0, g = 1) {
  events.kick.push(+t0.toFixed(4));
  const n = idx(0.42); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const f = 44 + 120 * Math.exp(-t * 32);
    ph += f / SR;
    let v = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 6.5) * (t < 0.002 ? t / 0.002 : 1);
    v += (t < 0.004 ? rnd() * 0.5 * (1 - t / 0.004) : 0);
    v = Math.tanh(v * 1.6) * 0.95 * g;
    L[j] += v; R[j] += v;
  }
}
function clap(t0, g = 1) {
  events.clap.push(+t0.toFixed(4));
  const f = tptLP(), n = idx(0.35);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let env = 0;
    for (const o of [0, 0.009, 0.018]) if (t >= o) env = Math.max(env, Math.exp(-(t - o) * 180));
    env = Math.max(env, t > 0.02 ? Math.exp(-(t - 0.02) * 16) * 0.55 : 0);
    const v = f(rnd(), 1500, 1.4).bp * env * 1.3 * g;
    L[j] += v; R[j] += v; REV[j] += v * 0.35;
  }
}
function snare(t0, g = 1) { // 빌드업 롤용
  const f = tptLP(), n = idx(0.16);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const v = (f(rnd(), 2500, 0.8).bp * 1.2 + Math.sin(2 * Math.PI * 190 * t) * 0.4) * Math.exp(-t * 28) * g;
    L[j] += v; R[j] += v; REV[j] += v * 0.2;
  }
}
function hat(t0, open = false, g = 1) {
  events.hat.push(+t0.toFixed(4));
  const f = tptLP(), n = idx(open ? 0.3 : 0.06), pan = open ? 0.15 : -0.15;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const v = f(rnd(), 9000, 0.7).hp * Math.exp(-t * (open ? 13 : 70)) * 0.32 * g;
    L[j] += v * (1 - pan); R[j] += v * (1 + pan);
  }
}
function tick(t0, hi) {
  events.tick.push(+t0.toFixed(4));
  const n = idx(0.05), f = hi ? 2093 : 1568;
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 90) * 0.35;
    L[j] += v; R[j] += v; REV[j] += v * 0.3;
  }
}
function crash(t0, g = 1, len = 2.2) {
  events.crash.push(+t0.toFixed(4));
  const f = tptLP(), f2 = tptLP(), n = idx(len);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const nz = f(rnd(), 5000, 0.5).hp * Math.exp(-t * 2.2) * 0.35;
    const boom = Math.sin(2 * Math.PI * (38 + 30 * Math.exp(-t * 8)) * t) * Math.exp(-t * 2.8) * 0.8;
    const sh = f2(rnd(), 1200, 0.6).bp * Math.exp(-t * 10) * 0.4;
    const vl = (nz * (1 + rnd() * 0.1) + boom + sh) * g, vr = (nz + boom + sh) * g;
    L[j] += vl; R[j] += vr; REV[j] += nz * 0.4 * g;
  }
}
function riser(t0, len, g = 1) {
  events.riser.push([+t0.toFixed(4), len]);
  const f = tptLP(), n = idx(len);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const p = t / len;
    const v = f(rnd(), 300 + 9000 * p * p, 2.5).bp * p * p * 0.55 * g;
    ML[j] += v; MR[j] += v * 0.9; REV[j] += v * 0.3;
  }
}
// supersaw stab / pad
function chordSynth(t0, notes, dur, { cut0 = 6000, cut1 = 900, cutDecay = 9, att = 0.004, gain = 0.16, rev = 0.25, oct = 0 } = {}) {
  events.stab.push([+t0.toFixed(4), +dur.toFixed(4)]);
  const det = [-0.11, -0.05, 0, 0.05, 0.11], pans = [-0.8, -0.4, 0, 0.4, 0.8];
  const fl = tptLP(), fr = tptLP();
  const phs = notes.map(() => det.map(() => (rnd() + 1) / 2));
  const n = idx(dur + 0.25);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    let sl = 0, sr = 0;
    notes.forEach((m, a) => {
      det.forEach((d, b) => {
        const f = mtof(m + oct * 12 + d);
        phs[a][b] += f / SR; const s = saw(phs[a][b] % 1);
        sl += s * (1 - pans[b]) * 0.5; sr += s * (1 + pans[b]) * 0.5;
      });
    });
    const env = (t < att ? t / att : 1) * (t > dur ? Math.exp(-(t - dur) * 30) : 1);
    const cut = cut1 + (cut0 - cut1) * Math.exp(-t * cutDecay);
    const vl = fl(sl, cut, 0.9).lp * env * gain / notes.length, vr = fr(sr, cut, 0.9).lp * env * gain / notes.length;
    ML[j] += vl; MR[j] += vr; REV[j] += (vl + vr) * rev;
  }
}
function bass(t0, m, dur, g = 1) {
  events.bass.push(+t0.toFixed(4));
  const f = tptLP(); let p1 = 0, p2 = 0; const n = idx(dur + 0.03);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const fr = mtof(m); p1 += fr / SR; p2 += fr / 2 / SR;
    const s = saw(p1 % 1) * 0.6 + Math.sin(2 * Math.PI * p2) * 0.0 + Math.sin(2 * Math.PI * p1) * 0.7;
    const env = Math.min(1, t / 0.003) * (t > dur ? Math.exp(-(t - dur) * 60) : 1);
    const v = Math.tanh(f(s, 350 + 1400 * Math.exp(-t * 18), 1.1).lp * 1.8) * env * 0.42 * g;
    ML[j] += v; MR[j] += v;
  }
}
function lead(t0, m, dur, g = 1) {
  events.lead.push([+t0.toFixed(4), m, +dur.toFixed(4)]);
  const f = tptLP(); let p = 0, p2 = 0; const n = idx(dur + 0.08);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    const fr = mtof(m) * (1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t * 4));
    p += fr / SR; p2 += fr * 1.005 / SR;
    const pulse = (p % 1) < 0.35 ? 1 : -1;
    const s = pulse * 0.5 + saw(p2 % 1) * 0.5;
    const env = Math.min(1, t / 0.003) * (0.55 + 0.45 * Math.exp(-t * 7)) * (t > dur ? Math.exp(-(t - dur) * 40) : 1);
    const v = f(s, 1200 + 5500 * Math.exp(-t * 14), 1.2).lp * env * 0.17 * g;
    ML[j] += v; MR[j] += v; DLY[j] += v * 0.45; REV[j] += v * 0.3;
  }
}
function arp(t0, m, g = 1) { // 16분 플럭
  const f = tptLP(); let p = 0; const n = idx(0.18);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = idx(t0) + i; if (j >= N) break;
    p += mtof(m) / SR;
    const v = f(saw(p % 1), 800 + 4500 * Math.exp(-t * 30), 1.5).lp * Math.exp(-t * 16) * 0.07 * g;
    ML[j] += v * 0.7; MR[j] += v * 1.2; DLY[j] += v * 0.5;
  }
}

// ---- 편곡 ----
const T = (bar, s16 = 0) => bar * BAR + s16 * S16;
const STAB = [0, 3, 6, 10, 12];                       // x..x..x...x.x...
const MEL = [ // [16th, midi, len16] per chord bar
  [[0, 74, 2], [3, 71, 2], [6, 74, 2], [8, 79, 4], [12, 76, 4]],
  [[0, 78, 3], [3, 76, 2], [6, 74, 2], [8, 69, 4], [12, 74, 2], [14, 76, 2]],
  [[0, 79, 3], [3, 78, 2], [6, 76, 2], [8, 71, 4], [12, 74, 2], [14, 76, 2]],
  [[0, 76, 3], [3, 74, 2], [6, 72, 2], [8, 71, 6]],
];

for (let b = 0; b < 16; b++) {
  const ch = CH[b % 4];
  if (b === 0) {
    for (let q = 0; q < 4; q++) tick(T(0, q * 4), q === 0);
    chordSynth(T(0), ch.notes, BAR, { cut0: 350, cut1: 2600, cutDecay: 0.8, att: 0.3, gain: 0.12, rev: 0.4 });
  }
  if (b === 1) {
    for (let e = 0; e < 8; e++) hat(T(1, e * 2), false, 0.8);
    for (let s = 0; s < 16; s++) if (s < 8 ? s % 4 === 0 : s < 12 ? s % 2 === 0 : true) snare(T(1, s), 0.35 + s / 16 * 0.6);
    chordSynth(T(1), ch.notes, BAR, { cut0: 1000, cut1: 5500, cutDecay: 0.9, att: 0.05, gain: 0.12, rev: 0.4 });
    riser(T(1), BAR);
    for (let q = 0; q < 4; q++) tick(T(1, q * 4), false);
  }
  if (isDrop(b)) {
    for (let q = 0; q < 4; q++) kick(T(b, q * 4));
    clap(T(b, 4)); clap(T(b, 12));
    for (let s = 0; s < 16; s++) {
      if (s % 4 === 2) hat(T(b, s), true, 0.7);
      else hat(T(b, s), false, s % 2 ? 0.45 : 0.7);
    }
    STAB.forEach((s, k) => chordSynth(T(b, s), ch.notes, S16 * (k === 4 ? 3 : 1.6), { gain: 0.2, oct: 0 }));
    for (const s of [2, 6, 10, 14]) bass(T(b, s), ch.root + 12, S16 * 1.7);
    bass(T(b, 0), ch.root, S16 * 1.2, 0.8);
    const arpN = [...ch.notes.map(n => n + 12), ch.notes[1] + 24];
    for (let s = 0; s < 16; s++) arp(T(b, s), arpN[(s * 3) % arpN.length], b >= 12 ? 0.8 : 1);
    if (b === 2 || b === 12) crash(T(b), 1);
  }
  if (b >= 12 && b <= 14) MEL[b % 4].forEach(([s, m, l]) => lead(T(b, s), m, l * S16));
  if (b === 10 || b === 11) {
    chordSynth(T(b), ch.notes, BAR, { cut0: 2400, cut1: 1600, cutDecay: 1, att: 0.08, gain: 0.13, rev: 0.5 });
    bass(T(b), ch.root, BAR * 0.95, 0.7);
    MEL[b % 4].forEach(([s, m, l]) => lead(T(b, s), m, l * S16, 0.9));
    if (b === 10) { for (let q = 0; q < 4; q++) hat(T(10, q * 4 + 2), true, 0.5); }
    if (b === 11) {
      for (let s = 0; s < 16; s++) if (s < 8 ? s % 4 === 0 : s < 12 ? s % 2 === 0 : true) clap(T(11, s), 0.35 + (s / 16) * 0.6);
      riser(T(11), BAR, 1.1);
    }
  }
  if (b === 15) {
    kick(T(15), 1.1); crash(T(15), 1.2, 1.9);
    chordSynth(T(15), [...CH[0].notes, 43 + 24], BAR * 0.9, { cut0: 7000, cut1: 700, cutDecay: 1.6, gain: 0.26, rev: 0.6 });
    bass(T(15), 43, BAR * 0.85, 1);
    lead(T(15), 79, BAR * 0.8, 0.8);
  }
}
// 14마디 끝 → 피날레 전 한 박 스톱(무음 긴장감)은 드럼을 그대로 두고 마지막 16분 두 개 스네어 필
snare(T(14, 14), 0.8); snare(T(14, 15), 1);

// ---- 이펙트 ----
// 사이드체인 (킥에 맞춰 음악 버스 덕킹)
const sc = new Float32Array(N).fill(1);
for (const k of events.kick) {
  const j0 = idx(k), n = idx(0.3);
  for (let i = 0; i < n && j0 + i < N; i++) {
    const t = i / SR, d = 1 - 0.7 * Math.exp(-t / 0.07) * (t < 0.004 ? t / 0.004 : 1);
    sc[j0 + i] = Math.min(sc[j0 + i], d);
  }
}
// 딜레이 (점8분, 핑퐁)
const dT = idx(S16 * 3); const dl = new Float32Array(N), dr = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const inL = DLY[i] + (i >= dT ? dr[i - dT] * 0.45 : 0);
  const inR = (i >= dT ? dl[i - dT] : 0);
  dl[i] = inL; dr[i] = inR;
}
// 리버브 (Freeverb 스타일 콤 + 올패스)
function reverb(input, combs, aps) {
  const out = new Float32Array(N);
  for (const c of combs) {
    const buf = new Float32Array(c); let p = 0, lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[p]; lp = y * 0.6 + lp * 0.4; buf[p] = input[i] + lp * 0.8; p = (p + 1) % c; out[i] += y; }
  }
  for (const a of aps) {
    const buf = new Float32Array(a); let p = 0;
    for (let i = 0; i < N; i++) { const b = buf[p], y = -out[i] + b; buf[p] = out[i] + b * 0.5; p = (p + 1) % a; out[i] = y; }
  }
  return out;
}
const rvL = reverb(REV, [1557, 1617, 1491, 1422], [556, 441]);
const rvR = reverb(REV, [1580, 1640, 1514, 1445], [579, 464]);

const outL = new Float32Array(N), outR = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const m = sc[i];
  let l = L[i] * 0.42 + (ML[i] * 0.62 + dl[i] * 0.35 + rvL[i] * 0.07) * m;
  let r = R[i] * 0.42 + (MR[i] * 0.62 + dr[i] * 0.35 + rvR[i] * 0.07) * m;
  l = Math.tanh(l * 1.1); r = Math.tanh(r * 1.1);
  const t = i / SR; const fade = t > DUR - 0.25 ? (DUR - t) / 0.25 : 1;
  outL[i] = l * fade; outR[i] = r * fade;
  peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
}
const norm = 0.93 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[i] * norm)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[i] * norm)) * 32767), 46 + i * 4);
}
fs.writeFileSync('bgm.wav', buf);
fs.writeFileSync('events.json', JSON.stringify(events));
console.log('ok', { peak: peak.toFixed(3), kicks: events.kick.length, stabs: events.stab.length, lead: events.lead.length });
