// Compare candidate voices on the hardest clips (isolated letters + short words)
// with the same recogniser grammars as verify-audio.
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { decodeMp3, resample, wavBytes } from './wav.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'scripts', '.trial');
fs.mkdirSync(OUT, { recursive: true });
const voices = process.argv.slice(2).length ? process.argv.slice(2) : ['en-US-JennyNeural', 'en-US-AriaNeural', 'en-US-AvaNeural', 'en-US-EmmaNeural'];
const letters = 'ABCDEFGHIJKLMNOP'.split('');
const words = ['Egg', 'Moon', 'Pig', 'Bag', 'Cat', 'Hat', 'Ball', 'Dog', 'Tap', 'Banana', 'Apple', 'Fish', 'Goat', 'Igloo', 'Jam', 'Kite', 'Lemon', 'Nest', 'Octopus'];
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', '.verify', 'manifest.json'), 'utf8'));
const items: { wav: string; expected: string; grammar: string; voice: string }[] = [];
for (const v of voices) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(v, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  for (const [text, g] of [...letters.map((l) => [l, 'letter']), ...words.map((w) => [w, 'word'])]) {
    const dir = path.join(OUT, v, text);
    fs.mkdirSync(dir, { recursive: true });
    const r = await tts.toFile(dir, `${text}.`);
    const wav = path.join(dir, 'a.wav');
    fs.writeFileSync(wav, wavBytes(resample(await decodeMp3(r.audioFilePath), 16000)));
    items.push({ wav, expected: text, grammar: g, voice: v });
  }
  tts.close();
}
const mf = path.join(OUT, 'manifest.json');
fs.writeFileSync(mf, JSON.stringify({ grammars: { letter: manifest.grammars.letter, word: manifest.grammars.word }, items }));
const res: { wav: string; text: string }[] = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts', 'recognize.ps1'), mf], { maxBuffer: 1 << 26 }).toString().trim());
const heard = new Map(res.map((r) => [r.wav, r.text]));
for (const v of voices) {
  const mine = items.filter((i) => i.voice === v);
  const bad = mine.filter((i) => heard.get(i.wav) !== i.expected);
  console.log(`${v}: ${mine.length - bad.length}/${mine.length}  wrong: ${bad.map((b) => `${b.expected}>${heard.get(b.wav) || '-'}`).join(' ')}`);
}
