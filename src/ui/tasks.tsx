// Interactive task bodies: pairs matching and colouring by instruction.
import { useMemo, useState } from 'react';
import type { PairsQ, PaintQ } from '../learn/questions.ts';
import { shuffle } from '../learn/progress.ts';
import { COLORABLE, type WordId } from '../content/words.ts';
import { color, type ColorId } from '../content/colors.ts';
import { Picture } from '../art/pictures.tsx';
import { VisualView } from './VisualView.tsx';
import { audio } from '../audio/player.ts';

export interface SkillResult { skill: string; correct: boolean }
export type Mode = 'practice' | 'lab-learn' | 'lab-test' | 'exam';

// ------------------------------------------------------------------ pairs

export function PairsBoard({ q, mode, onFirst, onDone }: {
  q: PairsQ;
  mode: Mode;
  onFirst: (r: SkillResult[]) => void;
  onDone: (allFirstTry: boolean) => void;
}) {
  const right = useMemo(() => shuffle(q.pairs.map((_, i) => i)), [q.id]);
  const [sel, setSel] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<number | null>(null);
  const [lastWrong, setLastWrong] = useState<{ l: number; r: number } | null>(null);
  const exam = mode === 'exam';
  // exam: each left item gets exactly one attempt
  const [examPicks, setExamPicks] = useState<Map<number, number>>(new Map());

  const finish = (m: Set<number>, miss: Set<number>) => {
    onFirst(q.pairs.map((p, i) => ({ skill: p.skill, correct: m.has(i) && !miss.has(i) })));
    onDone(miss.size === 0);
  };

  const pickLeft = (i: number) => {
    if (matched.has(i) || examPicks.has(i)) return;
    setSel(i);
    const p = q.pairs[i];
    if (p.left.t === 'audio' && p.leftAudio) void audio.play(p.leftAudio);
  };

  const pickRight = (j: number) => {
    if (sel === null) return;
    if (exam) {
      const picks = new Map(examPicks).set(sel, j);
      setExamPicks(picks);
      setSel(null);
      if (picks.size === q.pairs.length) {
        const ok = new Set([...picks].filter(([l, r]) => l === r).map(([l]) => l));
        const miss = new Set(q.pairs.map((_, i) => i).filter((i) => !ok.has(i)));
        finish(ok, miss);
      }
      return;
    }
    if (j === sel) {
      const m = new Set(matched).add(sel);
      setMatched(m);
      setSel(null);
      setLastWrong(null);
      if (m.size === q.pairs.length) finish(m, missed);
    } else {
      setMissed(new Set(missed).add(sel));
      setShake(j);
      setLastWrong({ l: sel, r: j });
      setTimeout(() => setShake(null), 500);
    }
  };

  const usedRight = new Set(exam ? [...examPicks.values()] : [...matched]);
  return (
    <div className="pairs" dir="ltr">
      <div className="pairs__col">
        {q.pairs.map((p, i) => (
          <button key={i} type="button"
            className={`tile tile--pair ${sel === i ? 'is-selected' : ''} ${matched.has(i) ? 'is-correct' : ''} ${examPicks.has(i) ? 'is-done' : ''}`}
            onClick={() => pickLeft(i)} aria-pressed={sel === i}
            aria-label={p.left.t === 'audio' ? 'רמקול – לחצי להקשבה' : undefined}>
            <VisualView v={p.left} size="m" />
          </button>
        ))}
      </div>
      <div className="pairs__col">
        {right.map((j) => (
          <button key={j} type="button"
            className={`tile tile--pair ${usedRight.has(j) ? (exam ? 'is-done' : 'is-correct') : ''} ${shake === j ? 'is-wrong' : ''}`}
            onClick={() => !usedRight.has(j) && pickRight(j)} disabled={sel === null && !usedRight.has(j)}>
            <VisualView v={q.pairs[j].right} size="m" />
          </button>
        ))}
      </div>
      {!exam && lastWrong && <p className="hint" dir="rtl">לא מתאים – נסי שוב 💜</p>}
      {sel === null && matched.size === 0 && examPicks.size === 0 && <p className="hint" dir="rtl">לחצי קודם על כרטיס בצד שמאל, ואז על הכרטיס המתאים</p>}
    </div>
  );
}

// ------------------------------------------------------------------ painting

const BLANK = '#f3eef8';

export function PaintTask({ q, mode, onFirst, onDone }: {
  q: PaintQ;
  mode: Mode;
  onFirst: (r: SkillResult[]) => void;
  onDone: (correctFirst: boolean) => void;
}) {
  const things = useMemo(() => {
    const targets = q.targets.map((t) => t.thing);
    const extra = shuffle(COLORABLE.filter((w) => !targets.includes(w))).slice(0, q.targets.length > 1 ? 2 : 2);
    return shuffle([...targets, ...extra]);
  }, [q.id]);
  const [brush, setBrush] = useState<ColorId | null>(null);
  const [paint, setPaint] = useState<Partial<Record<WordId, ColorId>>>({});
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'work' | 'wrong' | 'done' | 'revealed'>('work');
  const exam = mode === 'exam';

  const evaluate = () => {
    const per = q.targets.map((t) => ({ skill: t.skill, correct: paint[t.thing] === t.color }));
    const extraPainted = things.some((w) => !q.targets.some((t) => t.thing === w) && paint[w]);
    const allOk = per.every((p) => p.correct) && !extraPainted;
    if (tries === 0) onFirst(per.map((p) => ({ ...p, correct: p.correct && !extraPainted })));
    setTries(tries + 1);
    if (allOk) { setState('done'); onDone(tries === 0); return; }
    if (exam) { setState('done'); onDone(false); return; }
    if (tries + 1 >= 2) {
      const fixed: Partial<Record<WordId, ColorId>> = {};
      q.targets.forEach((t) => (fixed[t.thing] = t.color));
      setPaint(fixed);
      setState('revealed');
      onDone(false);
    } else setState('wrong');
  };

  const locked = state === 'done' || state === 'revealed';
  return (
    <div className="paint">
      <div className="paint__scene">
        {things.map((w) => (
          <button key={w} type="button" className={`paint__thing ${paint[w] ? 'is-painted' : ''}`} disabled={locked}
            onClick={() => {
              if (!brush) return;
              setPaint({ ...paint, [w]: brush });
              if (state === 'wrong') setState('work');
            }}
            aria-label="חפץ לצביעה">
            <Picture id={w} size="100%" paint={paint[w] ? color(paint[w]!).hex : BLANK} />
          </button>
        ))}
      </div>
      <div className="paint__palette" role="radiogroup" aria-label="צבעים">
        {q.palette.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={brush === c} aria-label="צבע"
            className={`paint__color ${brush === c ? 'is-on' : ''} ${c === 'white' ? 'is-white' : ''}`}
            style={{ background: color(c).hex }} disabled={locked} onClick={() => setBrush(c)} />
        ))}
      </div>
      {!locked && (
        <div className="row-center">
          {!brush && <p className="hint">בחרי צבע, ואז לחצי על החפץ</p>}
          {state === 'wrong' && <p className="hint hint--oops">כמעט! הקשיבי שוב ותקני</p>}
          <button type="button" className="btn btn--primary" disabled={!Object.keys(paint).length} onClick={evaluate}>בדיקה</button>
        </div>
      )}
    </div>
  );
}
