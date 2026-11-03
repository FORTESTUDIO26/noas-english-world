// Records every TTS clip (normal + slow) with a neural en-US voice and saves it
// under public/audio. Already-recorded files are skipped, so the script can be
// re-run after adding clips. Also records the carrier words used to cut the
// phonics sounds (scripts/.carriers, not shipped).
//   node scripts/make-audio.ts            (all missing clips)
//   node scripts/make-audio.ts --force    (re-record everything)
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'node:fs';
import path from 'node:path';
import { buildTtsClips, buildPhonemeClips, ttsPath } from '../src/audio/clips.ts';

const VOICE = 'en-US-JennyNeural';
const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const CARRIERS = path.join(ROOT, 'scripts', '.carriers');
const force = process.argv.includes('--force');

let tts: MsEdgeTTS | null = null;
async function engine() {
  if (!tts) {
    tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  }
  return tts;
}

async function record(text: string, dest: string, rate?: string) {
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 1000) return false;
  const tmp = path.join(ROOT, 'scripts', '.tmp');
  fs.mkdirSync(tmp, { recursive: true });
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const t = await engine();
      const r = await t.toFile(tmp, text, rate ? { rate } : undefined);
      const size = fs.statSync(r.audioFilePath).size;
      if (size < 1000) throw new Error(`tiny file (${size} bytes)`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(r.audioFilePath, dest);
      return true;
    } catch (e) {
      console.warn(`  retry ${attempt} for "${text}": ${e}`);
      try { tts?.close(); } catch { /* ignore */ }
      tts = null;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw new Error(`Failed to record "${text}"`);
}

const clips = buildTtsClips();
let made = 0;
for (const c of clips) {
  if (await record(c.text, path.join(PUB, ttsPath(c.id)))) made++;
  // Slow version is recorded slower by the voice itself (no time-stretch distortion).
  if (await record(c.text, path.join(PUB, ttsPath(c.id, true)), '-30%')) made++;
}
for (const p of buildPhonemeClips()) {
  const w = p.carrier.word;
  await record(`${w.charAt(0).toUpperCase() + w.slice(1)}.`, path.join(CARRIERS, `${w}.mp3`), '-20%');
}
console.log(`clips: ${clips.length} (x2 speeds), newly recorded files: ${made}`);
tts?.close();
