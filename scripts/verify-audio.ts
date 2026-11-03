// Quality check of every recorded TTS clip (normal + slow):
//  1. decodes the MP3 and measures length / loudness / silence
//  2. runs Windows' en-US speech recogniser (scripts/recognize.ps1) on it with
//     a grammar of competing answers (e.g. 13 vs 30, "hat" vs "cat"), and
//     checks that the recogniser hears exactly the intended text.
// Writes scripts/audio-report.json and prints a summary.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildTtsClips, ttsPath, type TtsClip } from '../src/audio/clips.ts';
import { decodeMp3, freeDecoder, resample, wavBytes } from './wav.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'scripts', '.verify');
fs.mkdirSync(OUT, { recursive: true });

const clips = buildTtsClips();
const strip = (s: string) => s.replace(/[.!?,]/g, '').trim();

const DECOY_NUMBERS = ['thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const DECOY_WORDS = ['bat', 'cap', 'hut', 'dig', 'bell', 'big', 'tab', 'back', 'bad', 'cut', 'hot', 'top', 'dot', 'had', 'bed', 'tip'];
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function choicesFor(c: TtsClip): string[] {
  const same = clips.filter((x) => x.group === c.group).map((x) => strip(x.text));
  switch (c.group) {
    case 'letter': return ALL_LETTERS;
    case 'number': return [...same, ...DECOY_NUMBERS.map((d) => d[0].toUpperCase() + d.slice(1))];
    case 'color': return [...same, 'Red', 'Grey', 'Great', 'Bread'];
    case 'word': return [...same, ...DECOY_WORDS.map((d) => d[0].toUpperCase() + d.slice(1))];
    case 'instruction': {
      const extra: string[] = [];
      for (const d of DECOY_NUMBERS) extra.push(`Touch number ${d}`, `Find number ${d}`);
      for (const l of ALL_LETTERS.slice(16)) extra.push(`Find the letter ${l}`);
      extra.push('Choose the red color', 'Color the cat red', 'Color the bat blue');
      return [...same, ...extra];
    }
    default: return clips.filter((x) => x.group === 'prompt' || x.group === 'feedback').map((x) => strip(x.text));
  }
}

interface Item { id: string; slow: boolean; wav: string; expected: string; grammar: string; durationMs: number; peak: number; leadMs: number; tailMs: number }
const items: Item[] = [];
const grammars = new Map<string, string[]>();

for (const c of clips) {
  for (const slow of [false, true]) {
    const mp3 = path.join(ROOT, 'public', ttsPath(c.id, slow));
    if (!fs.existsSync(mp3)) {
      items.push({ id: c.id, slow, wav: '', expected: strip(c.text), grammar: '', durationMs: 0, peak: 0, leadMs: 0, tailMs: 0 });
      continue;
    }
    const pcm = await decodeMp3(mp3);
    let peak = 0;
    let first = -1;
    let last = -1;
    for (let i = 0; i < pcm.data.length; i++) {
      const a = Math.abs(pcm.data[i]);
      if (a > peak) peak = a;
      if (a > 0.02) { if (first < 0) first = i; last = i; }
    }
    const wav = path.join(OUT, `${c.id}${slow ? '.slow' : ''}.wav`);
    fs.writeFileSync(wav, wavBytes(resample(pcm, 16000)));
    const g = `${c.group}`;
    if (!grammars.has(g)) grammars.set(g, [...new Set(choicesFor(c))]);
    items.push({
      id: c.id, slow, wav, expected: strip(c.text), grammar: g,
      durationMs: Math.round((pcm.data.length / pcm.rate) * 1000), peak: +peak.toFixed(3),
      leadMs: Math.round((first / pcm.rate) * 1000), tailMs: Math.round(((pcm.data.length - last) / pcm.rate) * 1000),
    });
  }
}
freeDecoder();

const manifest = path.join(OUT, 'manifest.json');
fs.writeFileSync(manifest, JSON.stringify({ grammars: Object.fromEntries(grammars), items: items.filter((i) => i.wav) }));
const raw = execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts', 'recognize.ps1'), manifest], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
const results: { wav: string; text: string; confidence: number }[] = JSON.parse(raw.trim());
const byWav = new Map(results.map((r) => [r.wav, r]));

const report = items.map((i) => {
  const r = byWav.get(i.wav);
  const heard = r?.text ?? '';
  const ok = !!i.wav && heard.toLowerCase() === i.expected.toLowerCase() && i.peak > 0.1;
  return { ...i, heard, confidence: r?.confidence ?? 0, ok };
});
fs.writeFileSync(path.join(ROOT, 'scripts', 'audio-report.json'), JSON.stringify(report, null, 1));
const bad = report.filter((r) => !r.ok);
fs.writeFileSync(path.join(ROOT, 'src', 'audio', 'tts-audit.json'), JSON.stringify({ checkedAt: new Date().toISOString().slice(0, 10), total: report.length, confirmed: report.length - bad.length, unconfirmed: bad.map((b) => ({ id: b.id, slow: b.slow, heard: b.heard })) }, null, 1));
console.log(`checked ${report.length} files; recognised exactly: ${report.length - bad.length}; problems: ${bad.length}`);
for (const b of bad) console.log(`  ✗ ${b.id}${b.slow ? ' (slow)' : ''}: expected "${b.expected}", heard "${b.heard}" (conf ${b.confidence.toFixed(2)}, peak ${b.peak})`);
const lowConf = report.filter((r) => r.ok && r.confidence < 0.5);
console.log(`low-confidence but correct: ${lowConf.length}`);
for (const b of lowConf) console.log(`  ~ ${b.id}${b.slow ? ' (slow)' : ''}: "${b.heard}" conf ${b.confidence.toFixed(2)}`);
