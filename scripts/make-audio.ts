// Records every spoken clip with neural voices and saves it under public/audio.
//  - English learning content (letter names, numbers, colours, words, the
//    English listening instructions): en-US voice, normal + slow.
//  - Hebrew instructions, help and feedback: he-IL voice, normal + slow,
//    one clip per Hebrew segment of a mixed sentence (src/audio/speech.ts).
// Speeds are set in src/audio/clips.ts (RATES) and are recorded by the voice
// itself – never time-stretched. A clip is re-recorded automatically when its
// text, voice or speed changed (scripts/.audio-params.json).
// Also records the carrier words used to build the phonics sounds.
//   node scripts/make-audio.ts            (only what is missing or changed)
//   node scripts/make-audio.ts --force    (everything)
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'node:fs';
import path from 'node:path';
import { buildTtsClips, buildPhonemeClips, ttsPath, RATES, VOICES } from '../src/audio/clips.ts';
import { heClipId } from '../src/audio/speech.ts';
import { spokenHebrewSegments } from '../src/learn/spoken.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const CARRIERS = path.join(ROOT, 'scripts', '.carriers');
const PARAMS = path.join(ROOT, 'scripts', '.audio-params.json');
const force = process.argv.includes('--force');
const params: Record<string, string> = fs.existsSync(PARAMS) ? JSON.parse(fs.readFileSync(PARAMS, 'utf8')) : {};

const engines = new Map<string, MsEdgeTTS>();
async function engine(voice: string) {
  let t = engines.get(voice);
  if (!t) {
    t = new MsEdgeTTS();
    await t.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    engines.set(voice, t);
  }
  return t;
}

async function record(text: string, dest: string, voice: string, rate?: string) {
  const sig = `${voice}|${rate ?? ''}|${text}`;
  const rel = path.relative(ROOT, dest);
  if (!force && params[rel] === sig && fs.existsSync(dest) && fs.statSync(dest).size > 1000) return false;
  // first run with this script: existing files recorded at the old default speed count as changed
  const tmp = path.join(ROOT, 'scripts', '.tmp');
  fs.mkdirSync(tmp, { recursive: true });
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const t = await engine(voice);
      const r = await t.toFile(tmp, text, rate ? { rate } : undefined);
      const size = fs.statSync(r.audioFilePath).size;
      if (size < 1000) throw new Error(`tiny file (${size} bytes)`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(r.audioFilePath, dest);
      params[rel] = sig;
      return true;
    } catch (e) {
      console.warn(`  retry ${attempt} for "${text}": ${e}`);
      try { engines.get(voice)?.close(); } catch { /* ignore */ }
      engines.delete(voice);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw new Error(`Failed to record "${text}"`);
}

let made = 0;
const save = () => fs.writeFileSync(PARAMS, JSON.stringify(params, null, 1));

// English learning content
const clips = buildTtsClips();
for (const c of clips) {
  if (await record(c.text, path.join(PUB, ttsPath(c.id)), VOICES.en, RATES.en.normal)) made++;
  if (await record(c.text, path.join(PUB, ttsPath(c.id, true)), VOICES.en, RATES.en.slow)) made++;
  if (made % 20 === 0) save();
}

// Hebrew instructions (one clip per Hebrew segment)
const heSegs = spokenHebrewSegments();
const heIndex: Record<string, string> = {};
for (const text of heSegs) {
  const id = heClipId(text);
  heIndex[id] = text;
  if (await record(text, path.join(PUB, ttsPath(id)), VOICES.he, RATES.he.normal)) made++;
  if (await record(text, path.join(PUB, ttsPath(id, true)), VOICES.he, RATES.he.slow)) made++;
  if (made % 20 === 0) save();
}
fs.writeFileSync(path.join(ROOT, 'src', 'audio', 'he-clips.json'), JSON.stringify(heIndex, null, 1));

// carrier words for the phonics sounds (scripts/make-phonemes.ts)
for (const p of buildPhonemeClips()) {
  const w = p.carrier.word;
  const text = `${w.charAt(0).toUpperCase() + w.slice(1)}.`;
  await record(text, path.join(CARRIERS, `${w}.mp3`), VOICES.en, '-20%');
  await record(text, path.join(CARRIERS + '-slow', `${w}.mp3`), VOICES.en, '-40%');
}
save();

// remove clips that are no longer in the catalog (e.g. old English prompts)
const keep = new Set([...clips.map((c) => c.id), ...Object.keys(heIndex)]);
let removed = 0;
for (const dir of ['audio', 'audio/slow']) {
  for (const f of fs.readdirSync(path.join(PUB, dir)).filter((x) => x.endsWith('.mp3'))) {
    if (!keep.has(f.replace(/\.mp3$/, ''))) { fs.rmSync(path.join(PUB, dir, f)); removed++; }
  }
}
console.log(`english clips: ${clips.length}, hebrew segments: ${heSegs.length} (x2 speeds); newly recorded files: ${made}; removed old files: ${removed}`);
for (const t of engines.values()) t.close();
