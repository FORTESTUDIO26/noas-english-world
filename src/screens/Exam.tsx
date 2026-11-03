import { useCallback, useMemo, useRef, useState } from 'react';
import { buildExam, AREA_HE, type Area, type Question } from '../learn/questions.ts';
import { letter } from '../content/letters.ts';
import { useStore } from '../state/store.tsx';
import { useNav } from '../state/nav.tsx';
import { Screen } from '../ui/Screen.tsx';
import { QuestionView, type SkillResult } from '../ui/QuestionView.tsx';
import { VisualView } from '../ui/VisualView.tsx';
import { Speaker } from '../ui/Speaker.tsx';
import { GameRunner } from './GameRunner.tsx';
import { Guide } from '../art/Guide.tsx';

interface QResult { q: Question; correct: boolean; results: SkillResult[] }
export interface ExamOutcome { score: number; results: SkillResult[] }

export function ExamScreen() {
  const nav = useNav();
  return (
    <Screen title="מבחן לדוגמה" tone="blue" noSlow>
      <ExamFlow onExit={() => nav.back()} />
    </Screen>
  );
}

export function ExamFlow({ onExit, onComplete }: { onExit: () => void; onComplete?: (o: ExamOutcome) => void }) {
  const { answer, addExam } = useStore();
  const [round, setRound] = useState(0);
  const questions = useMemo(() => buildExam(), [round]);
  const [phase, setPhase] = useState<'intro' | 'run' | 'done' | 'retry'>('intro');
  const [i, setI] = useState(0);
  const res = useRef<QResult[]>([]);
  const [final, setFinal] = useState<QResult[]>([]);
  const [retryQs, setRetryQs] = useState<Question[]>([]);

  const onAnswered = useCallback((r: SkillResult[]) => {
    r.forEach((x) => answer(x.skill, x.correct));
    res.current[i] = { q: questions[i], correct: r.every((x) => x.correct), results: r };
  }, [answer, i, questions]);

  const next = useCallback(() => {
    if (i + 1 < questions.length) { setI(i + 1); return; }
    const list = questions.map((q, k) => res.current[k] ?? { q, correct: false, results: [] });
    const byDomain: Record<string, { c: number; t: number }> = {};
    list.forEach((r) => {
      const d = (byDomain[r.q.area] ??= { c: 0, t: 0 });
      d.t++;
      if (r.correct) d.c++;
    });
    const correct = list.filter((r) => r.correct).length;
    const score = Math.round((correct / list.length) * 100);
    addExam({ at: Date.now(), score, correct, total: list.length, byDomain });
    setFinal(list);
    setPhase('done');
  }, [i, questions, addExam]);

  if (phase === 'intro') {
    return (
      <div className="intro">
        <Guide size={120} mood="think" />
        <h2>מבחן לדוגמה</h2>
        <p>{questions.length} שאלות, כמו במבחן בכיתה: הבנת הנשמע, שמות אותיות, אות גדולה וקטנה, צלילים, כתיבה וקריאת מילים.</p>
        <p className="hint">במבחן אין רמזים ואין תרגום. בכל שאלה אפשר להקשיב שוב להוראה כמה שרוצים. בסוף תראי מה היה נכון.</p>
        <button type="button" className="btn btn--primary btn--wide" onClick={() => setPhase('run')}>מתחילות</button>
      </div>
    );
  }

  if (phase === 'retry') {
    return <GameRunner questions={retryQs} title="תיקון טעויות" mode="practice" onExit={() => setPhase('done')} onFinish={() => setPhase('done')} finishLabel="חזרה לתוצאות" />;
  }

  if (phase === 'done') {
    const correct = final.filter((r) => r.correct).length;
    const score = Math.round((correct / final.length) * 100);
    const areas = [...new Set(final.map((r) => r.q.area))] as Area[];
    const mistakes = final.filter((r) => !r.correct);
    return (
      <div className="exam-result">
        <Guide size={110} mood={score >= 80 ? 'cheer' : 'happy'} />
        <h2>הציון שלך: <span className="exam-result__score" dir="ltr">{score}</span></h2>
        <p>{correct} מתוך {final.length} שאלות נכונות</p>
        <table className="area-table">
          <tbody>
            {areas.map((a) => {
              const rs = final.filter((r) => r.q.area === a);
              const c = rs.filter((r) => r.correct).length;
              return (
                <tr key={a}>
                  <th>{AREA_HE[a]}</th>
                  <td><span className="meter"><span style={{ width: `${(c / rs.length) * 100}%` }} /></span></td>
                  <td dir="ltr">{c}/{rs.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {mistakes.length > 0 && (
          <section className="mistakes">
            <h3>מה כדאי לתקן</h3>
            <ul>
              {mistakes.map((m, k) => (
                <li key={k} className="mistake">
                  <span className="mistake__area">{AREA_HE[m.q.area]}</span>
                  <span className="mistake__q">{m.q.prompt.he}</span>
                  {m.q.prompt.en && <span className="mistake__en" dir="ltr" lang="en">{m.q.prompt.en}</span>}
                  <span className="mistake__answer">התשובה הנכונה: <CorrectAnswer q={m.q} /></span>
                  {m.q.kind !== 'paint' && <span className="mistake__why">{m.q.explainHe}</span>}
                  {m.q.prompt.audio.length > 0 && <Speaker clips={m.q.prompt.audio} size="s" label="להקשיב שוב" />}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="row-center wrap">
          {mistakes.length > 0 && (
            <button type="button" className="btn btn--primary" onClick={() => {
              setRetryQs(mistakes.map((m) => ({ ...m.q, id: `${m.q.id}-r${Date.now()}` }) as Question));
              setPhase('retry');
            }}>לתרגל רק את הטעויות</button>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => { res.current = []; setI(0); setRound(round + 1); setPhase('intro'); }}>מבחן חדש</button>
          {onComplete ? (
            <button type="button" className="btn btn--ghost" onClick={() => onComplete({ score, results: final.flatMap((r) => r.results) })}>סיום המפגש</button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={onExit}>יציאה</button>
          )}
        </div>
      </div>
    );
  }

  const q = questions[i];
  return (
    <div className="runner runner--exam">
      <div className="runner__top">
        <span className="runner__title">מבחן · {AREA_HE[q.area]}</span>
        <div className="progress"><span style={{ width: `${(i / questions.length) * 100}%` }} /></div>
        <span className="runner__count" dir="ltr">{i + 1}/{questions.length}</span>
      </div>
      <QuestionView key={q.id} q={q} mode="exam" onAnswered={onAnswered} onNext={next} />
    </div>
  );
}

function CorrectAnswer({ q }: { q: Question }) {
  switch (q.kind) {
    case 'choice': return <span className="mini-vis"><VisualView v={q.options[q.answer]} size="s" /></span>;
    case 'trace': {
      const l = letter(q.letter);
      return <b dir="ltr" lang="en">{q.case === 'upper' ? l.upper : l.lower}</b>;
    }
    case 'pairs': return <b dir="ltr" lang="en">{q.pairs.map((p) => `${'text' in p.left ? p.left.text : ''}–${'text' in p.right ? p.right.text : ''}`).join('  ')}</b>;
    case 'paint': return <b>{q.explainHe}</b>;
  }
}
