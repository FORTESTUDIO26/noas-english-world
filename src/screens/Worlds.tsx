import { useState } from 'react';
import { T } from '../text/he.ts';
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
import { GameMenu, gameList } from './GameMenu.tsx';
import { Tabs, badge } from './Letters.tsx';
import { IconCheck } from '../ui/icons.tsx';

// ------------------------------------------------------------------ numbers

export const NUMBER_GAMES = gameList(['hearNumber', 'teens', 'count', 'numberMemory', 'numberWord']);

export function NumberCard({ n }: { n: number }) {
  const item = NUMBERS[n - 1];
  const { save } = useStore();
  const m = masteryOf(save, 'number', n);
  return (
    <button type="button" className="num-card" onClick={() => void audio.play(clipId.number(n))} aria-label={T.numbers.number(n)}>
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
      <p className="lead">{T.numbers.lead}</p>
      <div className="grid grid--numbers">
        {NUMBERS.filter((x) => x.n >= from && x.n <= to).map((x) => <NumberCard key={x.n} n={x.n} />)}
      </div>
      <div className="note-card">
        <b>{T.numbers.noteTitle}</b> <span dir="ltr" lang="en">thirteen</span> (13) {T.numbers.note1}<b dir="ltr">teen</b> {T.numbers.note2}
        {' '}<span dir="ltr" lang="en">thirty</span> (30), {T.numbers.note3}<b dir="ltr">ty</b>
        {T.numbers.note4}
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
    <Screen title={T.numbers.title} en="Numbers 1–20" tone="teal">
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'learn' ? <NumbersLearn /> : <GameMenu games={NUMBER_GAMES} />}
    </Screen>
  );
}

// ------------------------------------------------------------------ colours

export const COLOR_GAMES = gameList(['hearColor', 'paint', 'findColor', 'colorWord']);

export function ColorsLearn() {
  const { save } = useStore();
  return (
    <div className="grid grid--colors">
      {COLORS.map((c) => {
        const m = masteryOf(save, 'color', c.id);
        return (
          <button key={c.id} type="button" className={`color-card ${c.id === 'white' ? 'color-card--white' : ''}`} style={{ background: c.hex, color: c.ink }} onClick={() => void audio.play(clipId.color(c.id))} aria-label={T.colors.color(c.he)}>
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
    <Screen title={T.colors.title} en="Colors" tone="pink">
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'learn' ? <><p className="lead">{T.colors.lead}</p><ColorsLearn /></> : <GameMenu games={COLOR_GAMES} />}
    </Screen>
  );
}

// ------------------------------------------------------------------ words

export const WORD_GAMES = gameList(['wordPicture', 'pictureWord', 'hearWord', 'whichWord', 'wordFirst', 'wordGap']);

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
          <Speaker clips={[clipId.word(w.id)]} label={T.words.listen} size="m" withSlow />
        </div>
        <p className="word-card__first">
          {T.words.firstSound} <Speaker clips={[clipId.phoneme(w.id[0])]} size="s" /> <b dir="ltr" lang="en">{w.id[0].toUpperCase()}{w.id[0]}</b>
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
      <p className="lead">{T.words.lead}</p>
      <div className="grid grid--words">
        {WORDS.map((w) => <WordLesson key={w.id} id={w.id} />)}
      </div>
    </>
  );
}

export function WordsWorld() {
  const [tab, setTab] = useState<'learn' | 'play'>('learn');
  return (
    <Screen title={T.words.title} en="My First Words" tone="yellow">
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'learn' ? <WordsLearn /> : <GameMenu games={WORD_GAMES} />}
    </Screen>
  );
}
