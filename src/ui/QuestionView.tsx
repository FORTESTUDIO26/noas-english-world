import { useEffect, useRef, useState } from 'react';
import { T } from '../text/he.ts';
import type { ChoiceQ, Question } from '../learn/questions.ts';
import { audio } from '../audio/player.ts';
import { clipId } from '../audio/clips.ts';
import { useStore } from '../state/store.tsx';
import { Speaker, playClips } from './Speaker.tsx';
import { VisualView } from './VisualView.tsx';
import { HandwritingPad, writeMessage } from './HandwritingPad.tsx';
import { PairsBoard, PaintTask, type Mode, type SkillResult } from './tasks.tsx';
import { IconHelp, IconSpeaker } from './icons.tsx';
import { MixedText } from './MixedText.tsx';
import { speechClips } from '../audio/speech.ts';
import { Guide } from '../art/Guide.tsx';

export type { Mode, SkillResult };

const PRAISE = T.feedback.praise;

/**
 * One question. Flow for the child:
 *  1. the Hebrew instruction is shown and spoken (first time in a game; later
 *     only on request), then the English content is played;
 *  2. "שומעים שוב" repeats the English content, the turtle plays it slowly,
 *     "ההוראה" repeats the Hebrew instruction;
 *  3. after an answer the feedback stays until the child presses "הבא" –
 *     nothing advances by itself, and feedback never cuts a playing sound.
 */
export function QuestionView({ q, mode, onAnswered, onNext, nextLabel = T.common.next, autoPlay = true, speakInstruction = true }: {
  q: Question;
  mode: Mode;
  /** first-try evidence for each skill in the question (called once) */
  onAnswered: (r: SkillResult[]) => void;
  onNext: () => void;
  nextLabel?: string;
  /** play the instruction when the question appears (off for quizzes embedded lower in a page) */
  autoPlay?: boolean;
  /** speak the Hebrew instruction automatically (true the first time it appears in a game) */
  speakInstruction?: boolean;
}) {
  const { save } = useStore();
  const [finished, setFinished] = useState<null | 'right' | 'revealed'>(null);
  const [showHelp, setShowHelp] = useState(false);
  const reported = useRef(false);
  const exam = mode === 'exam';
  const slow = save.settings.slow;
  const instr = speechClips(q.prompt.he);
  const content = q.prompt.audio;

  const report = (r: SkillResult[]) => {
    if (reported.current) return;
    reported.current = true;
    onAnswered(r);
  };

  useEffect(() => {
    setFinished(null);
    setShowHelp(false);
    reported.current = false;
    if (!autoPlay) return () => audio.stop();
    const seq = [...(speakInstruction ? instr : []), ...content];
    const t = setTimeout(() => { if (seq.length) void audio.playSequence(seq, { slow, gapMs: 450 }); }, 400);
    return () => { clearTimeout(t); audio.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);

  const hideEn = q.listening && !finished;
  const helpAllowed = mode === 'practice' || mode === 'lab-learn';

  const done = (kind: 'right' | 'revealed', after?: string) => {
    setFinished(kind);
    if (exam) return;
    if (kind === 'right') {
      const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      setPraise(praise);
      void audio.enqueue([...speechClips(praise), ...(after ? [after] : [])], { slow, gapMs: 400 });
    }
  };
  const [praise, setPraise] = useState(PRAISE[0]);

  return (
    <div className={`question question--${q.kind}`}>
      <div className="prompt">
        <p className="prompt__he"><MixedText text={q.prompt.he} /></p>
        {q.prompt.en && !hideEn && <p className="prompt__en" dir="ltr" lang="en">{q.prompt.en}</p>}
        <div className="prompt__actions">
          {content.length > 0 && <Speaker clips={content} size="l" withSlow label={T.common.listenAgain} />}
          {instr.length > 0 && (
            <button type="button" className="btn btn--soft" onClick={() => void playClips(instr, slow)} aria-label={T.common.instruction}>
              <IconSpeaker size={20} /> {T.common.instruction}
            </button>
          )}
          {helpAllowed && q.prompt.helpHe && !finished && (
            <button type="button" className="btn btn--soft" onClick={() => {
              const open = !showHelp;
              setShowHelp(open);
              if (open) void playClips(speechClips(q.prompt.helpHe!), slow);
            }} aria-expanded={showHelp}>
              <IconHelp /> {T.common.helpHe}
            </button>
          )}
        </div>
      </div>
      {showHelp && q.prompt.helpHe && <p className="help-he"><MixedText text={q.prompt.helpHe} /></p>}

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

      {finished && exam && (
        <div className="after after--saved" role="status">
          <span className="after__text"><strong>{T.exam.saved}</strong></span>
          <button type="button" className="btn btn--primary btn--next" onClick={onNext}>{nextLabel}</button>
        </div>
      )}
      {finished && !exam && (
        <div className={`after after--${finished}`} role="status">
          <Guide size={64} mood={finished === 'right' ? 'cheer' : 'think'} />
          <div className="after__text">
            <strong>{finished === 'right' ? praise : T.feedback.learnIt}</strong>
            {q.listening && q.prompt.en && <span className="after__en" dir="ltr" lang="en">{q.prompt.en}</span>}
            <span><MixedText text={q.explainHe} /></span>
          </div>
          <button type="button" className="btn btn--primary btn--next" onClick={onNext}>{nextLabel}</button>
        </div>
      )}
    </div>
  );
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
    void audio.enqueue(speechClips(T.feedback.tryAgain));
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
      {!exam && !finished && wrong.size > 0 && <p className="hint hint--oops" role="status">{T.feedback.tryAgainHint}</p>}
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
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  useEffect(() => { setTries(0); setMsg(null); setKey((k) => k + 1); }, [q.id]);
  return (
    <div className="trace-wrap">
      <HandwritingPad key={key} letter={q.letter} which={q.case} hints={mode !== 'exam'} demo={mode !== 'exam'} disabled={!!finished} onResult={(r) => {
        if (tries === 0) report([{ skill: q.skill, correct: r.ok }]);
        setTries(tries + 1);
        if (r.ok || mode === 'exam') { done(r.ok ? 'right' : 'revealed', clipId.letterName(q.letter)); return; }
        setMsg(writeMessage(r));
        if (tries + 1 >= 3) done('revealed');
        else setKey((k) => k + 1);
      }} />
      {msg && !finished && <p className="hint hint--oops">{msg}</p>}
    </div>
  );
}
