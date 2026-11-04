// The closed list of letters for the test: A–P only (school guidelines).
// Each letter has its name, its basic phonics sound and one picture word.

export type LetterId =
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
  | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p';

export interface Letter {
  id: LetterId;
  upper: string;
  lower: string;
  /** IPA of the basic initial sound taught in early phonics. */
  ipa: string;
  /** Hebrew hint for parents/learning mode (how the sound feels). */
  soundHe: string;
  /** Picture word that starts with the sound (audio + picture only, not reading vocabulary). */
  example: string;
  exampleHe: string;
  /** Picture id in src/art/pictures.tsx */
  picture: string;
  /** How the sound clip is cut from a recorded carrier word (scripts/make-phonemes.ts). */
  carrier: { word: string; part: 'onset' | 'vowel' | 'coda' };
}

export const LETTERS: Letter[] = [
  { id: 'a', upper: 'A', lower: 'a', ipa: 'æ', soundHe: 'אֶ פתוחה, כמו בתחילת apple', example: 'apple', exampleHe: 'תפוח', picture: 'apple', carrier: { word: 'at', part: 'vowel' } },
  { id: 'b', upper: 'B', lower: 'b', ipa: 'b', soundHe: 'ב׳ קצרה, בלי "אה" אחריה', example: 'ball', exampleHe: 'כדור', picture: 'ball', carrier: { word: 'bat', part: 'onset' } },
  { id: 'c', upper: 'C', lower: 'c', ipa: 'k', soundHe: 'ק׳ קצרה, כמו בתחילת cat', example: 'cat', exampleHe: 'חתול', picture: 'cat', carrier: { word: 'cap', part: 'onset' } },
  { id: 'd', upper: 'D', lower: 'd', ipa: 'd', soundHe: 'ד׳ קצרה', example: 'dog', exampleHe: 'כלב', picture: 'dog', carrier: { word: 'dad', part: 'onset' } },
  { id: 'e', upper: 'E', lower: 'e', ipa: 'ɛ', soundHe: 'אֶ קצרה, כמו בתחילת egg', example: 'egg', exampleHe: 'ביצה', picture: 'egg', carrier: { word: 'etch', part: 'vowel' } },
  { id: 'f', upper: 'F', lower: 'f', ipa: 'f', soundHe: 'פ׳ רכה (פְפְפְ), נשיפה', example: 'fish', exampleHe: 'דג', picture: 'fish', carrier: { word: 'off', part: 'coda' } },
  { id: 'g', upper: 'G', lower: 'g', ipa: 'g', soundHe: 'ג׳ קצרה, כמו בתחילת go', example: 'goat', exampleHe: 'עז', picture: 'goat', carrier: { word: 'gap', part: 'onset' } },
  { id: 'h', upper: 'H', lower: 'h', ipa: 'h', soundHe: 'ה׳ – נשיפה קלה', example: 'hat', exampleHe: 'כובע', picture: 'hat', carrier: { word: 'hat', part: 'onset' } },
  { id: 'i', upper: 'I', lower: 'i', ipa: 'ɪ', soundHe: 'אִ קצרה, כמו בתחילת ink', example: 'ink', exampleHe: 'דיו', picture: 'ink', carrier: { word: 'it', part: 'vowel' } },
  { id: 'j', upper: 'J', lower: 'j', ipa: 'dʒ', soundHe: "ג׳ כמו בג׳ירפה", example: 'jam', exampleHe: 'ריבה', picture: 'jam', carrier: { word: 'jet', part: 'onset' } },
  { id: 'k', upper: 'K', lower: 'k', ipa: 'k', soundHe: 'ק׳ קצרה', example: 'kite', exampleHe: 'עפיפון', picture: 'kite', carrier: { word: 'cap', part: 'onset' } },
  { id: 'l', upper: 'L', lower: 'l', ipa: 'l', soundHe: 'ל׳ ארוכה (לְלְלְ)', example: 'lemon', exampleHe: 'לימון', picture: 'lemon', carrier: { word: 'lap', part: 'onset' } },
  { id: 'm', upper: 'M', lower: 'm', ipa: 'm', soundHe: 'מ׳ ארוכה (מְמְמְ), שפתיים סגורות', example: 'moon', exampleHe: 'ירח', picture: 'moon', carrier: { word: 'am', part: 'coda' } },
  { id: 'n', upper: 'N', lower: 'n', ipa: 'n', soundHe: 'נ׳ ארוכה (נְנְנְ)', example: 'nest', exampleHe: 'קן', picture: 'nest', carrier: { word: 'an', part: 'coda' } },
  { id: 'o', upper: 'O', lower: 'o', ipa: 'ɑ', soundHe: 'אָ פתוחה, כמו בתחילת octopus', example: 'octopus', exampleHe: 'תמנון', picture: 'octopus', carrier: { word: 'ox', part: 'vowel' } },
  { id: 'p', upper: 'P', lower: 'p', ipa: 'p', soundHe: 'פ׳ קצרה, נשיפה קטנה', example: 'pig', exampleHe: 'חזיר', picture: 'pig', carrier: { word: 'pat', part: 'onset' } },
];

export const LETTER_IDS = LETTERS.map((l) => l.id);

export function letter(id: LetterId): Letter {
  const l = LETTERS.find((x) => x.id === id);
  if (!l) throw new Error(`Unknown letter ${id}`);
  return l;
}
