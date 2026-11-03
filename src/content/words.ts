// The seven reading words for the test (school guidelines).

export type WordId = 'cat' | 'dog' | 'banana' | 'tap' | 'ball' | 'bag' | 'hat';

export interface WordItem {
  id: WordId;
  he: string;
  /** Picture id in src/art/pictures.tsx */
  picture: string;
  /** Sound-by-sound split, only where it suits a grade-3 beginner. */
  segments?: string[];
  /** Can this object be coloured in the colouring tasks? */
  colorable: boolean;
}

export const WORDS: WordItem[] = [
  { id: 'cat', he: 'חתול', picture: 'cat', segments: ['c', 'a', 't'], colorable: true },
  { id: 'dog', he: 'כלב', picture: 'dog', segments: ['d', 'o', 'g'], colorable: true },
  { id: 'banana', he: 'בננה', picture: 'banana', colorable: false },
  { id: 'tap', he: 'ברז', picture: 'tap', segments: ['t', 'a', 'p'], colorable: false },
  { id: 'ball', he: 'כדור', picture: 'ball', colorable: true },
  { id: 'bag', he: 'תיק', picture: 'bag', segments: ['b', 'a', 'g'], colorable: true },
  { id: 'hat', he: 'כובע', picture: 'hat', segments: ['h', 'a', 't'], colorable: true },
];

export const COLORABLE = WORDS.filter((w) => w.colorable).map((w) => w.id);

export function word(id: WordId): WordItem {
  const w = WORDS.find((x) => x.id === id);
  if (!w) throw new Error(`Unknown word ${id}`);
  return w;
}
