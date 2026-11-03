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
    id: 's1', n: 1, title: 'אותיות A–F', goal: 'שמות, צלילים וכתיבה של A עד F', minutes: '20',
    steps: [
      { kind: 'learnLetters', letters: ['a', 'b', 'c'], title: 'מכירות את A, B, C' },
      { kind: 'game', game: 'letterName', count: 4, letters: ['a', 'b', 'c'], title: 'תרגיל קצר' },
      { kind: 'learnLetters', letters: ['d', 'e', 'f'], title: 'מכירות את D, E, F' },
      { kind: 'game', game: 'letterName', count: 6, letters: AF, title: 'שומעים ובוחרים' },
      { kind: 'game', game: 'letterSound', count: 6, letters: AF, title: 'איזה צליל?' },
      { kind: 'game', game: 'letterPairs', count: 1, letters: AF, title: 'גדולה וקטנה' },
      { kind: 'game', game: 'firstLetter', count: 4, letters: AF, title: 'האות הפותחת' },
      { kind: 'game', game: 'trace', count: 2, letters: AF, title: 'כותבים' },
    ],
    skills: letterSkills(AF),
  },
  {
    id: 's2', n: 2, title: 'אותיות G–L', goal: 'G עד L, וחזרה על A–F', minutes: '20',
    steps: [
      { kind: 'game', game: 'letterSound', count: 4, letters: AF, title: 'חימום: זוכרות את A–F?' },
      { kind: 'learnLetters', letters: ['g', 'h', 'i'], title: 'מכירות את G, H, I' },
      { kind: 'game', game: 'letterName', count: 4, letters: ['g', 'h', 'i'], title: 'תרגיל קצר' },
      { kind: 'learnLetters', letters: ['j', 'k', 'l'], title: 'מכירות את J, K, L' },
      { kind: 'game', game: 'letterName', count: 6, letters: GL, title: 'שומעים ובוחרים' },
      { kind: 'game', game: 'letterSound', count: 6, letters: GL, title: 'איזה צליל?' },
      { kind: 'game', game: 'letterName', count: 4, letters: AF, title: 'חזרה על A–F' },
      { kind: 'game', game: 'missingLetter', count: 3, letters: [...AF, ...GL], title: 'האות החסרה' },
      { kind: 'game', game: 'trace', count: 2, letters: GL, title: 'כותבים' },
    ],
    skills: letterSkills(GL),
  },
  {
    id: 's3', n: 3, title: 'אותיות M–P וכל האותיות', goal: 'M עד P, וחזרה על כל 16 האותיות', minutes: '25',
    steps: [
      { kind: 'learnLetters', letters: ['m', 'n'], title: 'מכירות את M, N' },
      { kind: 'game', game: 'letterName', count: 3, letters: ['m', 'n'], title: 'תרגיל קצר' },
      { kind: 'learnLetters', letters: ['o', 'p'], title: 'מכירות את O, P' },
      { kind: 'game', game: 'letterSound', count: 4, letters: MP, title: 'איזה צליל?' },
      { kind: 'game', game: 'letterPairs', count: 2, letters: ALL, title: 'גדולה וקטנה – כל האותיות' },
      { kind: 'game', game: 'letterLook', count: 4, letters: ALL, title: 'בלש האותיות' },
      { kind: 'game', game: 'letterSound', count: 6, letters: ALL, title: 'כל הצלילים' },
      { kind: 'game', game: 'missingLetter', count: 3, letters: ALL, title: 'האות החסרה' },
      { kind: 'game', game: 'firstLetter', count: 4, letters: ALL, title: 'האות הפותחת' },
      { kind: 'game', game: 'trace', count: 2, letters: MP, title: 'כותבים' },
    ],
    skills: letterSkills(MP),
  },
  {
    id: 's4', n: 4, title: 'מספרים וצבעים', goal: 'מספרים 1–20, צבעים, והבנת הנשמע', minutes: '25',
    steps: [
      { kind: 'learnNumbers', title: 'מכירות את המספרים 1–20' },
      { kind: 'game', game: 'hearNumber', count: 6, title: 'שומעים ובוחרים מספר' },
      { kind: 'game', game: 'teens', count: 4, title: '13 או 3? 14 או 4?' },
      { kind: 'game', game: 'count', count: 3, title: 'סופרים' },
      { kind: 'learnColors', title: 'מכירות את הצבעים' },
      { kind: 'game', game: 'hearColor', count: 6, title: 'שומעים ולוחצים' },
      { kind: 'game', game: 'paint', count: 2, title: 'צובעים לפי הוראה' },
      { kind: 'lab', count: 6, title: 'מעבדת הקשבה' },
    ],
    skills: [...NUMBERS.map((x) => `number:${x.n}`), ...COLORS.map((c) => `color:${c.id}`)],
  },
  {
    id: 's5', n: 5, title: 'שבע המילים', goal: 'קריאה של cat, dog, banana, tap, ball, bag, hat', minutes: '20',
    steps: [
      { kind: 'learnWords', title: 'מכירות את המילים' },
      { kind: 'game', game: 'hearWord', count: 4, title: 'שומעים ובוחרים' },
      { kind: 'game', game: 'wordPicture', count: 7, title: 'קוראים ומוצאים תמונה' },
      { kind: 'game', game: 'wordFirst', count: 4, title: 'האות הפותחת' },
      { kind: 'game', game: 'pictureWord', count: 5, title: 'מה כתוב?' },
      { kind: 'game', game: 'wordGap', count: 4, title: 'האות החסרה' },
    ],
    skills: WORDS.map((w) => `word:${w.id}`),
  },
  {
    id: 's6', n: 6, title: 'חזרה ומבחן לדוגמה', goal: 'תרגול החולשות ומבחן לדוגמה', minutes: '25',
    steps: [
      { kind: 'review', count: 12, title: 'מתרגלות את מה שעוד קשה' },
      { kind: 'exam', title: 'מבחן לדוגמה' },
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
