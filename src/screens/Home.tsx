import { useState } from 'react';
import { T } from '../text/he.ts';
import { Guide } from '../art/Guide.tsx';
import { Picture } from '../art/pictures.tsx';
import { audio } from '../audio/player.ts';
import { clipId } from '../audio/clips.ts';
import { SESSIONS } from '../learn/path.ts';
import { useNav } from '../state/nav.tsx';
import { useStore } from '../state/store.tsx';
import { useProfile } from '../state/profileCtx.tsx';
import { Brand } from '../ui/Brand.tsx';
import { IconLock } from '../ui/icons.tsx';

/** First screen after a profile is chosen. Its button is also the touch Safari needs before any sound. */
export function Welcome({ onStart }: { onStart: () => void }) {
  const { profile, switchProfile } = useProfile();
  return (
    <div className="welcome">
      <Brand />
      <div className="welcome__bubble">
        <h1>{T.welcome.hi(profile.name)}</h1>
        <p>{T.welcome.ready}</p>
      </div>
      <Guide size={170} mood="happy" />
      <button type="button" className="btn btn--primary btn--huge" onClick={() => {
        audio.unlock();
        void audio.play(clipId.feedback('hello'));
        onStart();
      }}>{T.welcome.start}</button>
      <p className="welcome__small">{T.welcome.volume}</p>
      <button type="button" className="link-btn" onClick={switchProfile}>{T.welcome.notMe}</button>
    </div>
  );
}

export function Home() {
  const nav = useNav();
  const { save } = useStore();
  const { profile, switchProfile } = useProfile();
  const next = SESSIONS.find((s) => !save.sessions[s.id]?.done);
  const doneCount = SESSIONS.filter((s) => save.sessions[s.id]?.done).length;
  return (
    <div className="home">
      <div className="home__brandbar">
        <Brand size="s" tagline={false} />
        <button type="button" className="profile-pill" onClick={switchProfile} aria-label={T.profiles.switch}>
          <span className="profile-chip__avatar" aria-hidden>{profile.name.charAt(0)}</span>
          <span className="profile-pill__name">{profile.name}</span>
        </button>
      </div>
      <header className="home__head">
        <Guide size={78} mood="happy" />
        <div>
          <h1>{T.home.hi(profile.name)}</h1>
          <p>{T.home.today}</p>
        </div>
      </header>

      <button type="button" className="path-card" onClick={() => nav.go(next ? { name: 'session', id: next.id } : { name: 'path' })}>
        <span className="path-card__label">{next ? T.home.nextMeeting(next.n) : T.home.allDone}</span>
        <span className="path-card__title">{next ? next.title : T.home.allDoneSub}</span>
        <span className="path-card__bar"><span style={{ width: `${(doneCount / 6) * 100}%` }} /></span>
        <span className="path-card__go">{next ? T.home.continuePath : T.home.toPath}</span>
      </button>
      <button type="button" className="link-btn" onClick={() => nav.go({ name: 'path' })}>{T.home.fullPath}</button>

      <div className="worlds">
        <button type="button" className="world world--purple" onClick={() => nav.go({ name: 'letters' })}>
          <span className="world__art" dir="ltr" lang="en">Aa Bb</span>
          <span className="world__name">{T.home.letters}</span>
          <span className="world__en" dir="ltr">A–P</span>
        </button>
        <button type="button" className="world world--teal" onClick={() => nav.go({ name: 'numbers' })}>
          <span className="world__art" dir="ltr">1 2 3</span>
          <span className="world__name">{T.home.numbers}</span>
          <span className="world__en" dir="ltr">1–20</span>
        </button>
        <button type="button" className="world world--pink" onClick={() => nav.go({ name: 'colors' })}>
          <span className="world__art world__art--dots" aria-hidden><i style={{ background: '#2f7de1' }} /><i style={{ background: '#ffd23f' }} /><i style={{ background: '#2fb457' }} /></span>
          <span className="world__name">{T.home.colors}</span>
          <span className="world__en" dir="ltr">Colors</span>
        </button>
        <button type="button" className="world world--yellow" onClick={() => nav.go({ name: 'words' })}>
          <span className="world__art"><Picture id="cat" size={54} /></span>
          <span className="world__name">{T.home.words}</span>
          <span className="world__en" dir="ltr">My First Words</span>
        </button>
      </div>

      <div className="home__wide">
        <button type="button" className="wide-card wide-card--lab" onClick={() => nav.go({ name: 'lab' })}>
          <span className="wide-card__icon" aria-hidden>🎧</span>
          <span><b>{T.home.lab}</b><small dir="ltr" lang="en">Listening Lab</small></span>
        </button>
        <button type="button" className="wide-card wide-card--exam" onClick={() => nav.go({ name: 'exam' })}>
          <span className="wide-card__icon" aria-hidden>📝</span>
          <span><b>{T.home.exam}</b><small>{T.home.examSub}</small></span>
        </button>
      </div>

      <button type="button" className="share-cta" onClick={() => nav.go({ name: 'share' })}>
        <span aria-hidden>💌</span> {T.home.share}
      </button>
      <button type="button" className="link-btn link-btn--center" onClick={() => nav.go({ name: 'install' })}>📲 {T.home.install}</button>

      <ParentsDoor />
    </div>
  );
}

/** Press and hold to open, so the parents' area stays separate from the games. */
function ParentsDoor() {
  const nav = useNav();
  const [holding, setHolding] = useState<number | null>(null);
  const start = () => {
    const t = window.setTimeout(() => { setHolding(null); nav.go({ name: 'parents' }); }, 1500);
    setHolding(t);
  };
  const stop = () => {
    if (holding) clearTimeout(holding);
    setHolding(null);
  };
  return (
    <button type="button" className={`parents-door ${holding ? 'is-holding' : ''}`}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') nav.go({ name: 'parents' }); }}
      onContextMenu={(e) => e.preventDefault()}>
      <IconLock /> {T.home.parents} <small>{T.home.longPress}</small>
    </button>
  );
}
