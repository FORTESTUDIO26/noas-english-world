import { letter, type LetterId } from '../content/letters.ts';
import { color, type ColorId } from '../content/colors.ts';
import { word, type WordId } from '../content/words.ts';
import type { SkillKind } from './progress.ts';
import { T } from '../text/he.ts';

/** Hebrew description of a skill key, for summaries and the parents' area. */
export function skillLabel(key: string): string {
  const [kind, item] = key.split(':') as [SkillKind, string];
  const L = () => letter(item as LetterId).upper;
  const S = T.skills;
  switch (kind) {
    case 'letterName': return S.letterName(L());
    case 'letterSound': return S.letterSound(L());
    case 'letterCase': return S.letterCase(L(), letter(item as LetterId).lower);
    case 'letterWrite': return S.letterWrite(L());
    case 'letterSeq': return S.letterSeq(L());
    case 'number': return S.number(item);
    case 'count': return S.count(item);
    case 'numberRead': return S.numberRead(item);
    case 'color': return S.color(item, color(item as ColorId).he);
    case 'colorRead': return S.colorRead(item);
    case 'word': return S.word(item, word(item as WordId).he);
    case 'wordListen': return S.wordListen(item);
    case 'wordFirst': return S.wordFirst(item);
    case 'wordSpell': return S.wordSpell(item);
    case 'listen2': {
      const [w, c] = item.split('-');
      return S.listen2(w, c);
    }
  }
  return key;
}

/** Short practice recommendation from a list of weak skill keys. */
export function recommend(weak: string[]): string {
  const R = T.recommend;
  if (!weak.length) return R.allGood;
  const kinds = new Set(weak.map((k) => k.split(':')[0]));
  const parts: string[] = [];
  if (kinds.has('letterSound') || kinds.has('wordFirst')) parts.push(R.sounds);
  if (kinds.has('letterName') || kinds.has('letterSeq')) parts.push(R.names);
  if (kinds.has('letterCase')) parts.push(R.cases);
  if (kinds.has('letterWrite')) parts.push(R.write);
  if (kinds.has('number') || kinds.has('count') || kinds.has('numberRead')) parts.push(R.numbers);
  if (kinds.has('color') || kinds.has('colorRead') || kinds.has('listen2')) parts.push(R.colors);
  if (kinds.has('word') || kinds.has('wordListen') || kinds.has('wordSpell')) parts.push(R.words);
  return R.joined(parts);
}
