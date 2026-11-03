// PWA helpers: public address for sharing, install prompt, service-worker updates.

/**
 * The permanent public address. Set at build time (VITE_APP_URL in Vercel /
 * .env.production). Without it, the current address is used only when it is a
 * real https site – never localhost or a temporary preview.
 */
export function appUrl(): string | null {
  const fixed = import.meta.env.VITE_APP_URL as string | undefined;
  if (fixed) return fixed;
  const { protocol, hostname, origin, pathname } = location;
  if (protocol !== 'https:' || hostname === 'localhost') return null;
  return origin + pathname.replace(/index\.html$/, '');
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isAndroid = () => /Android/i.test(navigator.userAgent);

/** iOS browsers other than Safari (Chrome/Firefox/Edge on iPhone). */
export const isIOSNotSafari = () => isIOS() && /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);

// ---------------------------------------------------------------- install prompt (Chrome / Edge / Samsung Internet)

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

export function canPromptInstall() {
  return deferred !== null;
}

export function onInstallChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  listeners.forEach((l) => l());
  await e.prompt();
  const choice = await e.userChoice;
  return choice.outcome === 'accepted';
}

// ---------------------------------------------------------------- service worker updates

type UpdateState = 'none' | 'ready';
let updateState: UpdateState = 'none';
let waiting: ServiceWorker | null = null;
/** true only after the user pressed "update" – the first install never reloads the page. */
let userAskedUpdate = false;
const updListeners = new Set<(s: UpdateState) => void>();

export function onUpdate(fn: (s: UpdateState) => void) {
  updListeners.add(fn);
  fn(updateState);
  return () => void updListeners.delete(fn);
}

function setWaiting(w: ServiceWorker) {
  waiting = w;
  updateState = 'ready';
  updListeners.forEach((l) => l(updateState));
}

/** Switch to the new version (the user pressed "update"). */
export function applyUpdate() {
  userAskedUpdate = true;
  if (!waiting) { location.reload(); return; }
  waiting.postMessage('SKIP_WAITING');
}

export function setupPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });

  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      // A new version is downloaded in the background. It waits until the
      // user chooses to update, so a lesson in progress is never broken.
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) setWaiting(nw);
        });
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading || !userAskedUpdate) return;
        reloading = true;
        location.reload();
      });
      // Check for updates when the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update().catch(() => {});
      });
    } catch { /* offline or unsupported */ }
  });
}
