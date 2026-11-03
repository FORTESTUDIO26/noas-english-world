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
      return { from: k, to: end + 2, note: `fricative ${((end - k) * HOP * 1000).toFixed(0)}ms` };
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
    return { from: Math.max(0, start - 2), to: Math.max(start + 10, v0 - 3), note: `voiceless ${((v0 - start) * HOP * 1000).toFixed(0)}ms` };
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

function render(p: Pcm, from: number, to: number, holdSec = 0): Pcm {
  const hop = HOP * p.rate;
  const a = Math.max(0, Math.round(from * hop));
  const b = Math.min(p.data.length, Math.round(to * hop + WIN * p.rate));
  const seg = holdSec ? stretch(p.data.slice(a, b), p.rate, holdSec) : p.data.slice(a, b);
  const fadeIn = Math.round(0.006 * p.rate);
  const fadeOut = Math.round(0.02 * p.rate);
  for (let i = 0; i < fadeIn && i < seg.length; i++) seg[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut && i < seg.length; i++) seg[seg.length - 1 - i] *= i / fadeOut;
  let pk = 0;
  for (const x of seg) pk = Math.max(pk, Math.abs(x));
  const gain = pk > 0 ? 0.8 / pk : 1;
  const pad = Math.round(0.06 * p.rate);
  const out = new Float32Array(seg.length + pad * 2);
  for (let i = 0; i < seg.length; i++) out[pad + i] = seg[i] * gain;
  return { data: out, rate: p.rate };
}

const report: Record<string, unknown>[] = [];
fs.mkdirSync(path.join(ROOT, 'public', 'audio', 'phonemes'), { recursive: true });
for (const ph of buildPhonemeClips()) {
  const src = path.join(ROOT, 'scripts', '.carriers', `${ph.carrier.word}.mp3`);
  const pcm = await decodeMp3(src);
  const fr = analyse(pcm);
  const c = cut(pcm, fr, ph.carrier.part, ph.ipa);
  const hold = ['m', 'n', 'l', 'f'].includes(ph.ipa) ? 0.32 : 0;
  const outPcm = render(pcm, c.from, c.to, hold);
  fs.writeFileSync(path.join(ROOT, 'public', phonemePath(ph.id)), wavBytes(outPcm));
  // automatic checks on the cut itself
  const seg = fr.slice(c.from, c.to);
  const voicedTail = seg.slice(-Math.max(1, Math.floor(seg.length * 0.4))).filter((f) => f.voice > VOICED).length;
  const durMs = Math.round((c.to - c.from) * HOP * 1000);
  const voiceless = ['p', 'k', 't', 'h', 'f'].includes(ph.ipa);
  const checks = {
    durationOk: ph.carrier.part === 'vowel' ? durMs >= 80 && durMs <= 360 : durMs >= 25 && durMs <= 400,
    noVowelAfterVoiceless: voiceless ? voicedTail <= 2 : true,
    shortVowelTailForStops: ['b', 'd', 'g'].includes(ph.ipa) ? durMs <= 140 : true,
  };
  report.push({ id: ph.id, ipa: ph.ipa, carrier: ph.carrier, durMs, heldMs: hold ? Math.round(outPcm.data.length / outPcm.rate * 1000) - 120 : undefined, note: c.note, checks, autoOk: Object.values(checks).every(Boolean) });
  console.log(`${ph.id.padEnd(2)} /${ph.ipa}/ from "${ph.carrier.word}" ${ph.carrier.part.padEnd(5)} ${String(durMs).padStart(4)}ms  ${c.note}  ${Object.values(checks).every(Boolean) ? 'auto-check ok' : 'CHECK ' + JSON.stringify(checks)}`);
}
freeDecoder();
fs.writeFileSync(path.join(ROOT, 'scripts', 'phoneme-report.json'), JSON.stringify(report, null, 1));
fs.writeFileSync(path.join(ROOT, 'src', 'audio', 'phoneme-audit.json'), JSON.stringify(report.map((r) => ({ id: r.id, ipa: r.ipa, carrier: (r.carrier as { word: string }).word, autoOk: r.autoOk })), null, 1));
