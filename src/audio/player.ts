// Audio engine. Plays recorded files through the Web Audio API, which is the
// most reliable path on iPhone Safari once it has been unlocked by a touch.
// Rules:
//  - Safari only allows sound after a user gesture, so unlock() runs on every
//    touch/click (cheap) and also recovers from the "interrupted" state iOS
//    uses after the app was in the background.
//  - Slow speed uses separately recorded slow files (no pitch distortion).
//  - Phonics sounds never fall back to the device voice: a speech engine
//    cannot say an isolated sound reliably. If a sound is missing, the
//    caller gets 'missing' and the UI says so honestly.

import { buildTtsClips, ttsPath, phonemePath, clipId } from './clips.ts';
import { getRecording, recordingIsCurrent } from './recordings.ts';
import heClips from './he-clips.json';

export type PlayResult = 'file' | 'recording' | 'device-voice' | 'missing' | 'blocked' | 'stopped';

const TEXT = new Map<string, string>([...buildTtsClips().map((c) => [c.id, c.text] as [string, string]), ...Object.entries(heClips as Record<string, string>)]);
/** Target loudness: every clip is played at about the same level. */
const TARGET_RMS = 0.09;
const gainCache = new WeakMap<AudioBuffer, number>();
function levelGain(buf: AudioBuffer): number {
  let g = gainCache.get(buf);
  if (g !== undefined) return g;
  const d = buf.getChannelData(0);
  let e = 0, n = 0, pk = 0;
  for (let i = 0; i < d.length; i += 4) {
    const a = Math.abs(d[i]);
    if (a > pk) pk = a;
    if (a > 0.01) { e += d[i] * d[i]; n++; } // ignore silence
  }
  const rms = n ? Math.sqrt(e / n) : 0;
  g = rms ? Math.min(TARGET_RMS / rms, 0.98 / (pk || 1), 3) : 1;
  gainCache.set(buf, g);
  return g;
}
const BASE = import.meta.env.BASE_URL;

type Listener = (playingId: string | null) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private current: AudioBufferSourceNode | null = null;
  private token = 0;
  private listeners = new Set<Listener>();
  private playingId: string | null = null;
  /** Last result per clip, shown in the parents' sound check. */
  readonly lastResult = new Map<string, PlayResult>();

  get unlocked() {
    return this.ctx?.state === 'running';
  }

  unlock = () => {
    playAsMedia();
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state !== 'running') {
        void this.ctx.resume();
        // A one-sample silent buffer completes the unlock on older iOS.
        const b = this.ctx.createBuffer(1, 1, 22050);
        const s = this.ctx.createBufferSource();
        s.buffer = b;
        s.connect(this.ctx.destination);
        s.start(0);
      }
    } catch {
      /* no audio support */
    }
  };

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private setPlaying(id: string | null) {
    this.playingId = id;
    this.listeners.forEach((l) => l(id));
  }

  private load(url: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(url);
    if (!p) {
      p = (async () => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const data = await res.arrayBuffer();
          return await this.decode(data);
        } catch {
          return null;
        }
      })();
      this.buffers.set(url, p);
      // Don't cache failures forever (e.g. offline before install).
      p.then((b) => { if (!b) this.buffers.delete(url); });
    }
    return p;
  }

  private decode(data: ArrayBuffer): Promise<AudioBuffer | null> {
    const ctx = this.ensureCtx();
    if (!ctx) return Promise.resolve(null);
    // Callback form for older Safari.
    return new Promise((resolve) => {
      try {
        const r = ctx.decodeAudioData(data, (b) => resolve(b), () => resolve(null));
        if (r && typeof r.then === 'function') r.then(resolve, () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  }

  private ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    return this.ctx;
  }

  /** Fetch + decode ahead of time so the first tap plays instantly. */
  preload(ids: string[], slow = false) {
    for (const id of ids) {
      if (id.startsWith('sound-')) void this.load(BASE + phonemePath(id.slice(6)));
      else void this.load(BASE + ttsPath(id, slow));
    }
  }

  stop() {
    this.token++;
    try { this.current?.stop(); } catch { /* already stopped */ }
    this.current = null;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    this.setPlaying(null);
  }

  private playBuffer(buf: AudioBuffer, rate = 1): Promise<void> {
    const ctx = this.ctx!;
    return new Promise((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      const gain = ctx.createGain();
      gain.gain.value = levelGain(buf);
      src.connect(gain).connect(ctx.destination);
      src.onended = () => resolve();
      this.current = src;
      src.start(0);
    });
  }

  private speak(text: string, slow: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof speechSynthesis === 'undefined') return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      const he = /[֐-׿]/.test(text);
      u.lang = he ? 'he-IL' : 'en-US';
      const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-') === u.lang) ?? speechSynthesis.getVoices().find((v) => v.lang.startsWith(he ? 'he' : 'en'));
      if (voice) u.voice = voice;
      u.rate = slow ? 0.7 : 0.95;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      speechSynthesis.speak(u);
    });
  }

  /** Play one clip. Resolves when it finishes (or is interrupted). */
  play(id: string, opts: { slow?: boolean } = {}): Promise<PlayResult> {
    const p = this.playInner(id, opts);
    this.idle = p.then(() => undefined, () => undefined);
    return p;
  }

  private async playInner(id: string, opts: { slow?: boolean } = {}): Promise<PlayResult> {
    this.stop();
    const my = this.token;
    this.unlock();
    if (!this.ctx) return 'blocked';
    this.setPlaying(id);
    const result = await this.playOne(id, !!opts.slow, my);
    if (my === this.token) this.setPlaying(null);
    this.lastResult.set(id, result);
    return result;
  }

  private idle: Promise<void> = Promise.resolve();

  /**
   * Automatic messages (feedback, an instruction after an answer) wait for the
   * current sound to finish instead of cutting it. A tap by the child, a new
   * question or leaving the screen still stops everything (stop()).
   */
  async enqueue(ids: string[], opts: { slow?: boolean; gapMs?: number } = {}): Promise<PlayResult> {
    const my = this.token;
    await this.idle;
    if (my !== this.token) return 'stopped';
    return this.playSequence(ids, opts);
  }

  /** Play several clips one after another, e.g. Hebrew part + English word + Hebrew part. */
  playSequence(ids: string[], opts: { slow?: boolean; gapMs?: number } = {}): Promise<PlayResult> {
    const p = this.sequenceInner(ids, opts);
    this.idle = p.then(() => undefined, () => undefined);
    return p;
  }

  private async sequenceInner(ids: string[], opts: { slow?: boolean; gapMs?: number } = {}): Promise<PlayResult> {
    this.stop();
    const my = this.token;
    this.unlock();
    if (!this.ctx) return 'blocked';
    let last: PlayResult = 'file';
    for (let i = 0; i < ids.length; i++) {
      if (my !== this.token) return 'stopped';
      this.setPlaying(ids[i]);
      last = await this.playOne(ids[i], !!opts.slow, my);
      if (i < ids.length - 1) await new Promise((r) => setTimeout(r, opts.gapMs ?? 350));
    }
    if (my === this.token) this.setPlaying(null);
    return last;
  }

  private async playOne(id: string, slow: boolean, my: number): Promise<PlayResult> {
    if (this.ctx && this.ctx.state !== 'running') {
      // Without a prior touch Safari keeps resume() pending: don't hang, report 'blocked'.
      try { await Promise.race([this.ctx.resume(), new Promise((r) => setTimeout(r, 400))]); } catch { /* ignore */ }
      if ((this.ctx.state as string) !== 'running') return 'blocked';
    }
    if (id.startsWith('sound-')) {
      const sound = id.slice(6);
      const rec = await getRecording(id);
      // Recordings made for an older version of the phonics sounds are kept but not used.
      if (rec && recordingIsCurrent(rec)) {
        const buf = await this.decode(await rec.blob.arrayBuffer());
        if (buf && my === this.token) {
          // phonics sounds are never slowed down (that would distort them)
          await this.playBuffer(buf);
          return 'recording';
        }
      }
      const buf = await this.load(BASE + phonemePath(sound));
      if (!buf) return 'missing';
      if (my !== this.token) return 'stopped';
      // Phonics sounds are never slowed down (that would distort them). Short
      // sounds are already presented three times in the file: "b · b · b".
      await this.playBuffer(buf);
      return 'file';
    }
    const buf = (await this.load(BASE + ttsPath(id, slow))) ?? (slow ? await this.load(BASE + ttsPath(id)) : null);
    if (my !== this.token) return 'stopped';
    if (buf) {
      await this.playBuffer(buf);
      return 'file';
    }
    const text = TEXT.get(id);
    if (text && (await this.speak(text, slow))) return 'device-voice';
    return 'missing';
  }

  isPlaying(id: string) {
    return this.playingId === id;
  }
}

// ---------------------------------------------------------------- iPhone silent switch
// On iPhone, Web Audio is treated like a ringtone/game sound and is MUTED when
// the side silent switch is on – even at full volume. Two fixes:
//  1. Safari 16.4+/iOS 17: navigator.audioSession.type = 'playback' (media sound).
//  2. Older iOS: a silent <audio> element playing in a loop puts the page in
//     "media playback" mode, so Web Audio is heard like a video's sound.
const SILENT_WAV = 'data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // 0.1 s of silence
let mediaEl: HTMLAudioElement | null = null;

const isAppleMobile = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function playAsMedia() {
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
    if (session || !isAppleMobile()) return;
    if (!mediaEl) {
      mediaEl = new Audio(SILENT_WAV);
      mediaEl.loop = true;
      mediaEl.setAttribute('playsinline', '');
      mediaEl.setAttribute('x-webkit-airplay', 'deny');
    }
    if (mediaEl.paused && document.visibilityState === 'visible') void mediaEl.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

function pauseMedia() {
  try { mediaEl?.pause(); } catch { /* ignore */ }
}

export const audio = new AudioEngine();

/** Install global unlock listeners once (Safari needs a gesture after every reload). */
export function installAudioUnlock() {
  const opts = { capture: true, passive: true } as const;
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) {
    window.addEventListener(ev, audio.unlock, opts);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      audio.stop();
      pauseMedia();
    }
  });
}

export { clipId };
