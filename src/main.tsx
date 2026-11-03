import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.tsx';
import { setupPwa } from './pwa.ts';
import { installAudioUnlock, audio } from './audio/player.ts';

installAudioUnlock();
// Exposed for automated checks of the sound engine (dev build only).
if (import.meta.env.DEV) (window as unknown as { __audio: typeof audio }).__audio = audio;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support + install prompt + safe updates (see src/pwa.ts).
setupPwa();
