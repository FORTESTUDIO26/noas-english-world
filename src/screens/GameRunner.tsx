import { useCallback, useMemo, useRef, useState } from 'react';
import { T } from '../text/he.ts';
import type { Question } from '../learn/questions.ts';
import { QuestionView, type Mode, type SkillResult } from '../ui/QuestionView.tsx';
import { useStore } from '../state/store.tsx';
import { skillLabel, recommend } from '../learn/labels.ts';
import { Guide } from '../art/Guide.tsx';
import { IconStar } from '../ui/icons.tsx';

export interface RunResult {
  correct: number;
  total: number;
  /** skill keys answered wrong on the first try in this run */
  wrong: string[];
  results: SkillResult[];
}

/** Plays a list of questions, saves first-try evidence, then shows a short summary. */
export function GameRunner({ questions, mode = 'practice', title, onFinish, onExit, summary = true, finishLabel = T.common.finish }: {
  questions: Question[];
  mode?: Mode;
  title: string;
  onFinish?: (r: RunResult) => void;
  onExit: () => void;
  summary?: boolean;
  finishLabel?: string;
}) {
  const { answer } = useStore();
  const [i, setI] = useState(0);
  const results = useRef<SkillResult[]>([]);
  const [ended, setEnded] = useState<RunResult | null>(null);

  const onAnswered = useCallback((r: SkillResult[]) => {
    r.forEach((x) => answer(x.skill, x.correct));
    results.current.push(...r);
  }, [answer]);

  const next = useCallback(() => {
    if (i + 1 < questions.length) { setI(i + 1); return; }
    const rs = results.current;
    const res: RunResult = {
      correct: rs.filter((r) => r.correct).length,
      total: rs.length,
      wrong: [...new Set(rs.filter((r) => !r.correct).map((r) => r.skill))],
      results: rs,
    };
    if (summary) setEnded(res);
    else onFinish?.(res);
  }, [i, questions.length, summary, onFinish]);

  if (!questions.length) return <p className="empty">{T.common.noQuestions}</p>;
  if (ended) return <RunSummary title={title} r={ended} onDone={() => (onFinish ? onFinish(ended) : onExit())} doneLabel={finishLabel} />;
  const q = questions[i];
  return (
    <div className="runner">
      <div className="runner__top">
        <span className="runner__title">{title}</span>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={i}>
          <span style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <span className="runner__count" dir="ltr">{i + 1}/{questions.length}</span>
      </div>
      <QuestionView key={q.id} q={q} mode={mode} onAnswered={onAnswered} onNext={next} nextLabel={i + 1 < questions.length ? T.common.next : T.common.finish} />
    </div>
  );
}

export function RunSummary({ title, r, onDone, doneLabel = T.common.finish, extra }: { title: string; r: RunResult; onDone: () => void; doneLabel?: string; extra?: React.ReactNode }) {
  const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
  const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
  const weak = useMemo(() => r.wrong.slice(0, 12), [r.wrong]);
  return (
    <div className="summary">
      <Guide size={110} mood={stars >= 2 ? 'cheer' : 'happy'} />
      <h2>{T.summary.title(title)}</h2>
      <div className="stars" aria-label={T.summary.stars(stars)}>
        {[0, 1, 2].map((s) => <span key={s} className={s < stars ? 'is-on' : ''}><IconStar size={40} filled={s < stars} /></span>)}
      </div>
      <p className="summary__score"><b dir="ltr">{r.correct}/{r.total}</b> {T.summary.score}</p>
      {weak.length > 0 ? (
        <div className="summary__weak">
          <h3>{T.summary.review}</h3>
          <ul>{weak.map((k) => <li key={k}>{skillLabel(k)}</li>)}</ul>
        </div>
      ) : (
        <p className="summary__great">{T.summary.perfect}</p>
      )}
      <p className="summary__rec">{recommend(weak)}</p>
      {extra}
      <button type="button" className="btn btn--primary btn--wide" onClick={onDone}>{doneLabel}</button>
    </div>
  );
}
