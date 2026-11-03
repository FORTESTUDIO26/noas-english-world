import type { ReactNode } from 'react';
import { T } from '../text/he.ts';
import { useNav } from '../state/nav.tsx';
import { useStore } from '../state/store.tsx';
import { IconBack, IconHome, IconTurtle } from './icons.tsx';

/** Page frame: back + home buttons, title, slow-speech toggle. */
export function Screen({ title, en, children, tone = 'purple', onBack, noSlow }: {
  title: string;
  en?: string;
  children: ReactNode;
  tone?: 'purple' | 'pink' | 'teal' | 'yellow' | 'blue';
  onBack?: () => void;
  noSlow?: boolean;
}) {
  const nav = useNav();
  const { save, setSlow } = useStore();
  return (
    <div className={`screen screen--${tone}`}>
      <header className="topbar">
        <button type="button" className="btn btn--icon" onClick={onBack ?? nav.back} aria-label={T.common.back}><IconBack /></button>
        <h1 className="topbar__title">
          {title}
          {en && <span className="topbar__en" dir="ltr" lang="en">{en}</span>}
        </h1>
        {!noSlow && (
          <button type="button" className={`btn btn--icon btn--toggle ${save.settings.slow ? 'is-on' : ''}`} onClick={() => setSlow(!save.settings.slow)} aria-pressed={save.settings.slow} aria-label={T.common.slowSpeech} title={T.common.slowSpeech}>
            <IconTurtle />
          </button>
        )}
        <button type="button" className="btn btn--icon" onClick={nav.home} aria-label={T.common.home}><IconHome /></button>
      </header>
      <main className="screen__body">{children}</main>
    </div>
  );
}
