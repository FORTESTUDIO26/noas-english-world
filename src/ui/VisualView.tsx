import type { Visual } from '../learn/questions.ts';
import { color } from '../content/colors.ts';
import { Picture } from '../art/pictures.tsx';
import { IconSpeaker } from './icons.tsx';

/** Renders one question visual. Never shows English names for colours/pictures (that would give answers away). */
export function VisualView({ v, size = 'm' }: { v: Visual; size?: 's' | 'm' | 'l' }) {
  switch (v.t) {
    case 'letter':
      return <span className={`vis-letter vis-letter--${size}`} dir="ltr" lang="en">{v.text}</span>;
    case 'number':
      return <span className={`vis-number vis-number--${size}`} dir="ltr">{v.n}</span>;
    case 'word':
      return <span className={`vis-word vis-word--${size}`} dir="ltr" lang="en">{v.text}</span>;
    case 'color': {
      const c = color(v.id);
      return <span className={`vis-swatch ${v.id === 'white' ? 'vis-swatch--white' : ''}`} style={{ background: c.hex }} aria-label="צבע" />;
    }
    case 'thing': {
      const c = color(v.id);
      return <span className="vis-thing"><Picture id={c.thing} size="100%" /></span>;
    }
    case 'picture':
      return <span className={`vis-picture vis-picture--${size}`}><Picture id={v.id} size="100%" /></span>;
    case 'count':
      return (
        <span className="vis-count" aria-label="כמה יש?">
          {Array.from({ length: Math.ceil(v.n / 5) }).map((_, row) => (
            <span key={row} className="vis-count__row">
              {Array.from({ length: Math.min(5, v.n - row * 5) }).map((__, i) => (
                <span key={i} className="vis-count__item"><Picture id={v.thing} size="100%" /></span>
              ))}
            </span>
          ))}
        </span>
      );
    case 'seq':
      return (
        <span className="vis-seq" dir="ltr" lang="en">
          {v.items.map((x, i) => <span key={i} className={`vis-seq__cell ${x === null ? 'is-gap' : ''}`}>{x ?? '?'}</span>)}
        </span>
      );
    case 'gap':
      return (
        <span className="vis-seq vis-seq--word" dir="ltr" lang="en">
          {[...v.word].map((ch, i) => <span key={i} className={`vis-seq__cell ${i === v.gap ? 'is-gap' : ''}`}>{i === v.gap ? '?' : ch}</span>)}
        </span>
      );
    case 'audio':
      return <span className="vis-audio"><IconSpeaker size={40} /></span>;
  }
}
