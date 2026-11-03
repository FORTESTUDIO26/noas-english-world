// Numbers 1–20 (school guidelines). Emphasis is on recognising them by ear.

export interface NumberItem {
  n: number;
  word: string;
  he: string;
}

const WORDS = [
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
const HE = [
  'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר',
  'אחת־עשרה', 'שתים־עשרה', 'שלוש־עשרה', 'ארבע־עשרה', 'חמש־עשרה', 'שש־עשרה', 'שבע־עשרה', 'שמונה־עשרה', 'תשע־עשרה', 'עשרים',
];

export const NUMBERS: NumberItem[] = WORDS.map((word, i) => ({ n: i + 1, word, he: HE[i] }));

/** Pairs that sound alike and are drilled on purpose (13 vs 3, 14 vs 4 …). */
export const CONFUSABLE_PAIRS: [number, number][] = [
  [3, 13], [4, 14], [5, 15], [6, 16], [7, 17], [8, 18], [9, 19], [2, 12], [12, 20],
];

export function numberWord(n: number): string {
  const item = NUMBERS[n - 1];
  if (!item) throw new Error(`Number out of range ${n}`);
  return item.word;
}
