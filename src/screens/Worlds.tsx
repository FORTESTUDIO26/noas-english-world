import { useState } from 'react';
import { NUMBERS } from '../content/numbers.ts';
import { COLORS } from '../content/colors.ts';
import { WORDS, type WordId } from '../content/words.ts';
import { clipId } from '../audio/clips.ts';
import { audio } from '../audio/player.ts';
import { Picture } from '../art/pictures.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Speaker } from '../ui/Speaker.tsx';
import { useStore } from '../state/store.tsx';
import { masteryOf } from '../learn/progress.ts';
import type { GameId } from '../learn/questions.ts';
import { GameMenu } from './GameMenu.tsx';
import { Tabs, badge } from './Letters.tsx';
import { IconCheck } from '../ui/icons.tsx';

// ------------------------------------------------------------------ numbers

export const NUMBER_GAMES: { id: GameId; title: string; desc: string }[] = [
  { id: 'hearNumber', title: 'שומעים ובוחרים', desc: 'שומעים מספר ובוחרים את הספרות' },
  { id: 'teens', title: '13 או 3?', desc: 'מבחינים בין מספרים שנשמעים דומה' },
  { id: 'count', title: 'סופרים', desc: 'סופרים עצמים ובוחרים מספר' },
  { id: 'numberMemory', title: 'זיכרון שמיעתי', desc: 'מקשיבים לרמקולים ומתאימים מספרים' },
  { id: 'numberWord', title: 'מספר ומילה', desc: 'מתאימים מספר למילה באנגלית' },
];

export function NumberCard({ n }: { n: number }) {
  const item = NUMBERS[n - 1];
  const { save } = useStore();
  const m = masteryOf(save, 'number', n);
  return (
    <button type="button" className="num-card" onClick={() => void audio.play(clipId.number(n))} aria-label={`המספר ${n}`}>
      <span className="num-card__digit" dir="ltr">{n}</span>
      <span className="num-card__word" dir="ltr" lang="en">{item.word}</span>
      <span className="num-card__dots" aria-hidden>
        {Array.from({ length: n }).map((_, i) => <i key={i} className={i >= 10 ? 'is-ten' : ''} />)}
      </span>
      <span className={`mastery-dot mastery-dot--${m}`} aria-hidden>{m === 'known' && <IconCheck size={14} />}</span>
    </button>
  );
}

export function NumbersLearn({ from = 1, to = 20 }: { from?: number; to?: number }) {
  return (
    <>
      <p className="lead">לחצי על כל מספר כדי לשמוע אותו. סופרים את העיגולים: כל שורה היא 10.</p>
      <div className="grid grid--numbers">
        {NUMBERS.filter((x) => x.n >= from && x.n <= to).map((x) => <NumberCard key={x.n} n={x.n} />)}
      </div>
      <div className="note-card">
        <b>שימי לב:</b> <span dir="ltr" lang="en">thirteen</span> (13) נגמר ב־<b dir="ltr">teen</b> – "טִין" ארוך.
        יש מספר אחר, <span dir="ltr" lang="en">thirty</span> (30), שנשמע קצת דומה אבל נגמר ב־<b dir="ltr">ty</b> – "טִי" קצר.
        30 לא נמצא במבחן, רק כדאי להכיר כדי לא להתבלבל.
        <div className="row-center">
          <Speaker clips={[clipId.number(3)]} label="3" size="s" />
          <Speaker clips={[clipId.number(13)]} label="13" size="s" />
          <Speaker clips={[clipId.number(4)]} label="4" size="s" />
          <Speaker clips={[clipId.number(14)]} label="14" size="s" />
        </div>
      </div>
    </>
  );
}

export function NumbersWorld() {
  const [tab, setTab] = useState<'learn' | 'play'>('learn');
  return (
    <Screen title="עולם המספרים" en="Numbers 1–20" tone="teal">
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'learn' ? <NumbersLearn /> : <GameMenu games={NUMBER_GAMES} />}
    </Screen>
  );
}

// ------------------------------------------------------------------ colours

export const COLOR_GAMES: { id: GameId; title: string; desc: string }[] = [
  { id: 'hearColor', title: 'שומעים ולוחצים', desc: 'שומעים צבע ולוחצים עליו' },
  { id: 'paint', title: 'צובעים לפי הוראה', desc: 'Color the ball blue' },
  { id: 'findColor', title: 'מצאי את הצבע', desc: 'מוצאים חפץ בצבע ששמעת' },
  { id: 'colorWord', title: 'שם וצבע', desc: 'מתאימים את שם הצבע לצבע' },
];

export function ColorsLearn() {
  const { save } = useStore();
  return (
    <div className="grid grid--colors">
      {COLORS.map((c) => {
        const m = masteryOf(save, 'color', c.id);
        return (
          <button key={c.id} type="button" className={`color-card ${c.id === 'white' ? 'color-card--white' : ''}`} style={{ background: c.hex, color: c.ink }} onClick={() => void audio.play(clipId.color(c.id))} aria-label={`הצבע ${c.he}`}>
            <span className="color-card__thing"><Picture id={c.thing} size="100%" /></span>
            <span className="color-card__name" dir="ltr" lang="en">{c.id}</span>
            <span className="color-card__he">{c.he}</span>
            <span className="color-card__spk" aria-hidden>🔊</span>
            <span className={`mastery-dot mastery-dot--${m}`} aria-hidden>{m === 'known' && <IconCheck size={14} />}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ColorsWorld() {
  const [tab, setTab] = useState<'learn' | 'play'>('learn');
  return (
    <Screen title="עולם הצבעים" en="Colors" tone="pink">
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'learn' ? <><p className="lead">לחצי על צבע כדי לשמוע את השם שלו באנגלית.</p><ColorsLearn /></> : <GameMenu games={COLOR_GAMES} />}
    </Screen>
  );
}

// ------------------------------------------------------------------ words

export const WORD_GAMES: { id: GameId; title: string; desc: string }[] = [
  { id: 'wordPicture', title: 'קוראים ומוצאים', desc: 'קוראים מילה ובוחרים תמונה' },
  { id: 'pictureWord', title: 'מה כתוב?', desc: 'רואים תמונה ובוחרים מילה' },
  { id: 'hearWord', title: 'שומעים ובוחרים', desc: 'שומעים מילה ובוחרים תמונה' },
  { id: 'whichWord', title: 'איזו מילה שמעתי?', desc: 'שומעים ובוחרים מילה כתובה' },
  { id: 'wordFirst', title: 'האות הפותחת', desc: 'באיזו אות מתחילה המילה?' },
  { id: 'wordGap', title: 'האות החסרה', desc: 'משלימים אות חסרה במילה' },
];

export function WordLesson({ id }: { id: WordId }) {
  const w = WORDS.find((x) => x.id === id)!;
  const { save } = useStore();
  const m = badge([masteryOf(save, 'word', id)]);
  return (
    <div className="word-card">
      <Picture id={w.picture} size={130} label={w.he} />
      <div className="word-card__body">
        <p className="word-card__word" dir="ltr" lang="en">
          {[...w.id].map((ch, i) => <span key={i} className={i === 0 ? 'hl' : ''}>{ch}</span>)}
        </p>
        <p className="word-card__he">{w.he}</p>
        <div className="row-center">
          <Speaker clips={[clipId.word(w.id)]} label="להקשיב" size="m" withSlow />
        </div>
        <p className="word-card__first">
          הצליל הראשון: <Speaker clips={[clipId.phoneme(w.id[0])]} size="s" /> <b dir="ltr" lang="en">{w.id[0].toUpperCase()}{w.id[0]}</b>
        </p>
        {w.segments && (
          <div className="segments" dir="ltr">
            {w.segments.map((s, i) => (
              <button key={i} type="button" className="segments__part" onClick={() => void audio.play(clipId.phoneme(s))} lang="en">{s}</button>
            ))}
            <button type="button" className="segments__all" onClick={() => void audio.play(clipId.word(w.id))} lang="en">{w.id}</button>
          </div>
        )}
      </div>
      <span className={`mastery-dot mastery-dot--${m}`} aria-hidden>{m === 'known' && <IconCheck size={14} />}</span>
    </div>
  );
}

export function WordsLearn() {
  return (
    <>
      <p className="lead">שבע המילים למבחן. לחצי על הרמקול, ועל כל חלק במילה כדי לשמוע את הצלילים.</p>
      <div className="grid grid--words">
        {WORDS.map((w) => <WordLesson key={w.id} id={w.id} />)}
      </div>
    </>
  );
}

export function WordsWorld() {
  const [tab, setTab] = useState<'learn' | 'play'>('learn');
  return (
    <Screen title="עולם המילים" en="My First Words" tone="yellow">
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'learn' ? <WordsLearn /> : <GameMenu games={WORD_GAMES} />}
    </Screen>
  );
}
