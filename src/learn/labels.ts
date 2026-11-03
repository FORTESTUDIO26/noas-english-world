import { letter, type LetterId } from '../content/letters.ts';
import { color, type ColorId } from '../content/colors.ts';
import { word, type WordId } from '../content/words.ts';
import type { SkillKind } from './progress.ts';

/** Hebrew description of a skill key, for summaries and the parents' area. */
export function skillLabel(key: string): string {
  const [kind, item] = key.split(':') as [SkillKind, string];
  const L = () => letter(item as LetterId).upper;
  switch (kind) {
    case 'letterName': return `שם האות ${L()}`;
    case 'letterSound': return `הצליל של ${L()}`;
    case 'letterCase': return `${L()} גדולה ו־${letter(item as LetterId).lower} קטנה`;
    case 'letterWrite': return `כתיבת ${L()}`;
    case 'letterSeq': return `סדר האותיות (${L()})`;
    case 'number': return `המספר ${item} בשמיעה`;
    case 'count': return `ספירה עד ${item}`;
    case 'numberRead': return `המילה של ${item}`;
    case 'color': return `${item} (${color(item as ColorId).he}) בשמיעה`;
    case 'colorRead': return `קריאת ${item}`;
    case 'word': return `קריאת ${item} (${word(item as WordId).he})`;
    case 'wordListen': return `${item} בשמיעה`;
    case 'wordFirst': return `האות הפותחת של ${item}`;
    case 'wordSpell': return `האותיות של ${item}`;
    case 'listen2': {
      const [w, c] = item.split('-');
      return `הוראה כפולה: ${w} ${c}`;
    }
  }
  return key;
}

/** Short practice recommendation from a list of weak skill keys. */
export function recommend(weak: string[]): string {
  if (!weak.length) return 'הכול נראה טוב! במפגש הבא נמשיך הלאה, ונחזור בקצרה על מה שכבר למדנו.';
  const kinds = new Set(weak.map((k) => k.split(':')[0]));
  const parts: string[] = [];
  if (kinds.has('letterSound') || kinds.has('wordFirst')) parts.push('לשמוע שוב את הצלילים של האותיות (כפתור "הצליל של האות")');
  if (kinds.has('letterName') || kinds.has('letterSeq')) parts.push('לחזור על שמות האותיות במשחק "שומעים ובוחרים"');
  if (kinds.has('letterCase')) parts.push('לתרגל התאמה של אות גדולה לקטנה');
  if (kinds.has('letterWrite')) parts.push('לכתוב שוב את האותיות בעזרת האצבע');
  if (kinds.has('number') || kinds.has('count') || kinds.has('numberRead')) parts.push('להקשיב למספרים, במיוחד 13 מול 3 ו־14 מול 4');
  if (kinds.has('color') || kinds.has('colorRead') || kinds.has('listen2')) parts.push('לתרגל צבעים במעבדת ההקשבה');
  if (kinds.has('word') || kinds.has('wordListen') || kinds.has('wordSpell')) parts.push('לקרוא שוב את שבע המילים ולהתאים לתמונות');
  return `מומלץ ${parts.join(', ')}.`;
}
