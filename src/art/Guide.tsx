// "פיפי" – the guide owl that walks Noa through the app.
export type Mood = 'happy' | 'cheer' | 'think' | 'oops';

export function Guide({ size = 120, mood = 'happy' }: { size?: number; mood?: Mood }) {
  const INK = '#33203f';
  const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 120 130" width={size} height={size * 1.08} aria-hidden className={`guide guide--${mood}`}>
      {/* wings */}
      <path className="guide__wing guide__wing--l" d="M22 70 C6 76 6 100 22 106 C26 96 28 82 22 70 Z" fill="#7b3fb5" {...S} />
      <path className="guide__wing guide__wing--r" d="M98 70 C114 76 114 100 98 106 C94 96 92 82 98 70 Z" fill="#7b3fb5" {...S} />
      {/* body */}
      <path d="M60 22 C30 22 18 46 18 76 C18 106 36 122 60 122 C84 122 102 106 102 76 C102 46 90 22 60 22 Z" fill="#9b5de5" {...S} />
      <path d="M60 64 C44 64 36 80 36 94 C36 110 46 118 60 118 C74 118 84 110 84 94 C84 80 76 64 60 64 Z" fill="#ffd6ec" stroke="none" />
      <path d="M48 86 Q52 90 56 86 M64 86 Q68 90 72 86 M54 98 Q58 102 62 98 M44 102 Q48 106 52 102 M66 102 Q70 106 74 102" fill="none" stroke="#ff72b6" strokeWidth={2} strokeLinecap="round" />
      {/* ear tufts */}
      <path d="M30 34 L24 12 L44 26 Z M90 34 L96 12 L76 26 Z" fill="#9b5de5" {...S} />
      {/* eyes */}
      <circle cx="44" cy="50" r="15" fill="#fff" {...S} />
      <circle cx="76" cy="50" r="15" fill="#fff" {...S} />
      {mood === 'cheer' ? (
        <>
          <path d="M36 52 Q44 42 52 52" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
          <path d="M68 52 Q76 42 84 52" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle className="guide__pupil" cx={mood === 'think' ? 48 : 45} cy={mood === 'think' ? 46 : 51} r="6.5" fill={INK} />
          <circle className="guide__pupil" cx={mood === 'think' ? 80 : 75} cy={mood === 'think' ? 46 : 51} r="6.5" fill={INK} />
          <circle cx={mood === 'think' ? 50 : 47} cy={mood === 'think' ? 44 : 49} r="2" fill="#fff" />
          <circle cx={mood === 'think' ? 82 : 77} cy={mood === 'think' ? 44 : 49} r="2" fill="#fff" />
        </>
      )}
      {/* beak */}
      <path d="M54 62 L66 62 L60 74 Z" fill="#ffb02e" {...S} strokeWidth={2.5} />
      {/* cheeks */}
      <ellipse cx="32" cy="66" rx="6" ry="4" fill="#ff72b6" opacity="0.55" />
      <ellipse cx="88" cy="66" rx="6" ry="4" fill="#ff72b6" opacity="0.55" />
      {mood === 'oops' && <path d="M96 30 C100 36 100 40 96 42 C92 40 92 36 96 30 Z" fill="#4fb3ff" stroke={INK} strokeWidth={1.5} />}
      {/* feet */}
      <path d="M46 120 L42 128 M50 120 L50 128 M70 120 L70 128 M74 120 L78 128" stroke="#ffb02e" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

export const GUIDE_NAME = 'פיפי';
