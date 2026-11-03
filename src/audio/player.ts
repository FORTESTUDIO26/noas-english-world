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
import { getRecording } from './recordings.ts';

export type PlayResult = 'file' | 'recording' | 'device-voice' | 'missing' | 'blocked' | 'stopped';

const TEXT = new Map(buildTtsClips().map((c) => [c.id, c.text]));
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
      src.connect(ctx.destination);
      src.onended = () => resolve();
      this.current = src;
      src.start(0);
    });
  }

  private speak(text: string, slow: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof speechSynthesis === 'undefined') return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      const voice = speechSynthesis.getVoices().find((v) => v.lang === 'en-US') ?? speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'));
      if (voice) u.voice = voice;
      u.rate = slow ? 0.7 : 0.95;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      speechSynthesis.speak(u);
    });
  }

  /** Play one clip. Resolves when it finishes (or is interrupted). */
  async play(id: string, opts: { slow?: boolean } = {}): Promise<PlayResult> {
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

  /** Play several clips one after another, e.g. instruction + "Now color …". */
  async playSequence(ids: string[], opts: { slow?: boolean; gapMs?: number } = {}): Promise<PlayResult> {
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
      if (rec) {
        const buf = await this.decode(await rec.blob.arrayBuffer());
        if (buf && my === this.token) {
          await this.playBuffer(buf, slow ? 0.85 : 1);
          return 'recording';
        }
      }
      const buf = await this.load(BASE + phonemePath(sound));
      if (!buf) return 'missing';
      if (my !== this.token) return 'stopped';
      // A phonics sound is short; "slow" simply repeats it with a pause.
      await this.playBuffer(buf);
      if (slow && my === this.token) {
        await new Promise((r) => setTimeout(r, 450));
        if (my === this.token) await this.playBuffer(buf);
      }
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

export const audio = new AudioEngine();

/** Install global unlock listeners once (Safari needs a gesture after every reload). */
export function installAudioUnlock() {
  const opts = { capture: true, passive: true } as const;
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) {
    window.addEventListener(ev, audio.unlock, opts);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') audio.stop();
  });
}

export { clipId };
