// Question model + generators for every game. Everything is built only from
// the closed content lists in src/content (A–P, 1–20, 10 colours, 7 words).

import { LETTERS, letter, type LetterId } from '../content/letters.ts';
import { CONFUSABLE_PAIRS, NUMBERS, numberWord } from '../content/numbers.ts';
import { COLORS, color, type ColorId } from '../content/colors.ts';
import { WORDS, COLORABLE, word, type WordId } from '../content/words.ts';
import { clipId } from '../audio/clips.ts';
import { practiceWeight, shuffle, skillKey, weightedPick, type Save, type SkillKind } from './progress.ts';

export type Visual =
  | { t: 'letter'; text: string }
  | { t: 'number'; n: number }
  | { t: 'color'; id: ColorId }
  | { t: 'thing'; id: ColorId }
  | { t: 'picture'; id: string }
  | { t: 'word'; text: string }
  | { t: 'count'; n: number; thing: string }
  | { t: 'seq'; items: (string | null)[] }
  | { t: 'gap'; word: string; gap: number }
  | { t: 'audio'; clip: string };

/** Exam / report areas. */
export type Area = 'listening' | 'letterNames' | 'letterCase' | 'phonics' | 'writing' | 'reading' | 'numbers' | 'colors' | 'letters';

export const AREA_HE: Record<Area, string> = {
  listening: 'הבנת הנשמע',
  letterNames: 'שמות האותיות',
  letterCase: 'אות גדולה וקטנה',
  phonics: 'צלילי האותיות',
  writing: 'כתיבת אותיות',
  reading: 'קריאת מילים',
  numbers: 'מספרים',
  colors: 'צבעים',
  letters: 'אותיות',
};

export interface Prompt {
  /** clips played automatically and with the replay button */
  audio: string[];
  /** Hebrew instruction line */
  he: string;
  /** English text of what is heard. Hidden until answered when `listening`. */
  en?: string;
  /** Learning-mode help in Hebrew that explains the task without giving the answer. */
  helpHe?: string;
}

interface Base {
  id: string;
  area: Area;
  prompt: Prompt;
  /** listening task: never show the English text before the answer */
  listening?: boolean;
}

export interface ChoiceQ extends Base {
  kind: 'choice';
  skill: string;
  show?: Visual;
  /** clip to play when the shown visual is tapped */
  showAudio?: string;
  options: Visual[];
  answer: number;
  /** after a correct answer / at reveal: English text + Hebrew explanation */
  explainHe: string;
  afterAudio?: string;
  bigOptions?: boolean;
}

export interface PairsQ extends Base {
  kind: 'pairs';
  pairs: { left: Visual; right: Visual; skill: string; leftAudio?: string }[];
  explainHe: string;
}

export interface TraceQ extends Base {
  kind: 'trace';
  letter: LetterId;
  case: 'upper' | 'lower';
  skill: string;
  explainHe: string;
}

export interface PaintQ extends Base {
  kind: 'paint';
  targets: { thing: WordId; color: ColorId; skill: string }[];
  palette: ColorId[];
  explainHe: string;
}

export type Question = ChoiceQ | PairsQ | TraceQ | PaintQ;

let seq = 0;
const qid = (p: string) => `${p}-${++seq}-${Math.random().toString(36).slice(2, 6)}`;

type Rnd = () => number;
const pickOne = <T,>(a: T[], rnd: Rnd) => a[Math.floor(rnd() * a.length)];

function distractors<T>(all: T[], answer: T, n: number, rnd: Rnd, avoid: (x: T) => boolean = () => false): T[] {
  return shuffle(all.filter((x) => x !== answer && !avoid(x)), rnd).slice(0, n);
}

function choice(answer: Visual, others: Visual[], rnd: Rnd) {
  const options = shuffle([answer, ...others], rnd);
  return { options, answer: options.indexOf(answer) };
}

const L = (s: string): Visual => ({ t: 'letter', text: s });

// Letters that share a sound (c and k are both /k/) are never in the same sound question.
const SAME_SOUND: Partial<Record<LetterId, LetterId>> = { c: 'k', k: 'c' };
/** Distractor letters where no two options make the same sound (never C and K together). */
function soundDistractors(pool: LetterId[], answer: LetterId, n: number, rnd: Rnd): LetterId[] {
  const out: LetterId[] = [];
  for (const x of shuffle(pool.filter((p) => p !== answer), rnd)) {
    if (out.length >= n) break;
    const taken = [answer, ...out];
    if (taken.some((t) => SAME_SOUND[t] === x)) continue;
    out.push(x);
  }
  return out;
}

// Look-alike letters for visual discrimination.
const LOOK_ALIKE: Partial<Record<LetterId, LetterId[]>> = {
  b: ['d', 'p'], d: ['b', 'p'], p: ['b', 'd'], m: ['n'], n: ['m', 'h'], h: ['n'],
  i: ['j', 'l'], j: ['i'], l: ['i'], e: ['c', 'o'], c: ['e', 'o'], o: ['c', 'a'], a: ['o', 'e'],
  f: ['e'], g: ['p', 'j'], k: ['h'],
};

// ---------------------------------------------------------------- letters

export function qLetterName(id: LetterId, rnd: Rnd = Math.random, pool: LetterId[] = LETTERS.map((l) => l.id)): ChoiceQ {
  const l = letter(id);
  const others = distractors(pool.length >= 4 ? pool : LETTERS.map((x) => x.id), id, 3, rnd).map((o) => L(letter(o).upper));
  const ans = L(l.upper);
  return {
    kind: 'choice', id: qid('ln'), area: 'letterNames', skill: skillKey('letterName', id), listening: true,
    prompt: { audio: [clipId.findLetter(id)], he: 'הקשיבי ובחרי את האות', en: `Find the letter ${l.upper}.`, helpHe: 'שומעים שם של אות באנגלית. בחרי את האות ששמעת.' },
    ...choice(ans, others, rnd), explainHe: `זו האות ${l.upper} – שמה באנגלית נשמע כך.`, afterAudio: clipId.letterName(id), bigOptions: true,
  };
}

export function qLetterSound(id: LetterId, rnd: Rnd = Math.random, pool: LetterId[] = LETTERS.map((l) => l.id)): ChoiceQ {
  const l = letter(id);
  const src = pool.length >= 3 ? pool : LETTERS.map((x) => x.id);
  const others = soundDistractors(src, id, 2, rnd).map((o) => L(letter(o).upper));
  const ans = L(l.upper);
  return {
    kind: 'choice', id: qid('ls'), area: 'phonics', skill: skillKey('letterSound', id), listening: true,
    prompt: { audio: [clipId.prompt('whichSound'), clipId.phoneme(id)], he: 'איזו אות עושה את הצליל הזה?', en: 'Which letter makes this sound?', helpHe: 'שומעים צליל קצר (לא את שם האות). איזו אות מתחילה כך מילים?' },
    showAudio: clipId.phoneme(id), show: { t: 'audio', clip: clipId.phoneme(id) },
    ...choice(ans, others, rnd), explainHe: `האות ${l.upper} עושה את הצליל /${l.ipa}/ – כמו בתחילת ${l.example}.`, afterAudio: clipId.word(l.example), bigOptions: true,
  };
}

export function qLetterLookAlike(id: LetterId, rnd: Rnd = Math.random): ChoiceQ {
  const l = letter(id);
  const near = (LOOK_ALIKE[id] ?? []).slice(0, 2);
  const extra = distractors(LETTERS.map((x) => x.id), id, 3 - near.length, rnd, (x) => near.includes(x));
  const others = [...near, ...extra].map((o) => L(letter(o).lower));
  const ans = L(l.lower);
  return {
    kind: 'choice', id: qid('lk'), area: 'letterNames', skill: skillKey('letterName', id), listening: true,
    prompt: { audio: [clipId.findLetter(id)], he: 'מצאי את האות הקטנה ששמעת', en: `Find the letter ${l.upper}.`, helpHe: 'שומעים שם של אות. חפשי את האות הקטנה. שימי לב לאותיות שנראות דומה!' },
    ...choice(ans, others, rnd), explainHe: `${l.lower} היא האות הקטנה של ${l.upper}.`, afterAudio: clipId.letterName(id), bigOptions: true,
  };
}

export function qLetterPairs(ids: LetterId[], rnd: Rnd = Math.random): PairsQ {
  return {
    kind: 'pairs', id: qid('lp'), area: 'letterCase',
    prompt: { audio: [clipId.prompt('matchLetters')], he: 'חברי כל אות גדולה לאות הקטנה שלה', en: 'Match the big and small letters.' },
    pairs: shuffle(ids, rnd).slice(0, 4).map((id) => ({ left: L(letter(id).upper), right: L(letter(id).lower), skill: skillKey('letterCase', id), leftAudio: clipId.letterName(id) })),
    explainHe: 'לכל אות יש צורה גדולה וצורה קטנה, ושתיהן נקראות באותו שם.',
  };
}

export function qUpperToLower(id: LetterId, rnd: Rnd = Math.random): ChoiceQ {
  const l = letter(id);
  const near = (LOOK_ALIKE[id] ?? []).slice(0, 1);
  const others = [...near, ...distractors(LETTERS.map((x) => x.id), id, 2 - near.length, rnd, (x) => near.includes(x))].map((o) => L(letter(o).lower));
  return {
    kind: 'choice', id: qid('ul'), area: 'letterCase', skill: skillKey('letterCase', id),
    prompt: { audio: [], he: `מה האות הקטנה של ${l.upper}?` },
    show: L(l.upper), showAudio: clipId.letterName(id),
    ...choice(L(l.lower), others, rnd), explainHe: `האות הקטנה של ${l.upper} היא ${l.lower}.`, afterAudio: clipId.letterName(id), bigOptions: true,
  };
}

export function qMissingLetter(rnd: Rnd = Math.random, range: LetterId[] = LETTERS.map((l) => l.id)): ChoiceQ {
  const all = LETTERS.map((l) => l.id);
  const lo = Math.max(0, all.indexOf(range[0]));
  const hi = Math.min(all.length - 1, all.indexOf(range[range.length - 1]));
  const span = Math.max(4, hi - lo + 1);
  const start = Math.min(all.length - 4, lo + Math.floor(rnd() * Math.max(1, span - 3)));
  const run = all.slice(start, start + 4);
  const gap = 1 + Math.floor(rnd() * 3);
  const ansId = run[gap];
  const lower = rnd() < 0.4;
  const fmt = (id: LetterId) => (lower ? letter(id).lower : letter(id).upper);
  const others = distractors(all, ansId, 2, rnd, (x) => run.includes(x)).map((o) => L(fmt(o)));
  return {
    kind: 'choice', id: qid('ms'), area: 'letters', skill: skillKey('letterSeq', ansId),
    prompt: { audio: [clipId.prompt('missingLetter')], he: 'איזו אות חסרה ברצף?', en: 'Which letter is missing?' },
    show: { t: 'seq', items: run.map((id, i) => (i === gap ? null : fmt(id))) },
    ...choice(L(fmt(ansId)), others, rnd), explainHe: `בסדר האלף־בית באנגלית: ${run.map(fmt).join(' ')}`, afterAudio: clipId.letterName(ansId), bigOptions: true,
  };
}

/** Picture words for "which letter does it start with" (tap starts with t, outside A–P). */
export const FIRST_LETTER_WORDS: { w: string; picture: string; first: LetterId; he: string }[] = [
  ...LETTERS.map((l) => ({ w: l.example, picture: l.picture, first: l.id, he: l.exampleHe })),
  ...WORDS.filter((w) => w.id !== 'tap' && !LETTERS.some((l) => l.example === w.id)).map((w) => ({ w: w.id, picture: w.picture, first: w.id[0] as LetterId, he: w.he })),
];

export function qFirstLetter(w: string, rnd: Rnd = Math.random): ChoiceQ {
  const item = FIRST_LETTER_WORDS.find((x) => x.w === w)!;
  const l = letter(item.first);
  const others = soundDistractors(LETTERS.map((x) => x.id), item.first, 2, rnd).map((o) => L(letter(o).lower));
  const isVocab = WORDS.some((x) => x.id === w);
  return {
    kind: 'choice', id: qid('fl'), area: 'phonics', skill: isVocab ? skillKey('wordFirst', w) : skillKey('letterSound', item.first),
    prompt: { audio: [clipId.word(w), clipId.prompt('firstLetter')], he: 'באיזו אות מתחילה המילה?', en: 'Which letter does it start with?', helpHe: 'הקשיבי לצליל הראשון של המילה.' },
    show: { t: 'picture', id: item.picture }, showAudio: clipId.word(w),
    ...choice(L(l.lower), others, rnd), explainHe: `${w} מתחילה בצליל /${l.ipa}/ – האות ${l.upper} ${l.lower}.`, bigOptions: true,
  };
}

export function qTrace(id: LetterId, which: 'upper' | 'lower'): TraceQ {
  const l = letter(id);
  return {
    kind: 'trace', id: qid('tr'), area: 'writing', letter: id, case: which, skill: skillKey('letterWrite', id),
    prompt: { audio: [clipId.prompt('trace'), clipId.letterName(id)], he: `עברי עם האצבע על האות ${which === 'upper' ? l.upper : l.lower}`, en: 'Trace the letter.' },
    explainHe: 'כותבים מלמעלה למטה, לאט ובזהירות.',
  };
}

// ---------------------------------------------------------------- numbers

const N = (n: number): Visual => ({ t: 'number', n });

function numberDistractors(n: number, count: number, rnd: Rnd): number[] {
  const partner = CONFUSABLE_PAIRS.find(([a, b]) => a === n || b === n);
  const near = partner ? [partner[0] === n ? partner[1] : partner[0]] : [];
  const rest = distractors(NUMBERS.map((x) => x.n), n, count, rnd, (x) => near.includes(x));
  return [...near, ...rest].slice(0, count);
}

export function qHearNumber(n: number, rnd: Rnd = Math.random, style: 'plain' | 'touch' | 'find' = 'plain', optionCount = 4): ChoiceQ {
  const audio = style === 'touch' ? clipId.touchNumber(n) : style === 'find' ? clipId.findNumber(n) : clipId.number(n);
  const en = style === 'touch' ? `Touch number ${numberWord(n)}.` : style === 'find' ? `Find number ${numberWord(n)}.` : `${numberWord(n)}`;
  return {
    kind: 'choice', id: qid('hn'), area: 'listening', skill: skillKey('number', n), listening: true,
    prompt: { audio: [audio], he: 'הקשיבי ובחרי את המספר', en, helpHe: 'שומעים מספר באנגלית. בחרי את הספרות של המספר ששמעת. שימי לב: מספרים עם teen בסוף הם 13–19.' },
    ...choice(N(n), numberDistractors(n, optionCount - 1, rnd).map(N), rnd),
    explainHe: `${numberWord(n)} = ${n}`, afterAudio: clipId.number(n), bigOptions: true,
  };
}

/** 13 vs 3, 14 vs 4 … two big buttons. */
export function qNumberContrast(pair: [number, number], rnd: Rnd = Math.random): ChoiceQ {
  const n = pickOne(pair, rnd);
  const other = pair[0] === n ? pair[1] : pair[0];
  const teen = Math.max(...pair);
  return {
    kind: 'choice', id: qid('nc'), area: 'listening', skill: skillKey('number', n), listening: true,
    prompt: { audio: [clipId.number(n)], he: 'איזה מספר שמעת?', en: numberWord(n), helpHe: 'האזיני לסוף המילה: ב־teen יש צליל ארוך "טִין" בסוף.' },
    ...choice(N(n), [N(other)], rnd),
    explainHe: teen > 12 ? `${numberWord(teen)} (${teen}) נגמר ב־teen – "טִין" ארוך. ${numberWord(Math.min(...pair))} (${Math.min(...pair)}) קצר יותר.` : `${numberWord(n)} = ${n}`,
    afterAudio: clipId.number(other), bigOptions: true,
  };
}

export function qCount(n: number, rnd: Rnd = Math.random): ChoiceQ {
  const thing = pickOne(['star', 'apple', 'ball', 'fish', 'flower'], rnd);
  const others = shuffle([n - 2, n - 1, n + 1, n + 2].filter((x) => x >= 1 && x <= 20), rnd).slice(0, 2);
  return {
    kind: 'choice', id: qid('cn'), area: 'numbers', skill: skillKey('count', n),
    prompt: { audio: [clipId.prompt('countHowMany')], he: 'ספרי – כמה יש?', en: 'Count. How many?' },
    show: { t: 'count', n, thing },
    ...choice(N(n), others.map(N), rnd), explainHe: `יש ${n} – ${numberWord(n)}.`, afterAudio: clipId.number(n), bigOptions: true,
  };
}

export function qNumberWord(n: number, rnd: Rnd = Math.random): ChoiceQ {
  const others = numberDistractors(n, 2, rnd).map((o) => ({ t: 'word', text: numberWord(o) }) as Visual);
  return {
    kind: 'choice', id: qid('nw'), area: 'numbers', skill: skillKey('numberRead', n),
    prompt: { audio: [], he: 'איזו מילה מתאימה למספר?' },
    show: N(n), showAudio: clipId.number(n),
    ...choice({ t: 'word', text: numberWord(n) }, others, rnd), explainHe: `${n} = ${numberWord(n)}`, afterAudio: clipId.number(n),
  };
}

/** Auditory memory: speaker cards to match with digits. */
export function qNumberMemory(ns: number[]): PairsQ {
  return {
    kind: 'pairs', id: qid('nm'), area: 'listening', listening: true,
    prompt: { audio: [], he: 'לחצי על רמקול, הקשיבי, וחברי אותו למספר הנכון', helpHe: 'כל רמקול אומר מספר אחר. אפשר להקשיב כמה פעמים שרוצים.' },
    pairs: ns.slice(0, 4).map((n) => ({ left: { t: 'audio', clip: clipId.number(n) }, right: N(n), skill: skillKey('number', n), leftAudio: clipId.number(n) })),
    explainHe: 'כל הכבוד על ההקשבה!',
  };
}

// ---------------------------------------------------------------- colours

export function qHearColor(id: ColorId, rnd: Rnd = Math.random, style: 'plain' | 'choose' = 'plain', asThings = false): ChoiceQ {
  const c = color(id);
  const others = distractors(COLORS.map((x) => x.id), id, 3, rnd);
  const vis = (x: ColorId): Visual => (asThings ? { t: 'thing', id: x } : { t: 'color', id: x });
  return {
    kind: 'choice', id: qid('hc'), area: 'listening', skill: skillKey('color', id), listening: true,
    prompt: { audio: [style === 'choose' ? clipId.chooseColor(id) : clipId.color(id)], he: 'הקשיבי ובחרי את הצבע', en: style === 'choose' ? `Choose the ${id} color.` : id, helpHe: 'שומעים שם של צבע באנגלית. לחצי על הצבע ששמעת.' },
    ...choice(vis(id), others.map(vis), rnd), explainHe: `${id} = ${c.he}`, afterAudio: clipId.color(id),
  };
}

export function qColorWord(id: ColorId, rnd: Rnd = Math.random): ChoiceQ {
  const others = distractors(COLORS.map((x) => x.id), id, 2, rnd).map((o) => ({ t: 'word', text: o }) as Visual);
  return {
    kind: 'choice', id: qid('cw'), area: 'colors', skill: skillKey('colorRead', id),
    prompt: { audio: [], he: 'איזו מילה היא שם הצבע?' },
    show: { t: 'color', id }, showAudio: clipId.color(id),
    ...choice({ t: 'word', text: id }, others, rnd), explainHe: `${id} = ${color(id).he}`, afterAudio: clipId.color(id),
  };
}

export function qPaint(targets: { thing: WordId; color: ColorId }[], rnd: Rnd = Math.random): PaintQ {
  const used = targets.map((t) => t.color);
  const palette = shuffle([...used, ...distractors(COLORS.map((x) => x.id), used[0], 6 - used.length, rnd, (x) => used.includes(x))], rnd);
  const audio = targets.map((t, i) => (i === 0 ? clipId.colorThing(t.thing, t.color) : clipId.thenColorThing(t.thing, t.color)));
  const en = targets.map((t, i) => `${i === 0 ? 'Color' : 'Now color'} the ${t.thing} ${t.color}.`).join(' ');
  return {
    kind: 'paint', id: qid('pt'), area: 'listening', listening: true,
    prompt: { audio, he: targets.length > 1 ? 'הקשיבי – יש שתי הוראות! צבעי לפי ההוראות' : 'הקשיבי וצבעי לפי ההוראה', en, helpHe: targets.length > 1 ? 'יש שני חלקים להוראה: קודם חפץ אחד בצבע אחד, ואז (Now) חפץ שני בצבע אחר. בחרי צבע ואז לחצי על החפץ.' : 'ההוראה אומרת איזה חפץ לצבוע ובאיזה צבע. בחרי צבע ואז לחצי על החפץ.' },
    targets: targets.map((t) => ({ ...t, skill: targets.length > 1 ? skillKey('listen2', `${t.thing}-${t.color}`) : skillKey('color', t.color) })),
    palette,
    explainHe: targets.map((t) => `${t.thing} (${word(t.thing).he}) – ${t.color} (${color(t.color).he})`).join(' · '),
  };
}

// ---------------------------------------------------------------- words

const W = (w: WordId): Visual => ({ t: 'word', text: w });
const PIC = (w: WordId): Visual => ({ t: 'picture', id: word(w).picture });
// Pictures that could be mixed up are kept apart only when they're the answer's twin in sound (bag/ball/banana start alike: that's the point of reading).

export function qWordToPicture(w: WordId, rnd: Rnd = Math.random): ChoiceQ {
  const others = distractors(WORDS.map((x) => x.id), w, 2, rnd).map(PIC);
  return {
    kind: 'choice', id: qid('wp'), area: 'reading', skill: skillKey('word', w),
    prompt: { audio: [], he: 'קראי את המילה ובחרי את התמונה המתאימה' },
    show: W(w),
    ...choice(PIC(w), others, rnd), explainHe: `${w} = ${word(w).he}`, afterAudio: clipId.word(w),
  };
}

export function qPictureToWord(w: WordId, rnd: Rnd = Math.random): ChoiceQ {
  // Similar-looking words make real reading necessary (bag / ball / banana, cat / hat).
  const similar: Record<WordId, WordId[]> = { bag: ['ball', 'banana'], ball: ['bag', 'banana'], banana: ['bag', 'ball'], cat: ['hat', 'tap'], hat: ['cat', 'tap'], tap: ['cat', 'hat'], dog: ['bag', 'hat'] };
  const pool = similar[w];
  const others = shuffle(pool, rnd).slice(0, 2).map(W);
  return {
    kind: 'choice', id: qid('pw'), area: 'reading', skill: skillKey('word', w),
    prompt: { audio: [], he: 'מה כתוב? בחרי את המילה שמתאימה לתמונה' },
    show: PIC(w),
    ...choice(W(w), others, rnd), explainHe: `${w} = ${word(w).he}`, afterAudio: clipId.word(w),
  };
}

export function qHearWord(w: WordId, rnd: Rnd = Math.random): ChoiceQ {
  const others = distractors(WORDS.map((x) => x.id), w, 2, rnd).map(PIC);
  return {
    kind: 'choice', id: qid('hw'), area: 'listening', skill: skillKey('wordListen', w), listening: true,
    prompt: { audio: [clipId.word(w)], he: 'הקשיבי ובחרי את התמונה', en: w, helpHe: 'שומעים מילה באנגלית. לחצי על התמונה שלה.' },
    ...choice(PIC(w), others, rnd), explainHe: `${w} = ${word(w).he}`, afterAudio: clipId.word(w),
  };
}

export function qHearWhichWord(w: WordId, rnd: Rnd = Math.random): ChoiceQ {
  const q = qPictureToWord(w, rnd);
  return {
    ...q, id: qid('ww'), listening: true, show: undefined,
    prompt: { audio: [clipId.word(w)], he: 'הקשיבי – איזו מילה שמעת?', en: w, helpHe: 'קראי את שלוש המילים, והקשיבי למילה. איזו מהן שמעת?' },
  };
}

export function qWordGap(w: WordId, rnd: Rnd = Math.random): ChoiceQ {
  const letters = [...w];
  const allowed = letters.map((ch, i) => ({ ch, i })).filter(({ ch }) => LETTERS.some((l) => l.id === ch));
  const { ch, i } = pickOne(allowed, rnd);
  const others = distractors(LETTERS.map((x) => x.id), ch as LetterId, 2, rnd, (x) => letters.includes(x)).map((o) => L(o));
  return {
    kind: 'choice', id: qid('wg'), area: 'reading', skill: skillKey('wordSpell', w),
    prompt: { audio: [clipId.word(w)], he: 'איזו אות חסרה במילה?', en: 'Which letter is missing?' },
    show: { t: 'gap', word: w, gap: i }, showAudio: clipId.word(w),
    ...choice(L(ch), others, rnd), explainHe: `${w} – ${letters.join(' ')}`, afterAudio: clipId.word(w), bigOptions: true,
  };
}

// ---------------------------------------------------------------- builders used by games, sessions and the exam

export type GameId =
  | 'letterName' | 'letterSound' | 'letterPairs' | 'letterLook' | 'missingLetter' | 'firstLetter' | 'trace'
  | 'hearNumber' | 'count' | 'numberWord' | 'numberMemory' | 'teens'
  | 'hearColor' | 'paint' | 'colorWord' | 'findColor'
  | 'wordPicture' | 'pictureWord' | 'hearWord' | 'wordFirst' | 'wordGap' | 'whichWord';

const weightOf = (save: Save, kind: SkillKind) => (item: string | number) => practiceWeight(save.skills[skillKey(kind, item)]);

export function buildGame(game: GameId, save: Save, count: number, opts: { letters?: LetterId[]; rnd?: Rnd } = {}): Question[] {
  const rnd = opts.rnd ?? Math.random;
  const letters = opts.letters ?? LETTERS.map((l) => l.id);
  const pickLetters = (kind: SkillKind, n: number) => cycle(weightedPick(letters, weightOf(save, kind), Math.min(n, letters.length), rnd), n, rnd);
  const nums = NUMBERS.map((x) => x.n);
  const cols = COLORS.map((x) => x.id);
  const words = WORDS.map((x) => x.id);
  switch (game) {
    case 'letterName': return pickLetters('letterName', count).map((id) => qLetterName(id, rnd, letters));
    case 'letterSound': return pickLetters('letterSound', count).map((id) => qLetterSound(id, rnd, letters));
    case 'letterLook': return pickLetters('letterName', count).map((id) => qLetterLookAlike(id, rnd));
    case 'letterPairs': return Array.from({ length: count }, () => qLetterPairs(weightedPick(letters, weightOf(save, 'letterCase'), 4, rnd), rnd));
    case 'missingLetter': return Array.from({ length: count }, () => qMissingLetter(rnd, letters));
    case 'firstLetter': {
      const pool = FIRST_LETTER_WORDS.filter((x) => letters.includes(x.first));
      return cycle(weightedPick(pool, (x) => practiceWeight(save.skills[skillKey('letterSound', x.first)]), Math.min(count, pool.length), rnd), count, rnd).map((x) => qFirstLetter(x.w, rnd));
    }
    case 'trace': return pickLetters('letterWrite', count).map((id, i) => qTrace(id, i % 2 === 0 ? 'upper' : 'lower'));
    case 'hearNumber': return cycle(weightedPick(nums, weightOf(save, 'number'), count, rnd), count, rnd).map((n, i) => qHearNumber(n, rnd, (['plain', 'touch', 'find'] as const)[i % 3]));
    case 'teens': return Array.from({ length: count }, (_, i) => qNumberContrast(CONFUSABLE_PAIRS[i % 2 === 0 ? (i % 4 === 0 ? 0 : 1) : Math.floor(rnd() * CONFUSABLE_PAIRS.length)], rnd));
    case 'count': return cycle(weightedPick(nums, weightOf(save, 'count'), count, rnd), count, rnd).map((n) => qCount(n, rnd));
    case 'numberWord': return cycle(weightedPick(nums, weightOf(save, 'numberRead'), count, rnd), count, rnd).map((n) => qNumberWord(n, rnd));
    case 'numberMemory': return Array.from({ length: count }, () => qNumberMemory(weightedPick(nums, weightOf(save, 'number'), 4, rnd)));
    case 'hearColor': return cycle(weightedPick(cols, weightOf(save, 'color'), count, rnd), count, rnd).map((c, i) => qHearColor(c, rnd, i % 2 ? 'choose' : 'plain'));
    case 'findColor': return cycle(weightedPick(cols, weightOf(save, 'color'), count, rnd), count, rnd).map((c) => qHearColor(c, rnd, 'choose', true));
    case 'colorWord': return cycle(weightedPick(cols, weightOf(save, 'colorRead'), count, rnd), count, rnd).map((c) => qColorWord(c, rnd));
    case 'paint': return cycle(weightedPick(cols, weightOf(save, 'color'), count, rnd), count, rnd).map((c) => qPaint([{ thing: pickOne(COLORABLE, rnd), color: c }], rnd));
    case 'wordPicture': return cycle(weightedPick(words, weightOf(save, 'word'), count, rnd), count, rnd).map((w) => qWordToPicture(w, rnd));
    case 'pictureWord': return cycle(weightedPick(words, weightOf(save, 'word'), count, rnd), count, rnd).map((w) => qPictureToWord(w, rnd));
    case 'hearWord': return cycle(weightedPick(words, weightOf(save, 'wordListen'), count, rnd), count, rnd).map((w) => qHearWord(w, rnd));
    case 'whichWord': return cycle(weightedPick(words, weightOf(save, 'word'), count, rnd), count, rnd).map((w) => qHearWhichWord(w, rnd));
    case 'wordFirst': return cycle(weightedPick(words.filter((w) => w !== 'tap'), weightOf(save, 'wordFirst'), count, rnd), count, rnd).map((w) => qFirstLetter(w, rnd));
    case 'wordGap': return cycle(weightedPick(words, weightOf(save, 'wordSpell'), count, rnd), count, rnd).map((w) => qWordGap(w, rnd));
  }
}

/** Repeat a picked list up to n items, never twice in a row. */
function cycle<T>(items: T[], n: number, rnd: Rnd): T[] {
  if (!items.length) return [];
  const out: T[] = [];
  while (out.length < n) {
    const batch = shuffle(items, rnd);
    if (out.length && batch.length > 1 && batch[0] === out[out.length - 1]) batch.push(batch.shift()!);
    out.push(...batch);
  }
  return out.slice(0, n);
}

/** Two-step listening tasks are unlocked after simple listening tasks go well. */
export function twoStepUnlocked(save: Save): boolean {
  const colorStats = Object.entries(save.skills).filter(([k]) => k.startsWith('color:') || k.startsWith('number:'));
  const firstTryCorrect = colorStats.reduce((s, [, v]) => s + v.c, 0);
  const recent = colorStats.map(([, v]) => v.r.slice(-1));
  return firstTryCorrect >= 8 && recent.filter((x) => x === '1').length >= recent.length * 0.7;
}

export function buildListeningLab(save: Save, count: number, rnd: Rnd = Math.random): Question[] {
  const nums = NUMBERS.map((x) => x.n);
  const cols = COLORS.map((x) => x.id);
  const two = twoStepUnlocked(save);
  const out: Question[] = [];
  const ns = cycle(weightedPick(nums, weightOf(save, 'number'), 20, rnd), count, rnd);
  const cs = cycle(weightedPick(cols, weightOf(save, 'color'), 10, rnd), count, rnd);
  for (let i = 0; i < count; i++) {
    const kind = i % 4;
    if (kind === 0) out.push(qHearNumber(ns[i], rnd, rnd() < 0.5 ? 'touch' : 'find', 8));
    else if (kind === 1) out.push(qHearColor(cs[i], rnd, 'choose'));
    else if (kind === 2) out.push(qPaint([{ thing: pickOne(COLORABLE, rnd), color: cs[i] }], rnd));
    else if (two && i >= 3) {
      const [t1, t2] = shuffle(COLORABLE, rnd);
      const [c1, c2] = shuffle(cols, rnd);
      out.push(qPaint([{ thing: t1, color: c1 }, { thing: t2, color: c2 }], rnd));
    } else out.push(qHearNumber(ns[i], rnd, 'touch', 6));
  }
  return out;
}

// ---------------------------------------------------------------- exam

export const EXAM_PLAN: { area: Area; count: number }[] = [
  { area: 'listening', count: 8 },
  { area: 'letterNames', count: 4 },
  { area: 'letterCase', count: 3 },
  { area: 'phonics', count: 4 },
  { area: 'writing', count: 2 },
  { area: 'reading', count: 5 },
];

export function buildExam(rnd: Rnd = Math.random): Question[] {
  const ids = LETTERS.map((l) => l.id);
  const take = <T,>(a: T[], n: number) => shuffle(a, rnd).slice(0, n);
  const qs: Question[] = [];
  // listening: numbers + colours + colouring instructions
  const ns = take(NUMBERS.map((x) => x.n), 4);
  qs.push(qHearNumber(ns[0], rnd, 'touch', 6), qHearNumber(ns[1], rnd, 'find', 6), qHearNumber(ns[2], rnd, 'plain'), qNumberContrast(pickOne(CONFUSABLE_PAIRS.slice(0, 2), rnd), rnd));
  const cs = take(COLORS.map((x) => x.id), 4);
  qs.push(qHearColor(cs[0], rnd, 'choose'), qHearColor(cs[1], rnd, 'plain'));
  qs.push(qPaint([{ thing: pickOne(COLORABLE, rnd), color: cs[2] }], rnd), qPaint([{ thing: pickOne(COLORABLE, rnd), color: cs[3] }], rnd));
  // letter names (spread over A–P: one from each quarter)
  const quarters = [ids.slice(0, 4), ids.slice(4, 8), ids.slice(8, 12), ids.slice(12, 16)];
  quarters.forEach((q) => qs.push(qLetterName(pickOne(q, rnd), rnd)));
  // upper / lower
  const caseIds = take(ids, 7);
  qs.push(qLetterPairs(caseIds.slice(0, 4), rnd), qUpperToLower(caseIds[4], rnd), qUpperToLower(caseIds[5], rnd));
  // phonics
  const sounds = take(ids, 3);
  sounds.forEach((id) => qs.push(qLetterSound(id, rnd)));
  qs.push(qFirstLetter(pickOne(['cat', 'dog', 'ball', 'hat', 'bag'], rnd), rnd));
  // writing
  const wr = take(ids, 2);
  qs.push(qTrace(wr[0], 'upper'), qTrace(wr[1], 'lower'));
  // reading the seven words
  const ws = take(WORDS.map((x) => x.id), 5);
  qs.push(qWordToPicture(ws[0], rnd), qWordToPicture(ws[1], rnd), qPictureToWord(ws[2], rnd), qPictureToWord(ws[3], rnd), qWordToPicture(ws[4], rnd));
  // Random order but keep the listening part first, like the real test.
  const listening = qs.filter((q) => q.area === 'listening');
  const rest = shuffle(qs.filter((q) => q.area !== 'listening'), rnd);
  return [...shuffle(listening, rnd), ...rest];
}

/** Skill keys a question gives evidence for. */
export function questionSkills(q: Question): string[] {
  switch (q.kind) {
    case 'choice': return [q.skill];
    case 'trace': return [q.skill];
    case 'pairs': return q.pairs.map((p) => p.skill);
    case 'paint': return q.targets.map((t) => t.skill);
  }
}
