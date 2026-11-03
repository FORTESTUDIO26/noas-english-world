// Catalog of every sound the app can play. Content files describe WHAT is
// taught; this file turns it into clip ids + the English text of each clip.
// scripts/make-audio.ts reads the same catalog to record the files, so adding
// a clip here and re-running the script is all it takes to add a sound.
//
// Two separate families, on purpose:
//   tts clips      -> public/audio/<id>.mp3 and public/audio/slow/<id>.mp3
//   phoneme clips  -> public/audio/phonemes/<letter>.wav (cut from real speech,
//                     never a TTS reading of a single character)

import { LETTERS, type LetterId } from '../content/letters.ts';
import { NUMBERS } from '../content/numbers.ts';
import { COLORS, type ColorId } from '../content/colors.ts';
import { WORDS, COLORABLE, type WordId } from '../content/words.ts';

export interface TtsClip {
  id: string;
  text: string;
  group: 'letter' | 'number' | 'color' | 'word' | 'instruction' | 'prompt' | 'feedback';
}

/** Sounds used only inside word segmenting (t), not taught as letters. */
export const EXTRA_PHONEMES = [{ id: 't', ipa: 't', carrier: { word: 'tap', part: 'onset' as const } }];

export const PROMPTS = {
  listenChoose: 'Listen and choose.',
  whichSound: 'Which letter makes this sound?',
  matchLetters: 'Match the big and small letters.',
  missingLetter: 'Which letter is missing?',
  firstLetter: 'Which letter does it start with?',
  trace: 'Trace the letter.',
  countHowMany: 'Count. How many?',
  whichPicture: 'Which picture is it?',
  readWord: 'Read the word. Find the picture.',
  whichWord: 'Which word is it?',
  matchNumbers: 'Match the number and the word.',
  whichLetter: 'Which letter is it?',
  whichColor: 'Which color is it?',
  missingInWord: 'Which letter is missing?',
} as const;
export type PromptId = keyof typeof PROMPTS;

export const FEEDBACK = {
  great: 'Great job!',
  wellDone: 'Well done!',
  excellent: 'Excellent!',
  tryAgain: 'Try again.',
  listenAgain: "Let's listen again.",
  hello: "Hi! Let's learn English!",
} as const;
export type FeedbackId = keyof typeof FEEDBACK;

export const clipId = {
  letterName: (l: LetterId) => `letter-${l}`,
  findLetter: (l: LetterId) => `find-letter-${l}`,
  number: (n: number) => `num-${n}`,
  touchNumber: (n: number) => `touch-number-${n}`,
  findNumber: (n: number) => `find-number-${n}`,
  color: (c: ColorId) => `color-${c}`,
  chooseColor: (c: ColorId) => `choose-color-${c}`,
  colorThing: (w: WordId, c: ColorId) => `paint-${w}-${c}`,
  thenColorThing: (w: WordId, c: ColorId) => `then-paint-${w}-${c}`,
  word: (w: string) => `word-${w}`,
  prompt: (p: PromptId) => `prompt-${p}`,
  feedback: (f: FeedbackId) => `fb-${f}`,
  phoneme: (id: string) => `sound-${id}`,
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildTtsClips(): TtsClip[] {
  const out: TtsClip[] = [];
  for (const l of LETTERS) {
    // Spoken as a letter name (checked with speech recognition in scripts/verify-audio).
    out.push({ id: clipId.letterName(l.id), text: `${l.upper}.`, group: 'letter' });
    out.push({ id: clipId.findLetter(l.id), text: `Find the letter ${l.upper}.`, group: 'instruction' });
  }
  for (const n of NUMBERS) {
    out.push({ id: clipId.number(n.n), text: `${cap(n.word)}.`, group: 'number' });
    out.push({ id: clipId.touchNumber(n.n), text: `Touch number ${n.word}.`, group: 'instruction' });
    out.push({ id: clipId.findNumber(n.n), text: `Find number ${n.word}.`, group: 'instruction' });
  }
  for (const c of COLORS) {
    out.push({ id: clipId.color(c.id), text: `${cap(c.id)}.`, group: 'color' });
    out.push({ id: clipId.chooseColor(c.id), text: `Choose the ${c.id} color.`, group: 'instruction' });
    for (const w of COLORABLE) {
      out.push({ id: clipId.colorThing(w, c.id), text: `Color the ${w} ${c.id}.`, group: 'instruction' });
      out.push({ id: clipId.thenColorThing(w, c.id), text: `Now color the ${w} ${c.id}.`, group: 'instruction' });
    }
  }
  const words = new Set<string>([...WORDS.map((w) => w.id), ...LETTERS.map((l) => l.example)]);
  for (const w of words) out.push({ id: clipId.word(w), text: `${cap(w)}.`, group: 'word' });
  for (const [k, text] of Object.entries(PROMPTS)) out.push({ id: clipId.prompt(k as PromptId), text, group: 'prompt' });
  for (const [k, text] of Object.entries(FEEDBACK)) out.push({ id: clipId.feedback(k as FeedbackId), text, group: 'feedback' });
  return out;
}

export interface PhonemeClip {
  id: string;
  ipa: string;
  carrier: { word: string; part: 'onset' | 'vowel' | 'coda' };
}

export function buildPhonemeClips(): PhonemeClip[] {
  return [
    ...LETTERS.map((l) => ({ id: l.id as string, ipa: l.ipa, carrier: l.carrier })),
    ...EXTRA_PHONEMES,
  ];
}

export const ttsPath = (id: string, slow = false) => `audio/${slow ? 'slow/' : ''}${id}.mp3`;
export const phonemePath = (id: string) => `audio/phonemes/${id}.wav`;
