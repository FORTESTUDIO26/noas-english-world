import { useEffect, useRef, useState } from 'react';
import { T } from '../text/he.ts';
import type { ChoiceQ, Question } from '../learn/questions.ts';
import { letter } from '../content/letters.ts';
import { audio } from '../audio/player.ts';
import { clipId } from '../audio/clips.ts';
import { useStore } from '../state/store.tsx';
import { Speaker, playClips } from './Speaker.tsx';
import { VisualView } from './VisualView.tsx';
import { TracePad } from './TracePad.tsx';
import { PairsBoard, PaintTask, type Mode, type SkillResult } from './tasks.tsx';
import { IconHelp } from './icons.tsx';
import { Guide } from '../art/Guide.tsx';

export type { Mode, SkillResult };

const PRAISE = T.feedback.praise;

export function QuestionView({ q, mode, onAnswered, onNext, nextLabel = T.common.next, autoPlay = true }: {
  q: Question;
  mode: Mode;
  /** first-try evidence for each skill in the question (called once) */
  onAnswered: (r: SkillResult[]) => void;
  onNext: () => void;
  nextLabel?: string;
  /** play the instruction when the question appears (off for quizzes embedded lower in a page) */
  autoPlay?: boolean;
}) {
  const { save } = useStore();
  const [finished, setFinished] = useState<null | 'right' | 'revealed'>(null);
  const [showHelp, setShowHelp] = useState(false);
  const reported = useRef(false);
  const exam = mode === 'exam';
  const slow = save.settings.slow;

  const report = (r: SkillResult[]) => {
    if (reported.current) return;
    reported.current = true;
    onAnswered(r);
  };

  useEffect(() => {
    setFinished(null);
    setShowHelp(false);
    reported.current = false;
    if (q.prompt.audio.length && autoPlay) {
      const t = setTimeout(() => void playClips(q.prompt.audio, slow), 350);
      return () => { clearTimeout(t); audio.stop(); };
    }
    return () => audio.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);

  // Exam: move on right after an answer, no feedback.
  useEffect(() => {
    if (exam && finished) {
      const t = setTimeout(onNext, 450);
      return () => clearTimeout(t);
    }
  }, [exam, finished, onNext]);

  const hideEn = q.listening && !finished;
  const helpAllowed = mode === 'practice' || mode === 'lab-learn';

  const done = (kind: 'right' | 'revealed', after?: string) => {
    setFinished(kind);
    if (!exam && kind === 'right') {
      if (after) void audio.play(after);
      else void audio.play(clipId.feedback(Math.random() < 0.5 ? 'great' : 'wellDone'));
    }
  };

  return (
    <div className={`question question--${q.kind}`}>
      <div className="prompt">
        {q.prompt.audio.length > 0 && <Speaker clips={q.prompt.audio} size="l" withSlow label={T.common.again} />}
        <div className="prompt__text">
          <p className="prompt__he">{q.prompt.he}</p>
          {q.prompt.en && !hideEn && <p className="prompt__en" dir="ltr" lang="en">{q.prompt.en}</p>}
          {q.prompt.en && hideEn && <p className="prompt__en prompt__en--hidden" aria-hidden>{T.common.listenHidden}</p>}
        </div>
        {helpAllowed && q.prompt.helpHe && !finished && (
          <button type="button" className="btn btn--icon" onClick={() => setShowHelp((x) => !x)} aria-expanded={showHelp} aria-label={T.common.helpHe}>
            <IconHelp />
          </button>
        )}
      </div>
      {showHelp && q.prompt.helpHe && <p className="help-he">{q.prompt.helpHe}</p>}

      {q.kind === 'choice' && <ChoiceBody q={q} mode={mode} report={report} done={done} finished={finished} />}
      {q.kind === 'pairs' && (
        <PairsBoard q={q} mode={mode} onFirst={report} onDone={() => done('right')} />
      )}
      {q.kind === 'paint' && (
        <PaintTask q={q} mode={mode} onFirst={report} onDone={(ok) => done(ok || exam ? 'right' : 'revealed')} />
      )}
      {q.kind === 'trace' && (
        <TraceBody q={q} mode={mode} report={report} done={done} finished={finished} />
      )}

      {finished && !exam && (
        <div className={`after after--${finished}`} role="status">
          <Guide size={64} mood={finished === 'right' ? 'cheer' : 'think'} />
          <div className="after__text">
            <strong>{finished === 'right' ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : T.feedback.learnIt}</strong>
            {q.listening && q.prompt.en && <span className="after__en" dir="ltr" lang="en">{q.prompt.en}</span>}
            <span>{explainOf(q)}</span>
          </div>
          <button type="button" className="btn btn--primary btn--next" onClick={onNext}>{nextLabel}</button>
        </div>
      )}
    </div>
  );
}

function explainOf(q: Question) {
  return q.explainHe;
}

function ChoiceBody({ q, mode, report, done, finished }: {
  q: ChoiceQ;
  mode: Mode;
  report: (r: SkillResult[]) => void;
  done: (k: 'right' | 'revealed', after?: string) => void;
  finished: null | 'right' | 'revealed';
}) {
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [picked, setPicked] = useState<number | null>(null);
  const exam = mode === 'exam';
  useEffect(() => { setWrong(new Set()); setPicked(null); }, [q.id]);

  const choose = (i: number) => {
    if (finished || wrong.has(i)) return;
    const right = i === q.answer;
    if (wrong.size === 0) report([{ skill: q.skill, correct: right }]);
    setPicked(i);
    if (exam) { done(right ? 'right' : 'revealed'); return; }
    if (right) { done('right', q.afterAudio); return; }
    const w = new Set(wrong).add(i);
    setWrong(w);
    void audio.play(clipId.feedback('tryAgain'));
    if (w.size >= 2 || w.size >= q.options.length - 1) done('revealed');
  };

  const optCount = q.options.length;
  return (
    <>
      {q.show && (
        <div className="show">
          {q.showAudio ? (
            <button type="button" className="show__btn" onClick={() => void audio.play(q.showAudio!)} aria-label={T.common.tapToHear}>
              <VisualView v={q.show} size="l" />
            </button>
          ) : (
            <VisualView v={q.show} size="l" />
          )}
        </div>
      )}
      <div className={`options options--${optCount} ${q.bigOptions ? 'options--big' : ''}`} dir="ltr">
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          const cls = [
            'tile',
            `tile--${o.t}`,
            wrong.has(i) ? 'is-wrong' : '',
            !exam && finished && isAnswer ? 'is-correct' : '',
            exam && picked === i ? 'is-selected' : '',
          ].join(' ');
          return (
            <button key={i} type="button" className={cls} onClick={() => choose(i)} disabled={!!finished && !(!exam && isAnswer)}
              aria-label={o.t === 'color' || o.t === 'thing' || o.t === 'picture' ? T.common.option(i + 1) : undefined}>
              <VisualView v={o} size={q.bigOptions ? 'l' : 'm'} />
            </button>
          );
        })}
      </div>
    </>
  );
}

function TraceBody({ q, mode, report, done, finished }: {
  q: Extract<Question, { kind: 'trace' }>;
  mode: Mode;
  report: (r: SkillResult[]) => void;
  done: (k: 'right' | 'revealed', after?: string) => void;
  finished: null | 'right' | 'revealed';
}) {
  const l = letter(q.letter);
  const glyph = q.case === 'upper' ? l.upper : l.lower;
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  useEffect(() => { setTries(0); setMsg(null); setKey((k) => k + 1); }, [q.id]);
  return (
    <div className="trace-wrap">
      <TracePad key={key} glyph={glyph} disabled={!!finished} onDone={(s) => {
        if (tries === 0) report([{ skill: q.skill, correct: s.ok }]);
        setTries(tries + 1);
        if (s.ok || mode === 'exam') { done(s.ok ? 'right' : 'revealed', clipId.letterName(q.letter)); return; }
        setMsg(s.coverage < 0.6 ? T.letters.traceMore : T.letters.traceInside);
        if (tries + 1 >= 3) done('revealed');
        else setKey((k) => k + 1);
      }} />
      {msg && !finished && <p className="hint hint--oops">{msg}</p>}
    </div>
  );
}
