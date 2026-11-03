// Cuts the long trailing silence the voice adds (≈1.3 s) by dropping whole
// MP3 frames after the speech ends. Frames before the cut are untouched, so
// quality is unchanged. Safe to re-run.
import fs from 'node:fs';
import path from 'node:path';
import { decodeMp3, freeDecoder } from './wav.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] } as Record<number, number[]>;

function frames(b: Buffer) {
  let i = 0;
  if (b.toString('latin1', 0, 3) === 'ID3') i = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]);
  const out: { start: number; len: number; samples: number }[] = [];
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
    const ver = (b[i + 1] >> 3) & 3;
    const layer = (b[i + 1] >> 1) & 3;
    const bri = (b[i + 2] >> 4) & 15;
    const sri = (b[i + 2] >> 2) & 3;
    const pad = (b[i + 2] >> 1) & 1;
    if (ver === 1 || layer !== 1 || bri === 0 || bri === 15 || sri === 3) { i++; continue; }
    const sr = SR[ver][sri];
    const br = (ver === 3 ? BR1 : BR2)[bri] * 1000;
    const len = Math.floor(((ver === 3 ? 144 : 72) * br) / sr) + pad;
    out.push({ start: i, len, samples: ver === 3 ? 1152 : 576 });
    i += len;
  }
  return out;
}

let saved = 0;
let count = 0;
for (const dir of ['public/audio', 'public/audio/slow']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((x) => x.endsWith('.mp3'))) {
    const file = path.join(ROOT, dir, f);
    const pcm = await decodeMp3(file);
    let last = 0;
    for (let i = 0; i < pcm.data.length; i++) if (Math.abs(pcm.data[i]) > 0.01) last = i;
    const keepSamples = last + Math.round(0.25 * pcm.rate) + 1105; // + tail + decoder delay
    const buf = fs.readFileSync(file);
    const fr = frames(buf);
    let acc = 0;
    let end = buf.length;
    for (const x of fr) {
      acc += x.samples;
      if (acc >= keepSamples) { end = x.start + x.len; break; }
    }
    if (end < buf.length - 200) {
      saved += buf.length - end;
      count++;
      fs.writeFileSync(file, buf.subarray(0, end));
    }
  }
}
freeDecoder();
console.log(`trimmed ${count} files, saved ${(saved / 1024 / 1024).toFixed(1)} MB`);
