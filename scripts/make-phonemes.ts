// Builds the phonics sound files (public/audio/phonemes/<id>.wav) by cutting
// the target sound out of a real recorded carrier word (scripts/.carriers),
// using simple acoustic measures per 5 ms frame:
//   energy (dB), zero-crossing rate, and voicing (autocorrelation peak).
//  onset  – consonant at the start of the word, cut BEFORE the vowel
//           (voiceless: until voicing starts; voiced stops: release + ~35 ms)
//  vowel  – short vowel at the start of the word, cut before the closure
//  coda   – consonant at the end of the word (f, m, n), after the vowel
// No vowel ("uh") is added after consonants. Each file gets an automatic
// check (scripts/phoneme-report.json); a human ear must still approve them
// (parents area → "בדיקת צלילים"), and a parent recording can replace any.
import fs from 'node:fs';
import path from 'node:path';
import { buildPhonemeClips, phonemePath } from '../src/audio/clips.ts';
import { decodeMp3, freeDecoder, wavBytes, type Pcm } from './wav.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const HOP = 0.005;
const WIN = 0.012;

interface Frame { db: number; zcr: number; voice: number }

function analyse(p: Pcm): Frame[] {
  const hop = Math.round(HOP * p.rate);
  const win = Math.round(WIN * p.rate);
  const minLag = Math.round(p.rate / 400);
  const maxLag = Math.round(p.rate / 75);
  const out: Frame[] = [];
  for (let s = 0; s + win + maxLag < p.data.length; s += hop) {
    let e = 0;
    let z = 0;
    for (let i = s; i < s + win; i++) {
      e += p.data[i] * p.data[i];
      if (i > s && Math.sign(p.data[i]) !== Math.sign(p.data[i - 1])) z++;
    }
    const db = 10 * Math.log10(e / win + 1e-12);
    let best = 0;
    if (db > -55) {
      for (let lag = minLag; lag <= maxLag; lag++) {
        let num = 0;
        let d1 = 0;
        let d2 = 0;
        for (let i = s; i < s + win; i++) {
          num += p.data[i] * p.data[i + lag];
          d1 += p.data[i] * p.data[i];
          d2 += p.data[i + lag] * p.data[i + lag];
        }
        const r = num / Math.sqrt(d1 * d2 + 1e-12);
        if (r > best) best = r;
      }
    }
    out.push({ db, zcr: z / win, voice: best });
  }
  return out;
}

const VOICED = 0.6;

function cut(p: Pcm, fr: Frame[], part: 'onset' | 'vowel' | 'coda', ipa: string): { from: number; to: number; note: string } {
  const peak = Math.max(...fr.map((f) => f.db));
  const speech = fr.map((f) => f.db > peak - 40);
  const start = speech.indexOf(true);
  const end = speech.lastIndexOf(true);
  const isVoiced = (i: number) => fr[i] && fr[i].voice > VOICED && fr[i].db > peak - 25;
  // first frame of a sustained voiced stretch (vowel nucleus) at/after i
  const voicingFrom = (i: number) => {
    for (let k = i; k < end; k++) if (isVoiced(k) && isVoiced(k + 1) && isVoiced(k + 2) && isVoiced(k + 3)) return k;
    return end;
  };
  if (part === 'vowel') {
    const v0 = voicingFrom(start);
    let k = v0;
    const vmax = Math.max(...fr.slice(v0, Math.min(end, v0 + 60)).map((f) => f.db));
    while (k < end && fr[k].db > vmax - 12 && fr[k].zcr < 0.25) k++;
    const to = Math.max(v0 + 16, k - 4); // stop before the formant transition
    return { from: v0, to: Math.min(to, v0 + 70), note: `vowel ${((to - v0) * HOP * 1000).toFixed(0)}ms` };
  }
  if (part === 'coda') {
    // find the vowel, then where the consonant takes over
    const v0 = voicingFrom(start);
    const vmax = Math.max(...fr.slice(v0, Math.min(end, v0 + 60)).map((f) => f.db));
    let k = v0 + 8;
    if (ipa === 'f') {
      while (k < end && !(fr[k].zcr > 0.25 && fr[k].voice < VOICED)) k++;
      while (k < end && fr[k].voice > VOICED) k++;
      return { from: k + 3, to: end + 2, note: `fricative ${((end - k) * HOP * 1000).toFixed(0)}ms` };
    }
    // nasal murmur: voiced, low zero-crossing (low-frequency hum) after the vowel
    void vmax;
    while (k < end && !(fr[k].zcr < 0.035 && fr[k + 1].zcr < 0.035 && fr[k + 2].zcr < 0.035)) k++;
    const from = k + 2;
    let to = from;
    while (to < fr.length && fr[to].voice > 0.5 && fr[to].db > peak - 38) to++;
    return { from, to, note: `nasal ${((to - from) * HOP * 1000).toFixed(0)}ms` };
  }
  // onset
  const v0 = voicingFrom(start);
  if (['p', 'k', 't', 'h'].includes(ipa)) {
    let firstVoiced = v0;
    for (let k = start + 2; k < v0; k++) if (fr[k].voice > VOICED && fr[k].db > peak - 32) { firstVoiced = k; break; }
    const to = Math.max(start + 8, Math.min(v0 - 3, firstVoiced - 2));
    return { from: Math.max(0, start - 2), to, note: `voiceless ${((to - start) * HOP * 1000).toFixed(0)}ms` };
  }
  if (ipa === 'dʒ') {
    let k = start;
    while (k < end && (fr[k].zcr > 0.12 || fr[k].voice < VOICED)) k++;
    return { from: Math.max(0, start - 2), to: Math.max(k + 2, start + 14), note: `affricate ${((k - start) * HOP * 1000).toFixed(0)}ms` };
  }
  if (ipa === 'l') {
    // lateral: voiced, steady and weaker than the vowel that follows
    let k = start + 2;
    while (k < end && !(fr[k].zcr > 0.045 && fr[k + 1].zcr > 0.045)) k++;
    return { from: Math.max(0, start - 1), to: Math.max(start + 16, k - 2), note: `lateral ${((k - start) * HOP * 1000).toFixed(0)}ms` };
  }
  // voiced stops b d g: find the release burst (largest energy jump near the start)
  let rel = start;
  let jump = -Infinity;
  for (let k = start; k < Math.min(end, start + 40); k++) {
    const d = fr[k + 1].db - fr[k].db;
    if (d > jump) { jump = d; rel = k; }
  }
  return { from: Math.max(0, start - 2), to: rel + 7, note: `release+35ms (prevoice ${((rel - start) * HOP * 1000).toFixed(0)}ms)` };
}

/**
 * Holds a continuous sound (m, n, l, f) longer, the way phonics teachers say
 * "mmm": repeats short grains from the steady middle, each aligned to the
 * previous one by cross-correlation and joined with a crossfade.
 */
function stretch(seg: Float32Array, rate: number, targetSec: number): Float32Array {
  const target = Math.round(targetSec * rate);
  if (seg.length >= target) return seg;
  const grain = Math.round(0.04 * rate);
  const xf = Math.round(0.015 * rate);
  const a = Math.round(seg.length * 0.2);
  const b = Math.min(seg.length - xf, Math.max(a + grain + xf, Math.round(seg.length * 0.7)));
  if (b - grain < a) return seg;
  const out: number[] = Array.from(seg.subarray(0, b));
  const search = Math.round(0.01 * rate);
  while (out.length < target - (seg.length - b)) {
    // choose a start in [a, b-grain] whose first xf samples best match the current tail
    const tail = out.slice(out.length - xf);
    let best = a;
    let bestR = -Infinity;
    for (let s = a; s <= Math.min(b - grain, a + search * 4); s++) {
      let num = 0, d1 = 0, d2 = 0;
      for (let i = 0; i < xf; i++) { num += tail[i] * seg[s + i]; d1 += tail[i] ** 2; d2 += seg[s + i] ** 2; }
      const r = num / Math.sqrt(d1 * d2 + 1e-12);
      if (r > bestR) { bestR = r; best = s; }
    }
    const base = out.length - xf;
    for (let i = 0; i < xf; i++) {
      const w = i / xf;
      out[base + i] = out[base + i] * (1 - w) + seg[best + i] * w;
    }
    for (let i = xf; i < grain; i++) out.push(seg[best + i]);
  }
  // join the real ending back on with a crossfade
  const endPart = seg.subarray(b - xf);
  const base = out.length - xf;
  for (let i = 0; i < xf; i++) out[base + i] = out[base + i] * (1 - i / xf) + endPart[i] * (i / xf);
  for (let i = xf; i < endPart.length; i++) out.push(endPart[i]);
  return Float32Array.from(out);
}

// ---------------------------------------------------------------- v2 rendering (2026-11-04)
// Problem in v1: plosives were single 45–70 ms blips and vowels 120–215 ms,
// too short to hear on a phone speaker. v2 keeps every sound natural (no
// added "uh", no stretched plosives) but presents it the way teachers do:
//  - short sounds (b c d g k p t h j) are played three times: "b · b · b"
//  - vowels and continuous sounds (a e i o / f l m n) are held, continuous
//  - loudness is matched across all sounds
type Kind = 'burst' | 'vowel' | 'hold';
const kindOf = (ipa: string): Kind => (['æ', 'ɛ', 'ɪ', 'ɑ'].includes(ipa) ? 'vowel' : ['f', 'l', 'm', 'n'].includes(ipa) ? 'hold' : 'burst');

function slice(p: Pcm, from: number, to: number): Float32Array {
  const hop = HOP * p.rate;
  const a = Math.max(0, Math.round(from * hop));
  const b = Math.min(p.data.length, Math.round(to * hop + WIN * p.rate));
  return p.data.slice(a, b);
}

function fade(seg: Float32Array, rate: number, inS = 0.006, outS = 0.025) {
  const fi = Math.round(inS * rate);
  const fo = Math.round(outS * rate);
  for (let i = 0; i < fi && i < seg.length; i++) seg[i] *= i / fi;
  for (let i = 0; i < fo && i < seg.length; i++) seg[seg.length - 1 - i] *= i / fo;
  return seg;
}

/** Same perceived level for every sound: RMS target, peak limited. */
function level(seg: Float32Array, kind: Kind) {
  let pk = 0;
  let e = 0;
  for (const x of seg) { pk = Math.max(pk, Math.abs(x)); e += x * x; }
  const rms = Math.sqrt(e / Math.max(1, seg.length));
  // bursts are mostly silence-free but short: aim at the peak instead
  const g = kind === 'burst' ? 0.9 / (pk || 1) : Math.min(0.13 / (rms || 1), 0.95 / (pk || 1));
  for (let i = 0; i < seg.length; i++) seg[i] *= g;
  return seg;
}

function renderV2(p: Pcm, from: number, to: number, kind: Kind): Pcm {
  const r = p.rate;
  let seg = slice(p, from, to);
  if (kind === 'vowel') seg = stretch(seg, r, 0.38);
  if (kind === 'hold') seg = stretch(seg, r, 0.48);
  seg = level(fade(seg, r, 0.006, kind === 'burst' ? 0.015 : 0.04), kind);
  const pad = Math.round(0.08 * r);
  const parts: Float32Array[] = [new Float32Array(pad)];
  if (kind === 'burst') {
    const gap = new Float32Array(Math.round(0.34 * r));
    parts.push(seg, gap, seg, gap, seg);
  } else parts.push(seg);
  parts.push(new Float32Array(pad));
  const out = new Float32Array(parts.reduce((s, x) => s + x.length, 0));
  let o = 0;
  for (const x of parts) { out.set(x, o); o += x.length; }
  return { data: out, rate: r };
}

const report: Record<string, unknown>[] = [];
fs.mkdirSync(path.join(ROOT, 'public', 'audio', 'phonemes'), { recursive: true });
for (const ph of buildPhonemeClips()) {
  // Two takes of the carrier word (slow -40% and normal -20%): use the one whose
  // cut passes the checks, preferring the longer clean vowel / held sound.
  const takes = [path.join(ROOT, 'scripts', '.carriers-slow', `${ph.carrier.word}.mp3`), path.join(ROOT, 'scripts', '.carriers', `${ph.carrier.word}.mp3`)].filter((x) => fs.existsSync(x));
  const cands = [];
  for (const src of takes) {
    const p = await decodeMp3(src);
    const f2 = analyse(p);
    const cc = cut(p, f2, ph.carrier.part, ph.ipa);
    const sg = f2.slice(cc.from, cc.to);
    const vt = sg.slice(-Math.max(1, Math.floor(sg.length * 0.4))).filter((x) => x.voice > VOICED).length;
    const clean = ['p', 'k', 't', 'h', 'f'].includes(ph.ipa) ? vt <= 2 : true;
    cands.push({ src, pcm: p, fr: f2, c: cc, clean, len: cc.to - cc.from });
  }
  cands.sort((x, y) => Number(y.clean) - Number(x.clean) || (kindOf(ph.ipa) === 'burst' ? 0 : y.len - x.len));
  const { pcm, fr, c } = cands[0];
  const kind = kindOf(ph.ipa);
  const outPcm = renderV2(pcm, c.from, c.to, kind);
  fs.writeFileSync(path.join(ROOT, 'public', phonemePath(ph.id)), wavBytes(outPcm));
  const seg = fr.slice(c.from, c.to);
  const voicedTail = seg.slice(-Math.max(1, Math.floor(seg.length * 0.4))).filter((f) => f.voice > VOICED).length;
  const cutMs = Math.round((c.to - c.from) * HOP * 1000);
  const totalMs = Math.round((outPcm.data.length / outPcm.rate) * 1000);
  const voiceless = ['p', 'k', 't', 'h', 'f'].includes(ph.ipa);
  const checks = {
    cutLengthOk: kind === 'vowel' ? cutMs >= 80 && cutMs <= 400 : cutMs >= 25 && cutMs <= 400,
    noVowelAfterVoiceless: voiceless ? voicedTail <= 2 : true,
    noVowelAfterVoicedStop: ['b', 'd', 'g'].includes(ph.ipa) ? cutMs <= 140 : true,
    audibleLength: totalMs >= 350,
  };
  const autoOk = Object.values(checks).every(Boolean);
  report.push({ id: ph.id, ipa: ph.ipa, carrier: ph.carrier, kind, cutMs, totalMs, note: c.note, checks, autoOk, humanApproved: false });
  console.log(`${ph.id.padEnd(2)} /${ph.ipa}/ ${kind.padEnd(5)} from "${ph.carrier.word}" cut ${String(cutMs).padStart(3)}ms → file ${totalMs}ms  ${autoOk ? 'auto-check ok' : 'CHECK ' + JSON.stringify(checks)}`);
}
freeDecoder();
fs.writeFileSync(path.join(ROOT, 'scripts', 'phoneme-report.json'), JSON.stringify(report, null, 1));
fs.writeFileSync(path.join(ROOT, 'src', 'audio', 'phoneme-audit.json'), JSON.stringify(report.map((r) => ({ id: r.id, ipa: r.ipa, carrier: (r.carrier as { word: string }).word, kind: r.kind, cutMs: r.cutMs, totalMs: r.totalMs, autoOk: r.autoOk, humanApproved: false })), null, 1));
