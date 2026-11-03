import { useState } from 'react';
import { Guide } from '../art/Guide.tsx';
import { Picture } from '../art/pictures.tsx';
import { audio } from '../audio/player.ts';
import { clipId } from '../audio/clips.ts';
import { SESSIONS } from '../learn/path.ts';
import { useNav } from '../state/nav.tsx';
import { useStore } from '../state/store.tsx';
import { IconLock } from '../ui/icons.tsx';

export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome__bubble">
        <h1>היי נועה!</h1>
        <p>מוכנה ללמוד אנגלית?</p>
      </div>
      <Guide size={190} mood="happy" />
      <button type="button" className="btn btn--primary btn--huge" onClick={() => {
        audio.unlock();
        void audio.play(clipId.feedback('hello'));
        onStart();
      }}>כן! בואי נתחיל</button>
      <p className="welcome__small">מומלץ להגביר את הקול 🔊</p>
    </div>
  );
}

export function Home() {
  const nav = useNav();
  const { save } = useStore();
  const next = SESSIONS.find((s) => !save.sessions[s.id]?.done);
  const doneCount = SESSIONS.filter((s) => save.sessions[s.id]?.done).length;
  return (
    <div className="home">
      <header className="home__head">
        <Guide size={84} mood="happy" />
        <div>
          <h1>היי נועה! 👋</h1>
          <p>מה נלמד היום?</p>
        </div>
      </header>

      <button type="button" className="path-card" onClick={() => nav.go(next ? { name: 'session', id: next.id } : { name: 'path' })}>
        <span className="path-card__label">{next ? `המפגש הבא · ${next.n} מתוך 6` : 'סיימת את כל המפגשים! 🎉'}</span>
        <span className="path-card__title">{next ? next.title : 'אפשר לחזור על כל מפגש או לעשות מבחן לדוגמה'}</span>
        <span className="path-card__bar"><span style={{ width: `${(doneCount / 6) * 100}%` }} /></span>
        <span className="path-card__go">{next ? 'להמשיך במסלול ←' : 'למסלול ←'}</span>
      </button>
      <button type="button" className="link-btn" onClick={() => nav.go({ name: 'path' })}>לכל המסלול</button>

      <div className="worlds">
        <button type="button" className="world world--purple" onClick={() => nav.go({ name: 'letters' })}>
          <span className="world__art" dir="ltr" lang="en">Aa Bb</span>
          <span className="world__name">עולם האותיות</span>
          <span className="world__en" dir="ltr">A–P</span>
        </button>
        <button type="button" className="world world--teal" onClick={() => nav.go({ name: 'numbers' })}>
          <span className="world__art" dir="ltr">1 2 3</span>
          <span className="world__name">עולם המספרים</span>
          <span className="world__en" dir="ltr">1–20</span>
        </button>
        <button type="button" className="world world--pink" onClick={() => nav.go({ name: 'colors' })}>
          <span className="world__art world__art--dots" aria-hidden><i style={{ background: '#2f7de1' }} /><i style={{ background: '#ffd23f' }} /><i style={{ background: '#2fb457' }} /></span>
          <span className="world__name">עולם הצבעים</span>
          <span className="world__en" dir="ltr">Colors</span>
        </button>
        <button type="button" className="world world--yellow" onClick={() => nav.go({ name: 'words' })}>
          <span className="world__art"><Picture id="cat" size={54} /></span>
          <span className="world__name">עולם המילים</span>
          <span className="world__en" dir="ltr">My First Words</span>
        </button>
      </div>

      <div className="home__wide">
        <button type="button" className="wide-card wide-card--lab" onClick={() => nav.go({ name: 'lab' })}>
          <span className="wide-card__icon" aria-hidden>🎧</span>
          <span><b>מעבדת הקשבה</b><small dir="ltr" lang="en">Listening Lab</small></span>
        </button>
        <button type="button" className="wide-card wide-card--exam" onClick={() => nav.go({ name: 'exam' })}>
          <span className="wide-card__icon" aria-hidden>📝</span>
          <span><b>מבחן לדוגמה</b><small>כמו במבחן בכיתה</small></span>
        </button>
      </div>

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
      onContextMenu={(e) => e.preventDefault()}>
      <IconLock /> אזור הורים <small>(לחיצה ארוכה)</small>
    </button>
  );
}
