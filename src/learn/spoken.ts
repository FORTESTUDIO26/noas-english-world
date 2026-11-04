// Every Hebrew text the app SPEAKS (instructions, help, game explanations,
// feedback). scripts/make-audio.ts records one Hebrew clip per segment, and a
// test checks that every spoken segment has a recording.
import { T } from '../text/he.ts';
import { LETTERS } from '../content/letters.ts';
import { COLORS } from '../content/colors.ts';
import { COLORABLE } from '../content/words.ts';
import { hebrewSegments } from '../audio/speech.ts';

export function spokenTexts(): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(T.q)) {
    if (k.endsWith('Explain')) continue; // explanations are read on screen
    if (typeof v === 'string') out.push(v);
  }
  for (const l of LETTERS) out.push(T.q.upperToLower(l.id));
  for (const w of COLORABLE) for (const c of COLORS) out.push(T.q.paintLearn(w, c.id));
  out.push(T.q.paintLearnTwo(COLORABLE[0], COLORS[0].id, COLORABLE[1], COLORS[1].id));
  for (const [k, v] of Object.entries(T.intro)) {
    if (['gotIt', 'fullHelp', 'title'].includes(k)) continue;
    out.push(v);
  }
  out.push(...T.feedback.praise, T.feedback.tryAgain);
  return out;
}

/** Unique Hebrew segments that need a recording. */
export function spokenHebrewSegments(): string[] {
  return [...new Set(spokenTexts().flatMap(hebrewSegments))];
}
