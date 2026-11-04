import { useMemo, useRef, useState } from 'react';
import { T } from '../text/he.ts';
import { SESSIONS, buildStep, sessionById, sessionKnown, type Step } from '../learn/path.ts';
import { letter, type LetterId } from '../content/letters.ts';
import { Screen } from '../ui/Screen.tsx';
import { useNav } from '../state/nav.tsx';
import { useStore } from '../state/store.tsx';
import { GameRunner, RunSummary, type RunResult } from './GameRunner.tsx';
import { LetterLesson } from './Letters.tsx';
import { NumbersLearn, ColorsLearn, WordsLearn } from './Worlds.tsx';
import { ExamFlow } from './Exam.tsx';
import { Guide } from '../art/Guide.tsx';
import { IconCheck } from '../ui/icons.tsx';
import type { SkillResult } from '../ui/QuestionView.tsx';

export function PathScreen() {
  const nav = useNav();
  const { save } = useStore();
  const nextIdx = SESSIONS.findIndex((s) => !save.sessions[s.id]?.done);
  return (
    <Screen title={T.path.title} tone="purple">
      <p className="lead">{T.path.lead}</p>
      <ol className="path">
        {SESSIONS.map((s, i) => {
          const rec = save.sessions[s.id];
          const k = sessionKnown(save, s);
          const isNext = i === nextIdx;
          return (
            <li key={s.id} className={`path__item ${rec?.done ? 'is-done' : ''} ${isNext ? 'is-next' : ''}`}>
              <button type="button" className="path__btn" onClick={() => nav.go({ name: 'session', id: s.id })}>
                <span className="path__n">{rec?.done ? <IconCheck size={26} /> : s.n}</span>
                <span className="path__text">
                  <b>{T.path.meetingTitle(s.n, s.title)}</b>
                  <small>{T.path.minutes(s.goal, s.minutes)}</small>
                  {k && (
                    <span className="path__known">
                      <span className="meter"><span style={{ width: `${(k.known / k.total) * 100}%` }} /></span>
                      {T.path.mastery(k.known, k.total)}
                    </span>
                  )}
                  {rec?.done && <small className="path__last">{T.path.last(rec.lastCorrect, rec.lastTotal)}</small>}
                </span>
                {isNext && <span className="path__badge">{T.path.nextBadge}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}

export function SessionScreen({ id }: { id: string }) {
  const s = sessionById(id)!;
  const nav = useNav();
  const { save, finishSession, setResume } = useStore();
  const resumeAt = save.resume?.[id];
  const [stepIdx, setStepIdx] = useState(-1);
  const all = useRef<SkillResult[]>([]);
  const [final, setFinal] = useState<RunResult | null>(null);
  const [examScore, setExamScore] = useState<string | null>(null);

  const nextStep = () => {
    if (stepIdx + 1 < s.steps.length) { setStepIdx(stepIdx + 1); setResume(s.id, stepIdx + 1); return; }
    setResume(s.id, null);
    const rs = all.current;
    const r: RunResult = { correct: rs.filter((x) => x.correct).length, total: rs.length, wrong: [...new Set(rs.filter((x) => !x.correct).map((x) => x.skill))], results: rs };
    finishSession(s.id, r.correct, r.total);
    setFinal(r);
  };

  if (final) {
    const learned = s.steps.filter((st) => st.kind !== 'game' && st.kind !== 'review' && st.kind !== 'lab').map((st) => st.title);
    const next = SESSIONS[s.n];
    return (
      <Screen title={T.path.meeting(s.n)} tone="purple" noSlow>
        <RunSummary title={T.path.meeting(s.n)} r={final} onDone={() => nav.go({ name: 'path' })} doneLabel={T.summary.backToPath}
          extra={
            <div className="summary__more">
              {learned.length > 0 && <p><b>{T.summary.learned}</b> {learned.join(' · ')}</p>}
              {examScore && <p><b>{T.summary.exam}</b> {examScore}</p>}
              {next && <p><b>{T.summary.nextMeeting}</b> {next.title} – {next.goal}</p>}
            </div>
          } />
      </Screen>
    );
  }

  if (stepIdx < 0) {
    return (
      <Screen title={T.path.meeting(s.n)} tone="purple">
        <div className="intro">
          <Guide size={130} mood="happy" />
          <h2>{s.title}</h2>
          <p>{s.goal}</p>
          <ol className="intro__steps">
            {s.steps.map((st, i) => <li key={i}>{st.title}</li>)}
          </ol>
          {resumeAt !== undefined && resumeAt > 0 && resumeAt < s.steps.length ? (
            <>
              <button type="button" className="btn btn--primary btn--wide" onClick={() => setStepIdx(resumeAt)}>{T.path.resume(resumeAt + 1, s.steps[resumeAt].title)}</button>
              <button type="button" className="link-btn link-btn--center" onClick={() => { setResume(s.id, 0); setStepIdx(0); }}>{T.path.restart}</button>
            </>
          ) : (
            <button type="button" className="btn btn--primary btn--wide" onClick={() => { setResume(s.id, 0); setStepIdx(0); }}>{T.path.go}</button>
          )}
        </div>
      </Screen>
    );
  }

  const step = s.steps[stepIdx];
  return (
    <Screen title={T.path.stepOf(s.n, stepIdx + 1, s.steps.length)} tone="purple">
      <StepView key={stepIdx} step={step} save={save}
        onResults={(r) => all.current.push(...r)}
        onExam={(txt) => setExamScore(txt)}
        onDone={nextStep} />
    </Screen>
  );
}

function StepView({ step, save, onResults, onDone, onExam }: {
  step: Step;
  save: ReturnType<typeof useStore>['save'];
  onResults: (r: SkillResult[]) => void;
  onDone: () => void;
  onExam: (t: string) => void;
}) {
  const nav = useNav();
  // Questions are built once when the step opens (adaptive to current progress).
  const questions = useMemo(() => buildStep(step, save), [step]); // eslint-disable-line react-hooks/exhaustive-deps
  switch (step.kind) {
    case 'learnLetters':
      return <LearnLetters letters={step.letters} title={step.title} onDone={onDone} />;
    case 'learnNumbers':
      return <LearnBlock title={step.title} onDone={onDone}><NumbersLearn /></LearnBlock>;
    case 'learnColors':
      return <LearnBlock title={step.title} onDone={onDone}><p className="lead">{T.path.learnColors}</p><ColorsLearn /></LearnBlock>;
    case 'learnWords':
      return <LearnBlock title={step.title} onDone={onDone}><WordsLearn /></LearnBlock>;
    case 'exam':
      return <ExamFlow onExit={() => nav.back()} onComplete={(r) => { onExam(`${r.score}%`); onResults(r.results); onDone(); }} />;
    default:
      return (
        <GameRunner questions={questions} title={step.title} mode={step.kind === 'lab' ? 'lab-learn' : 'practice'} summary={false}
          introKey={step.kind === 'game' ? step.game : step.kind === 'lab' ? 'lab' : 'review'}
          onExit={onDone}
          onFinish={(r) => { onResults(r.results); onDone(); }} />
      );
  }
}

function LearnBlock({ title, onDone, children }: { title: string; onDone: () => void; children: React.ReactNode }) {
  return (
    <div className="learn-block">
      <h2 className="step-title">{title}</h2>
      {children}
      <button type="button" className="btn btn--primary btn--wide" onClick={onDone}>{T.common.continue}</button>
    </div>
  );
}

/** One letter at a time; "next" opens after hearing both the name and the sound. */
function LearnLetters({ letters, title, onDone }: { letters: LetterId[]; title: string; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [heard, setHeard] = useState<Set<string>>(new Set());
  const id = letters[i];
  const ready = heard.has(`${id}:name`) && heard.has(`${id}:sound`);
  return (
    <div className="learn-block">
      <h2 className="step-title">{title} <span className="step-title__sub" dir="ltr">({i + 1}/{letters.length})</span></h2>
      <LetterLesson key={id} id={id} onHeard={(w) => setHeard((h) => new Set(h).add(`${id}:${w}`))} />
      {!ready && <p className="hint">{T.path.needBoth}</p>}
      <button type="button" className="btn btn--primary btn--wide" disabled={!ready}
        onClick={() => (i + 1 < letters.length ? setI(i + 1) : onDone())}>
        {i + 1 < letters.length ? T.path.nextLetter(letter(letters[i + 1]).upper) : T.common.continue}
      </button>
    </div>
  );
}
