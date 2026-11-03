import { useEffect, useState } from 'react';
import { T } from '../text/he.ts';
import { applyUpdate, onUpdate } from '../pwa.ts';

/** Shown when a new version finished downloading. The switch happens only when the user taps. */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  useEffect(() => onUpdate((s) => setReady(s === 'ready')), []);
  if (!ready) return null;
  return (
    <div className="update-banner" role="status">
      <span>{T.update.ready}</span>
      <button type="button" className="btn btn--small btn--primary" onClick={applyUpdate}>{T.update.reload}</button>
    </div>
  );
}
