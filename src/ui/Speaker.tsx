import { useEffect, useState, type ReactNode } from 'react';
import { T } from '../text/he.ts';
import { audio, type PlayResult } from '../audio/player.ts';
import { IconSpeaker, IconTurtle } from './icons.tsx';

export function usePlaying(ids: string[]) {
  const [on, setOn] = useState(false);
  const key = ids.join('|');
  useEffect(() => audio.subscribe((id) => setOn(id !== null && key.split('|').includes(id))), [key]);
  return on;
}

export function playClips(ids: string[], slow = false, gapMs?: number): Promise<PlayResult> {
  return ids.length === 1 ? audio.play(ids[0], { slow }) : audio.playSequence(ids, { slow, gapMs });
}

/** Big round speaker button, optionally with a label and a slow (turtle) twin. */
export function Speaker({ clips, label, size = 'm', withSlow = false, className = '', children, gapMs }: {
  clips: string[];
  label?: string;
  size?: 's' | 'm' | 'l';
  withSlow?: boolean;
  className?: string;
  children?: ReactNode;
  /** pause between clips when several are played */
  gapMs?: number;
}) {
  const playing = usePlaying(clips);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (slow: boolean) => {
    setMsg(null);
    const r = await playClips(clips, slow, gapMs);
    if (r === 'missing') setMsg(T.audio.missing);
    if (r === 'blocked') setMsg(T.audio.blocked);
  };
  return (
    <span className={`speaker-wrap ${className}`}>
      <button type="button" className={`speaker speaker--${size} ${playing ? 'is-playing' : ''}`} onClick={() => void run(false)} aria-label={label ?? T.common.play}>
        <IconSpeaker size={size === 'l' ? 34 : size === 'm' ? 26 : 20} />
        {label && <span className="speaker__label">{label}</span>}
        {children}
      </button>
      {withSlow && (
        <button type="button" className="speaker speaker--slow" onClick={() => void run(true)} aria-label={T.common.playSlow}>
          <IconTurtle size={size === 's' ? 20 : 26} />
        </button>
      )}
      {msg && <span className="speaker__msg" role="status">{msg}</span>}
    </span>
  );
}
