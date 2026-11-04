import { useEffect, useMemo, useState } from 'react';
import { T } from '../text/he.ts';
import { LETTERS, letter, type LetterId } from '../content/letters.ts';
import { clipId } from '../audio/clips.ts';
import { Picture } from '../art/pictures.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Speaker } from '../ui/Speaker.tsx';
import { HandwritingPad, writeMessage } from '../ui/HandwritingPad.tsx';
import { QuestionView } from '../ui/QuestionView.tsx';
import { useNav } from '../state/nav.tsx';
import { useStore } from '../state/store.tsx';
import { masteryOf, skillKey, type Mastery } from '../learn/progress.ts';
import { qLetterName } from '../learn/questions.ts';
import { GameMenu, gameList } from './GameMenu.tsx';
import { IconCheck } from '../ui/icons.tsx';

const CARD_COLORS = ['#9b5de5', '#ff72b6', '#20c4c4', '#ffb02e'];

export function badge(ms: Mastery[]): Mastery {
  if (ms.every((m) => m === 'known')) return 'known';
  if (ms.some((m) => m === 'weak')) return 'weak';
  if (ms.every((m) => m === 'new')) return 'new';
  return 'learning';
}

export const LETTER_GAMES = gameList(['letterName', 'letterSound', 'letterPairs', 'letterLook', 'missingLetter', 'firstLetter', 'trace']);

export function LettersWorld() {
  const nav = useNav();
  const { save } = useStore();
  const [tab, setTab] = useState<'learn' | 'play'>('learn');
  return (
    <Screen title={T.letters.title} en="ABC" tone="purple">
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'learn' ? (
        <div className="grid grid--letters" dir="ltr">
          {LETTERS.map((l, i) => {
            const m = badge([masteryOf(save, 'letterName', l.id), masteryOf(save, 'letterSound', l.id)]);
            return (
              <button key={l.id} type="button" className="letter-card" style={{ ['--c' as string]: CARD_COLORS[i % 4] }} onClick={() => nav.go({ name: 'letter', id: l.id })} aria-label={T.letters.letter(l.upper)}>
                <span className="letter-card__big" lang="en">{l.upper}{l.lower}</span>
                <span className={`mastery-dot mastery-dot--${m}`} aria-hidden>{m === 'known' && <IconCheck size={14} />}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <GameMenu games={LETTER_GAMES} />
      )}
    </Screen>
  );
}

export function Tabs({ tab, setTab }: { tab: 'learn' | 'play'; setTab: (t: 'learn' | 'play') => void }) {
  return (
    <div className="tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab === 'learn'} className={tab === 'learn' ? 'is-on' : ''} onClick={() => setTab('learn')}>{T.common.learnTab}</button>
      <button type="button" role="tab" aria-selected={tab === 'play'} className={tab === 'play' ? 'is-on' : ''} onClick={() => setTab('play')}>{T.common.playTab}</button>
    </div>
  );
}

/** Everything about one letter. Used in the letters world and inside sessions. */
export function LetterLesson({ id, onHeard }: { id: LetterId; onHeard?: (what: 'name' | 'sound') => void }) {
  const l = letter(id);
  const { answer, markOpened } = useStore();
  const [traceCase, setTraceCase] = useState<'upper' | 'lower'>('upper');
  const [traceMsg, setTraceMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [traceKey, setTraceKey] = useState(0);
  const quiz = useMemo(() => qLetterName(id), [id]);
  const [quizDone, setQuizDone] = useState(false);
  useEffect(() => { markOpened(`letter:${id}`); setQuizDone(false); setTraceMsg(null); }, [id, markOpened]);

  return (
    <div className="lesson">
      <div className="lesson__hero">
        <div className="lesson__glyphs" dir="ltr" lang="en">
          <span className="lesson__upper">{l.upper}</span>
          <span className="lesson__lower">{l.lower}</span>
        </div>
        <div className="lesson__buttons">
          <span onClick={() => onHeard?.('name')}>
            <Speaker clips={[clipId.letterName(id)]} label={T.letters.name} size="m" withSlow />
          </span>
          <span onClick={() => onHeard?.('sound')}>
            <Speaker clips={[clipId.phoneme(id)]} label={T.letters.sound} size="m" className="speaker-wrap--sound" />
          </span>
          <Speaker clips={[clipId.word(l.example)]} label={T.letters.example} size="m" withSlow />
        </div>
        {/* name – pause – sound – pause – word, so the difference between name and sound is heard */}
        <span className="lesson__all" onClick={() => { onHeard?.('name'); onHeard?.('sound'); }}>
          <Speaker clips={[clipId.letterName(id), clipId.phoneme(id), clipId.word(l.example)]} gapMs={850} label={T.letters.all} size="l" className="speaker-wrap--all" />
        </span>
      </div>
      <div className="lesson__example">
        <Picture id={l.picture} size={120} label={l.exampleHe} />
        <p className="lesson__word" dir="ltr" lang="en"><b className="hl">{l.example[0]}</b>{l.example.slice(1)}</p>
        <p className="lesson__tip">{T.letters.soundTip(l.soundHe)}</p>
      </div>

      <section className="lesson__section">
        <h2>{T.letters.writing}</h2>
        <div className="seg" role="radiogroup">
          <button type="button" className={traceCase === 'upper' ? 'is-on' : ''} onClick={() => { setTraceCase('upper'); setTraceMsg(null); setTraceKey((k) => k + 1); }} aria-pressed={traceCase === 'upper'}>{T.letters.upper} <span lang="en" dir="ltr">{l.upper}</span></button>
          <button type="button" className={traceCase === 'lower' ? 'is-on' : ''} onClick={() => { setTraceCase('lower'); setTraceMsg(null); setTraceKey((k) => k + 1); }} aria-pressed={traceCase === 'lower'}>{T.letters.lower} <span lang="en" dir="ltr">{l.lower}</span></button>
        </div>
        <HandwritingPad key={`${id}-${traceCase}-${traceKey}`} letter={id} which={traceCase} onResult={(r) => {
          answer(skillKey('letterWrite', id), r.ok);
          setTraceMsg({ ok: r.ok, text: writeMessage(r) });
        }} />
        {traceMsg && <p className={`hint ${traceMsg.ok ? 'hint--good' : 'hint--oops'}`} role="status">{traceMsg.text}</p>}
        {traceMsg && !traceMsg.ok && <button type="button" className="link-btn link-btn--center" onClick={() => { setTraceMsg(null); setTraceKey((k) => k + 1); }}>{T.write.retry}</button>}
      </section>

      <section className="lesson__section">
        <h2>{T.letters.quiz}</h2>
        {!quizDone ? (
          <QuestionView q={quiz} mode="practice" onAnswered={(r) => r.forEach((x) => answer(x.skill, x.correct))} onNext={() => setQuizDone(true)} nextLabel={T.common.done} autoPlay={false} />
        ) : <p className="hint">{T.letters.quizDone}</p>}
      </section>
    </div>
  );
}

export function LetterScreen({ id }: { id: LetterId }) {
  const nav = useNav();
  const idx = LETTERS.findIndex((l) => l.id === id);
  const l = letter(id);
  return (
    <Screen title={T.letters.letter(l.upper)} tone="purple">
      <LetterLesson id={id} />
      <div className="pager">
        <button type="button" className="btn btn--ghost" disabled={idx === 0} onClick={() => nav.go({ name: 'letter', id: LETTERS[idx - 1].id })}>{T.letters.prev}</button>
        <button type="button" className="btn btn--ghost" disabled={idx === LETTERS.length - 1} onClick={() => nav.go({ name: 'letter', id: LETTERS[idx + 1].id })}>{T.letters.nextLetter}</button>
      </div>
    </Screen>
  );
}
