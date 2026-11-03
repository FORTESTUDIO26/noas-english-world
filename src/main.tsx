import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.tsx';
import { installAudioUnlock, audio } from './audio/player.ts';

installAudioUnlock();
// Exposed for automated checks of the sound engine (dev build only).
if (import.meta.env.DEV) (window as unknown as { __audio: typeof audio }).__audio = audio;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support: the service worker (generated at build time with the full
// file list, incl. every audio clip) caches the whole app after first load.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
