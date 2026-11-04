// Mixed Hebrew + English instructions.
// A Hebrew text may contain English learning content as markup:
//   {l:a} letter A (shown "A", spoken as the English letter name)
//   {lo:a} small letter (shown "a", spoken as the letter name)
//   {w:ball} word · {c:orange} colour · {n:7} number
// The text is split into segments: Hebrew parts are spoken by a Hebrew voice
// (pre-recorded he-* clips), English parts by the American English voice.
// Nothing is ever read by a voice of the other language.

import { clipId } from './clips.ts';
import { numberWord } from '../content/numbers.ts';

export type Token =
  | { kind: 'he'; text: string }
  | { kind: 'en'; text: string; clip: string | null };

const MARK = /\{(l|lo|w|c|n):([^}]+)\}/g;
const HEBREW = /[֐-׿]/;

export function parseMixed(text: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(MARK)) {
    if (m.index! > last) out.push({ kind: 'he', text: text.slice(last, m.index) });
    const [, k, v] = m;
    if (k === 'l') out.push({ kind: 'en', text: v.toUpperCase(), clip: clipId.letterName(v as never) });
    else if (k === 'lo') out.push({ kind: 'en', text: v.toLowerCase(), clip: clipId.letterName(v as never) });
    else if (k === 'w') out.push({ kind: 'en', text: v, clip: clipId.word(v) });
    else if (k === 'c') out.push({ kind: 'en', text: v, clip: clipId.color(v as never) });
    else out.push({ kind: 'en', text: numberWord(+v), clip: clipId.number(+v) });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'he', text: text.slice(last) });
  return out;
}

/** Plain text without markup (English parts in place), e.g. for aria labels. */
export function plainText(text: string) {
  return parseMixed(text).map((t) => t.text).join('');
}

/** Normalised Hebrew segment as recorded (no surrounding spaces or dangling punctuation). */
export function normHe(text: string) {
  return text.replace(/\s+/g, ' ').replace(/^[\s,.:;–-]+|[\s,:;–-]+$/g, '').trim();
}

function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const heClipId = (text: string) => `he-${fnv(normHe(text))}`;

/** Clip ids to speak a (mixed) Hebrew text, in order. */
export function speechClips(text: string): string[] {
  const ids: string[] = [];
  for (const t of parseMixed(text)) {
    if (t.kind === 'en') { if (t.clip) ids.push(t.clip); }
    else if (HEBREW.test(t.text)) ids.push(heClipId(t.text));
  }
  return ids;
}

/** Hebrew segments of a text that need a recording. */
export function hebrewSegments(text: string): string[] {
  return parseMixed(text).filter((t) => t.kind === 'he' && HEBREW.test(t.text)).map((t) => normHe(t.text));
}
