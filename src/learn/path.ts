// The six-meeting learning path. Each meeting mixes short learning blocks
// with short exercises. "Done" only means Noa went through it; what she
// actually knows is measured separately by first-try answers (mastery).

import { LETTERS, type LetterId } from '../content/letters.ts';
import { NUMBERS } from '../content/numbers.ts';
import { COLORS, type ColorId } from '../content/colors.ts';
import { WORDS, COLORABLE, type WordId } from '../content/words.ts';
import {
  buildGame, buildListeningLab, qCount, qFirstLetter, qHearColor, qHearNumber, qHearWord, qLetterName, qLetterPairs,
  qLetterSound, qMissingLetter, qNumberWord, qColorWord, qPaint, qPictureToWord, qTrace, qWordGap, qWordToPicture,
  type GameId, type Question,
} from './questions.ts';
import { T } from '../text/he.ts';
import { mastery, shuffle, type Save, type SkillKind } from './progress.ts';

export type Step =
  | { kind: 'learnLetters'; letters: LetterId[]; title: string }
  | { kind: 'learnNumbers'; title: string }
  | { kind: 'learnColors'; title: string }
  | { kind: 'learnWords'; title: string }
  | { kind: 'game'; game: GameId; count: number; letters?: LetterId[]; title: string }
  | { kind: 'lab'; count: number; title: string }
  | { kind: 'review'; count: number; title: string }
  | { kind: 'exam'; title: string };

export interface SessionDef {
  id: string;
  n: number;
  title: string;
  goal: string;
  minutes: string;
  steps: Step[];
  /** skill keys this meeting teaches (for "how much is really known") */
  skills: string[];
}

const ids = (from: LetterId, to: LetterId) => {
  const all = LETTERS.map((l) => l.id);
  return all.slice(all.indexOf(from), all.indexOf(to) + 1);
};
const AF = ids('a', 'f');
const GL = ids('g', 'l');
const MP = ids('m', 'p');
const ALL = LETTERS.map((l) => l.id);
const letterSkills = (ls: LetterId[]) => ls.flatMap((l) => [`letterName:${l}`, `letterSound:${l}`, `letterCase:${l}`, `letterWrite:${l}`]);

export const SESSIONS: SessionDef[] = [
  {
    id: 's1', n: 1, title: T.sessions.s1[0], goal: T.sessions.s1[1], minutes: '20',
    steps: [
      { kind: 'learnLetters', letters: ['a', 'b', 'c'], title: T.steps.know('A, B, C') },
      { kind: 'game', game: 'letterName', count: 4, letters: ['a', 'b', 'c'], title: T.steps.short },
      { kind: 'learnLetters', letters: ['d', 'e', 'f'], title: T.steps.know('D, E, F') },
      { kind: 'game', game: 'letterName', count: 6, letters: AF, title: T.steps.hearChoose },
      { kind: 'game', game: 'letterSound', count: 6, letters: AF, title: T.steps.whichSound },
      { kind: 'game', game: 'letterPairs', count: 1, letters: AF, title: T.steps.pairs },
      { kind: 'game', game: 'firstLetter', count: 4, letters: AF, title: T.steps.first },
      { kind: 'game', game: 'trace', count: 2, letters: AF, title: T.steps.write },
    ],
    skills: letterSkills(AF),
  },
  {
    id: 's2', n: 2, title: T.sessions.s2[0], goal: T.sessions.s2[1], minutes: '20',
    steps: [
      { kind: 'game', game: 'letterSound', count: 4, letters: AF, title: T.steps.warmup },
      { kind: 'learnLetters', letters: ['g', 'h', 'i'], title: T.steps.know('G, H, I') },
      { kind: 'game', game: 'letterName', count: 4, letters: ['g', 'h', 'i'], title: T.steps.short },
      { kind: 'learnLetters', letters: ['j', 'k', 'l'], title: T.steps.know('J, K, L') },
      { kind: 'game', game: 'letterName', count: 6, letters: GL, title: T.steps.hearChoose },
      { kind: 'game', game: 'letterSound', count: 6, letters: GL, title: T.steps.whichSound },
      { kind: 'game', game: 'letterName', count: 4, letters: AF, title: T.steps.reviewAF },
      { kind: 'game', game: 'missingLetter', count: 3, letters: [...AF, ...GL], title: T.steps.missing },
      { kind: 'game', game: 'trace', count: 2, letters: GL, title: T.steps.write },
    ],
    skills: letterSkills(GL),
  },
  {
    id: 's3', n: 3, title: T.sessions.s3[0], goal: T.sessions.s3[1], minutes: '25',
    steps: [
      { kind: 'learnLetters', letters: ['m', 'n'], title: T.steps.know('M, N') },
      { kind: 'game', game: 'letterName', count: 3, letters: ['m', 'n'], title: T.steps.short },
      { kind: 'learnLetters', letters: ['o', 'p'], title: T.steps.know('O, P') },
      { kind: 'game', game: 'letterSound', count: 4, letters: MP, title: T.steps.whichSound },
      { kind: 'game', game: 'letterPairs', count: 2, letters: ALL, title: T.steps.pairsAll },
      { kind: 'game', game: 'letterLook', count: 4, letters: ALL, title: T.steps.detective },
      { kind: 'game', game: 'letterSound', count: 6, letters: ALL, title: T.steps.allSounds },
      { kind: 'game', game: 'missingLetter', count: 3, letters: ALL, title: T.steps.missing },
      { kind: 'game', game: 'firstLetter', count: 4, letters: ALL, title: T.steps.first },
      { kind: 'game', game: 'trace', count: 2, letters: MP, title: T.steps.write },
    ],
    skills: letterSkills(MP),
  },
  {
    id: 's4', n: 4, title: T.sessions.s4[0], goal: T.sessions.s4[1], minutes: '25',
    steps: [
      { kind: 'learnNumbers', title: T.steps.knowNumbers },
      { kind: 'game', game: 'hearNumber', count: 6, title: T.steps.hearNumber },
      { kind: 'game', game: 'teens', count: 4, title: T.steps.teens },
      { kind: 'game', game: 'count', count: 3, title: T.steps.count },
      { kind: 'learnColors', title: T.steps.knowColors },
      { kind: 'game', game: 'hearColor', count: 6, title: T.steps.hearColor },
      { kind: 'game', game: 'paint', count: 2, title: T.steps.paint },
      { kind: 'lab', count: 6, title: T.steps.lab },
    ],
    skills: [...NUMBERS.map((x) => `number:${x.n}`), ...COLORS.map((c) => `color:${c.id}`)],
  },
  {
    id: 's5', n: 5, title: T.sessions.s5[0], goal: T.sessions.s5[1], minutes: '20',
    steps: [
      { kind: 'learnWords', title: T.steps.knowWords },
      { kind: 'game', game: 'hearWord', count: 4, title: T.steps.hearChoose },
      { kind: 'game', game: 'wordPicture', count: 7, title: T.steps.readFind },
      { kind: 'game', game: 'wordFirst', count: 4, title: T.steps.first },
      { kind: 'game', game: 'pictureWord', count: 5, title: T.steps.whatWritten },
      { kind: 'game', game: 'wordGap', count: 4, title: T.steps.missing },
    ],
    skills: WORDS.map((w) => `word:${w.id}`),
  },
  {
    id: 's6', n: 6, title: T.sessions.s6[0], goal: T.sessions.s6[1], minutes: '25',
    steps: [
      { kind: 'review', count: 12, title: T.steps.weak },
      { kind: 'exam', title: T.steps.exam },
    ],
    skills: [],
  },
];

export function sessionById(id: string) {
  return SESSIONS.find((s) => s.id === id);
}

/** Share of a meeting's skills Noa answered right 3 times in a row. */
export function sessionKnown(save: Save, s: SessionDef) {
  if (!s.skills.length) return null;
  const known = s.skills.filter((k) => mastery(save.skills[k]) === 'known').length;
  return { known, total: s.skills.length };
}

export function buildStep(step: Step, save: Save): Question[] {
  if (step.kind === 'game') return buildGame(step.game, save, step.count, { letters: step.letters });
  if (step.kind === 'lab') return buildListeningLab(save, step.count);
  if (step.kind === 'review') return buildReview(save, step.count);
  return [];
}

// ------------------------------------------------------------------ review of weak skills

/** One fresh question that tests the given skill key. */
export function questionForSkill(key: string, rnd = Math.random): Question | null {
  const [kind, item] = key.split(':') as [SkillKind, string];
  switch (kind) {
    case 'letterName': return qLetterName(item as LetterId, rnd);
    case 'letterSound': return qLetterSound(item as LetterId, rnd);
    case 'letterCase': return qLetterPairs([item as LetterId, ...shuffle(LETTERS.map((l) => l.id).filter((x) => x !== item), rnd).slice(0, 3)], rnd);
    case 'letterWrite': return qTrace(item as LetterId, rnd() < 0.5 ? 'upper' : 'lower');
    case 'letterSeq': return qMissingLetter(rnd);
    case 'number': return qHearNumber(+item, rnd, rnd() < 0.5 ? 'touch' : 'plain');
    case 'count': return qCount(+item, rnd);
    case 'numberRead': return qNumberWord(+item, rnd);
    case 'color': return rnd() < 0.5 ? qHearColor(item as ColorId, rnd, 'choose') : qPaint([{ thing: COLORABLE[Math.floor(rnd() * COLORABLE.length)], color: item as ColorId }], rnd);
    case 'colorRead': return qColorWord(item as ColorId, rnd);
    case 'word': return rnd() < 0.5 ? qWordToPicture(item as WordId, rnd) : qPictureToWord(item as WordId, rnd);
    case 'wordListen': return qHearWord(item as WordId, rnd);
    case 'wordFirst': return qFirstLetter(item, rnd);
    case 'wordSpell': return qWordGap(item as WordId, rnd);
    case 'listen2': {
      const [w, c] = item.split('-') as [WordId, ColorId];
      return qPaint([{ thing: w, color: c }], rnd);
    }
  }
  return null;
}

/** Weakest skills first: wrong last time, many mistakes, then not yet known. */
export function weakestSkills(save: Save, limit: number): string[] {
  const scored = Object.entries(save.skills)
    .map(([k, s]) => {
      const m = mastery(s);
      const errors = [...s.r].filter((x) => x === '0').length;
      const score = (m === 'weak' ? 10 : m === 'learning' ? 4 : 0) + errors * 2 + (s.r.endsWith('0') ? 5 : 0);
      return { k, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.k);
}

export function buildReview(save: Save, count: number, rnd = Math.random): Question[] {
  const weak = weakestSkills(save, count);
  const out: Question[] = [];
  for (let i = 0; out.length < count && i < count * 2; i++) {
    const key = weak.length ? weak[i % weak.length] : null;
    const q = key ? questionForSkill(key, rnd) : null;
    if (q) out.push(q);
    else break;
  }
  // Not enough mistakes yet: fill with a balanced mix from all topics.
  const fill: GameId[] = ['letterSound', 'hearNumber', 'hearColor', 'wordPicture', 'letterName', 'teens'];
  let f = 0;
  while (out.length < count) out.push(...buildGame(fill[f++ % fill.length], save, 1));
  return shuffle(out, rnd).slice(0, count);
}
