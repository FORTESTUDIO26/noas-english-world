import { useEffect, useRef, useState } from 'react';
import { T, BRAND } from '../text/he.ts';
import { appUrl, canPromptInstall, isAndroid, isIOS, isIOSNotSafari, isStandalone, onInstallChange, promptInstall } from '../pwa.ts';
import { Screen } from '../ui/Screen.tsx';
import { Guide } from '../art/Guide.tsx';

// ------------------------------------------------------------------ share

export function shareMessage(url: string) {
  return `${T.share.message}\n${url}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function ShareScreen() {
  const url = appUrl();
  const [copied, setCopied] = useState<null | boolean>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const canNative = typeof navigator.share === 'function';

  return (
    <Screen title={T.share.title} tone="pink" noSlow>
      <div className="intro">
        <Guide size={110} mood="cheer" />
        <p>{T.share.lead}</p>
        {!url ? (
          <p className="warn">{T.share.noUrl}</p>
        ) : (
          <>
            <blockquote className="share-preview">{shareMessage(url)}</blockquote>
            <div className="share-actions">
              {canNative && (
                <button type="button" className="btn btn--primary" onClick={() => {
                  navigator.share({ title: BRAND.name, text: T.share.message, url }).catch(() => {});
                }}>{T.share.native}</button>
              )}
              <a className="btn btn--whatsapp" href={`https://wa.me/?text=${encodeURIComponent(shareMessage(url))}`} target="_blank" rel="noopener noreferrer">
                {T.share.whatsapp}
              </a>
              <button type="button" className="btn btn--ghost" onClick={async () => setCopied(await copyText(url))}>
                {T.share.copy}
              </button>
            </div>
            {copied === true && <p className="ok" role="status">{T.share.copied}</p>}
            {copied === false && (
              <div role="status">
                <p className="warn">{T.share.copyFailed}</p>
                <input ref={linkRef} className="link-field" dir="ltr" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
              </div>
            )}
          </>
        )}
      </div>
    </Screen>
  );
}

// ------------------------------------------------------------------ install help

export function InstallScreen() {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall());
  useEffect(() => onInstallChange(() => setCanPrompt(canPromptInstall())), []);
  const ios = isIOS();
  const android = isAndroid();
  const sections = [
    { key: 'android', title: T.install.android, steps: T.install.androidSteps, first: android },
    { key: 'ios', title: T.install.ios, steps: T.install.iosSteps, first: ios },
    { key: 'desktop', title: T.install.desktop, steps: T.install.desktopSteps, first: !ios && !android },
  ].sort((a, b) => Number(b.first) - Number(a.first));

  return (
    <Screen title={T.install.title} tone="teal" noSlow>
      <div className="install">
        <p className="lead">{T.install.lead}</p>
        {isStandalone() && <p className="ok">{T.install.installed}</p>}
        {/* A real install button only where the browser actually offers it (never on iOS). */}
        {!isStandalone() && canPrompt && (
          <button type="button" className="btn btn--primary btn--wide" onClick={() => void promptInstall()}>{T.install.button}</button>
        )}
        {sections.map((s) => (
          <details key={s.key} className="install__card" open={s.first}>
            <summary>{s.title}</summary>
            {s.key === 'ios' && isIOSNotSafari() && <p className="warn">{T.install.iosOtherBrowser}</p>}
            <ol>{s.steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
          </details>
        ))}
        <p className="hint">{T.install.offline}</p>
      </div>
    </Screen>
  );
}
