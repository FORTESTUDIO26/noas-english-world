// Hand-made SVG illustrations, one consistent style: thick dark outline,
// flat bright fills, 100x100 viewBox. Objects that can be coloured in the
// colouring tasks take a `paint` colour for their main part.
import type { ReactNode } from 'react';

const INK = '#33203f';
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

type Draw = (paint?: string) => ReactNode;

const P: Record<string, Draw> = {
  apple: () => (
    <>
      <path d="M50 30 C35 20 14 28 16 52 C18 76 34 90 50 84 C66 90 82 76 84 52 C86 28 65 20 50 30 Z" fill="#ef3e4a" {...S} />
      <path d="M50 30 C50 22 52 16 56 12" fill="none" {...S} />
      <path d="M54 22 C62 12 74 14 76 16 C70 24 62 26 54 22 Z" fill="#2fb457" {...S} />
      <ellipse cx="34" cy="46" rx="5" ry="9" fill="#fff" opacity="0.55" />
    </>
  ),
  ball: (paint = '#2f7de1') => (
    <>
      <circle cx="50" cy="52" r="34" fill={paint} {...S} />
      <path d="M18 44 C36 54 64 54 82 44" fill="none" {...S} />
      <path d="M22 66 C40 60 60 60 78 66" fill="none" {...S} />
      <path d="M50 18 C40 36 40 68 50 86" fill="none" {...S} />
      <ellipse cx="36" cy="34" rx="7" ry="4" fill="#fff" opacity="0.6" transform="rotate(-30 36 34)" />
    </>
  ),
  cat: (paint = '#ff9d3b') => (
    <>
      <path d="M70 80 C88 78 92 62 84 54" fill="none" {...S} strokeWidth={6} stroke={INK} />
      <path d="M70 80 C88 78 92 62 84 54" fill="none" strokeWidth={2.5} stroke={paint} strokeLinecap="round" />
      <ellipse cx="54" cy="70" rx="22" ry="16" fill={paint} {...S} />
      <path d="M22 22 L28 40 L40 32 Z M62 22 L56 40 L44 32 Z" fill={paint} {...S} />
      <circle cx="42" cy="46" r="20" fill={paint} {...S} />
      <circle cx="35" cy="44" r="3" fill={INK} />
      <circle cx="49" cy="44" r="3" fill={INK} />
      <path d="M40 51 L44 51 L42 54 Z" fill="#ff6fae" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M42 54 C40 58 36 58 35 56 M42 54 C44 58 48 58 49 56" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d="M30 52 L18 50 M30 55 L19 58 M54 52 L66 50 M54 55 L65 58" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    </>
  ),
  dog: (paint = '#c98a4b') => (
    <>
      <ellipse cx="58" cy="70" rx="24" ry="15" fill={paint} {...S} />
      <path d="M80 64 C90 58 92 50 88 46" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <rect x="40" y="76" width="8" height="12" rx="3" fill={paint} {...S} />
      <rect x="66" y="76" width="8" height="12" rx="3" fill={paint} {...S} />
      <circle cx="40" cy="44" r="20" fill={paint} {...S} />
      <path d="M22 34 C14 40 14 58 22 60 C28 56 28 42 24 34 Z" fill="#6b3f1d" {...S} />
      <path d="M58 34 C66 40 66 58 58 60 C52 56 52 42 56 34 Z" fill="#6b3f1d" {...S} />
      <circle cx="33" cy="42" r="3" fill={INK} />
      <circle cx="47" cy="42" r="3" fill={INK} />
      <ellipse cx="40" cy="52" rx="5" ry="3.5" fill={INK} />
      <path d="M40 55 L40 59 M34 59 C37 62 43 62 46 59" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  egg: () => (
    <>
      <path d="M50 14 C30 14 20 46 20 60 C20 78 33 88 50 88 C67 88 80 78 80 60 C80 46 70 14 50 14 Z" fill="#fff7e6" {...S} />
      <ellipse cx="38" cy="40" rx="5" ry="10" fill="#fff" />
    </>
  ),
  fish: () => (
    <>
      <path d="M70 50 L90 32 L90 68 Z" fill="#ffb02e" {...S} />
      <ellipse cx="46" cy="50" rx="30" ry="20" fill="#ff8a1f" {...S} />
      <path d="M44 32 C50 40 50 60 44 68" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx="28" cy="46" r="4" fill={INK} />
      <path d="M18 56 C22 58 24 58 26 56" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <circle cx="12" cy="30" r="3" fill="none" stroke="#2f7de1" strokeWidth={2} />
      <circle cx="18" cy="20" r="4" fill="none" stroke="#2f7de1" strokeWidth={2} />
    </>
  ),
  goat: () => (
    <>
      <ellipse cx="60" cy="66" rx="24" ry="14" fill="#f2efe9" {...S} />
      <rect x="44" y="74" width="7" height="16" rx="3" fill="#f2efe9" {...S} />
      <rect x="70" y="74" width="7" height="16" rx="3" fill="#f2efe9" {...S} />
      <path d="M28 26 C22 14 30 8 34 14 M42 26 C42 14 50 10 52 16" fill="none" stroke="#8a5a2e" strokeWidth={4} strokeLinecap="round" />
      <path d="M22 30 C20 40 24 60 34 62 C44 60 48 40 46 30 C44 22 24 22 22 30 Z" fill="#f2efe9" {...S} />
      <path d="M22 32 L10 36 L20 40 Z M46 32 L58 36 L48 40 Z" fill="#f2efe9" {...S} />
      <circle cx="29" cy="38" r="2.6" fill={INK} />
      <circle cx="40" cy="38" r="2.6" fill={INK} />
      <ellipse cx="34" cy="54" rx="5" ry="3" fill="#ffb3c7" stroke={INK} strokeWidth={1.8} />
      <path d="M30 62 C32 72 36 72 38 62" fill="#e7e2d8" {...S} strokeWidth={2.4} />
    </>
  ),
  hat: (paint = '#8e44c9') => (
    <>
      <ellipse cx="50" cy="70" rx="42" ry="12" fill={paint} {...S} />
      <path d="M26 68 C26 40 32 28 50 28 C68 28 74 40 74 68 Z" fill={paint} {...S} />
      <path d="M27 58 C42 64 58 64 73 58 L74 66 C58 72 42 72 26 66 Z" fill="#ffd23f" {...S} strokeWidth={2.5} />
      <path d="M38 40 C40 34 44 32 48 32" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity="0.6" />
    </>
  ),
  igloo: () => (
    <>
      <path d="M10 80 C10 40 30 24 50 24 C70 24 90 40 90 80 Z" fill="#e8f6ff" {...S} />
      <path d="M38 80 C38 62 44 56 50 56 C56 56 62 62 62 80 Z" fill="#2f4a6b" {...S} />
      <path d="M14 64 L38 64 M62 64 L86 64 M20 48 L80 48 M30 36 L70 36 M36 24 L36 36 M64 24 L64 36 M28 48 L28 64 M50 36 L50 48 M72 48 L72 64" fill="none" stroke="#7fb3d9" strokeWidth={2} strokeLinecap="round" />
      <path d="M10 80 C10 40 30 24 50 24 C70 24 90 40 90 80 Z" fill="none" {...S} />
      <path d="M4 82 L96 82" {...S} />
    </>
  ),
  jam: () => (
    <>
      <rect x="26" y="22" width="48" height="14" rx="4" fill="#ff72b6" {...S} />
      <path d="M28 36 L72 36 L74 84 C74 88 70 90 66 90 L34 90 C30 90 26 88 26 84 Z" fill="#c4213f" {...S} />
      <rect x="32" y="52" width="36" height="22" rx="6" fill="#fff7e6" {...S} strokeWidth={2.5} />
      <path d="M44 60 C44 56 50 56 50 60 C50 56 56 56 56 60 C56 66 50 70 50 70 C50 70 44 66 44 60 Z" fill="#ef3e4a" stroke={INK} strokeWidth={1.8} />
      <path d="M30 22 L26 16 M50 22 L50 14 M70 22 L74 16" stroke="#ff72b6" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  kite: () => (
    <>
      <path d="M58 10 L84 36 L58 72 L32 36 Z" fill="#ffd23f" {...S} />
      <path d="M58 10 L58 72 M32 36 L84 36" stroke={INK} strokeWidth={2.5} />
      <path d="M58 10 L84 36 L58 36 Z" fill="#ff72b6" {...S} strokeWidth={2.5} />
      <path d="M58 36 L58 72 L32 36 Z" fill="#20c4c4" {...S} strokeWidth={2.5} />
      <path d="M58 72 C52 80 60 84 54 92 C50 96 40 94 30 96" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d="M52 82 L46 78 L48 86 Z M40 94 L34 90 L36 98 Z" fill="#8e44c9" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
    </>
  ),
  lemon: () => (
    <>
      <path d="M14 52 C14 30 34 20 50 20 C66 20 86 30 86 52 C86 72 68 82 50 82 C32 82 14 72 14 52 Z" fill="#ffe14d" {...S} />
      <path d="M14 52 L6 50 M86 52 L94 50" {...S} />
      <path d="M50 20 C58 10 70 12 72 14 C66 22 58 24 50 20 Z" fill="#2fb457" {...S} />
      <ellipse cx="34" cy="40" rx="8" ry="4" fill="#fff" opacity="0.6" transform="rotate(-20 34 40)" />
    </>
  ),
  moon: () => (
    <>
      <path d="M62 12 C40 14 24 32 24 52 C24 74 42 90 64 88 C48 80 40 66 40 50 C40 34 48 20 62 12 Z" fill="#ffd23f" {...S} />
      <path d="M76 26 L78 32 L84 34 L78 36 L76 42 L74 36 L68 34 L74 32 Z" fill="#ffd23f" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M80 62 L81 66 L85 67 L81 68 L80 72 L79 68 L75 67 L79 66 Z" fill="#ffd23f" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx="36" cy="48" r="3" fill="#e6b800" />
      <circle cx="40" cy="66" r="4" fill="#e6b800" />
    </>
  ),
  nest: () => (
    <>
      <ellipse cx="38" cy="54" rx="8" ry="10" fill="#bfe6ff" {...S} strokeWidth={2.5} />
      <ellipse cx="54" cy="52" rx="8" ry="10" fill="#bfe6ff" {...S} strokeWidth={2.5} />
      <ellipse cx="66" cy="56" rx="7" ry="9" fill="#bfe6ff" {...S} strokeWidth={2.5} />
      <path d="M12 58 C14 82 34 90 50 90 C66 90 86 82 88 58 C70 66 30 66 12 58 Z" fill="#a8743f" {...S} />
      <path d="M18 66 C36 74 64 74 82 66 M22 76 C40 82 60 82 78 76 M30 62 L38 72 M50 66 L44 80 M64 64 L70 78" fill="none" stroke="#6b3f1d" strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  octopus: () => (
    <>
      <path d="M22 70 C14 78 10 86 16 88 M34 72 C30 82 30 90 36 90 M50 72 C50 82 52 90 58 88 M64 72 C68 82 74 88 80 86 M76 68 C86 74 92 80 88 84" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M22 70 C14 78 10 86 16 88 M34 72 C30 82 30 90 36 90 M50 72 C50 82 52 90 58 88 M64 72 C68 82 74 88 80 86 M76 68 C86 74 92 80 88 84" fill="none" stroke="#b05fe0" strokeWidth={4} strokeLinecap="round" />
      <path d="M18 54 C18 28 32 12 50 12 C68 12 82 28 82 54 C82 70 68 76 50 76 C32 76 18 70 18 54 Z" fill="#b05fe0" {...S} />
      <circle cx="38" cy="46" r="7" fill="#fff" {...S} strokeWidth={2} />
      <circle cx="62" cy="46" r="7" fill="#fff" {...S} strokeWidth={2} />
      <circle cx="39" cy="47" r="3" fill={INK} />
      <circle cx="61" cy="47" r="3" fill={INK} />
      <path d="M42 60 C46 64 54 64 58 60" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
    </>
  ),
  pig: () => (
    <>
      <path d="M22 26 L30 42 L40 30 Z M78 26 L70 42 L60 30 Z" fill="#ff9cc4" {...S} />
      <circle cx="50" cy="54" r="32" fill="#ffb3d1" {...S} />
      <ellipse cx="50" cy="62" rx="13" ry="9" fill="#ff8ab8" {...S} />
      <ellipse cx="45" cy="62" rx="2.6" ry="3.4" fill={INK} />
      <ellipse cx="55" cy="62" rx="2.6" ry="3.4" fill={INK} />
      <circle cx="38" cy="46" r="3.4" fill={INK} />
      <circle cx="62" cy="46" r="3.4" fill={INK} />
      <path d="M42 76 C46 79 54 79 58 76" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
  banana: () => (
    <>
      <path d="M18 30 C20 64 46 86 84 76 C86 72 84 70 80 70 C52 74 32 56 28 28 Z" fill="#ffd23f" {...S} />
      <path d="M28 30 C34 56 50 68 78 70" fill="none" stroke="#e0a800" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M18 30 L16 20 L26 18 L28 28" fill="#7a5a1a" {...S} />
      <path d="M84 76 L90 76" {...S} />
    </>
  ),
  tap: () => (
    <>
      <rect x="10" y="22" width="12" height="30" rx="3" fill="#b8c2cc" {...S} />
      <path d="M22 30 L62 30 C72 30 76 36 76 46 L76 52 L62 52 L62 44 L22 44 Z" fill="#d6dde3" {...S} />
      <rect x="36" y="16" width="16" height="14" rx="3" fill="#b8c2cc" {...S} />
      <path d="M30 12 L58 12" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <rect x="60" y="52" width="18" height="6" rx="2" fill="#b8c2cc" {...S} strokeWidth={2.5} />
      <path d="M69 64 C64 72 64 78 69 80 C74 78 74 72 69 64 Z" fill="#4fb3ff" {...S} strokeWidth={2.5} />
      <path d="M69 86 C66 90 66 93 69 94 C72 93 72 90 69 86 Z" fill="#4fb3ff" stroke={INK} strokeWidth={2} />
    </>
  ),
  bag: (paint = '#20c4c4') => (
    <>
      <path d="M34 34 C34 16 66 16 66 34" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d="M34 34 C34 16 66 16 66 34" fill="none" stroke="#7a4b22" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M18 34 L82 34 L88 86 C88 89 86 90 84 90 L16 90 C14 90 12 89 12 86 Z" fill={paint} {...S} />
      <path d="M18 34 L82 34 L80 48 C60 56 40 56 20 48 Z" fill={paint} {...S} />
      <rect x="44" y="48" width="12" height="10" rx="2" fill="#ffd23f" {...S} strokeWidth={2.5} />
    </>
  ),
  // ---- objects that show a colour (no English label is ever shown with them)
  leaf: () => (
    <>
      <path d="M16 84 C14 44 44 16 86 14 C86 56 60 86 16 84 Z" fill="#2fb457" {...S} />
      <path d="M16 84 C36 64 54 46 74 28 M40 60 L38 44 M54 46 L66 46" fill="none" stroke="#1d7a39" strokeWidth={2.5} strokeLinecap="round" />
    </>
  ),
  sun: () => (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={i} d="M50 6 L50 18" {...S} strokeWidth={4} stroke="#e6a800" transform={`rotate(${i * 45} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="24" fill="#ffd23f" {...S} />
      <circle cx="42" cy="46" r="2.5" fill={INK} />
      <circle cx="58" cy="46" r="2.5" fill={INK} />
      <path d="M42 56 C46 60 54 60 58 56" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
  drop: () => (
    <>
      <path d="M50 10 C40 30 22 46 22 62 C22 78 34 90 50 90 C66 90 78 78 78 62 C78 46 60 30 50 10 Z" fill="#2f7de1" {...S} />
      <path d="M36 62 C36 72 42 78 50 78" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity="0.6" />
    </>
  ),
  grapes: () => (
    <>
      <path d="M50 24 C50 16 54 10 60 8" fill="none" {...S} />
      <path d="M52 18 C60 10 72 12 74 14 C68 22 60 22 52 18 Z" fill="#2fb457" {...S} />
      {[[38, 32], [50, 30], [62, 32], [32, 46], [44, 46], [56, 46], [68, 46], [38, 60], [50, 60], [62, 60], [44, 74], [56, 74], [50, 86]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8" fill="#8e44c9" {...S} strokeWidth={2.5} />
      ))}
    </>
  ),
  flower: () => (
    <>
      <path d="M50 56 L50 94" stroke="#2fb457" strokeWidth={5} strokeLinecap="round" />
      <path d="M50 80 C40 70 30 72 28 76 C34 84 44 84 50 80 Z" fill="#2fb457" {...S} strokeWidth={2.5} />
      {Array.from({ length: 6 }).map((_, i) => (
        <ellipse key={i} cx="50" cy="22" rx="11" ry="16" fill="#ff72b6" {...S} strokeWidth={2.5} transform={`rotate(${i * 60} 50 40)`} />
      ))}
      <circle cx="50" cy="40" r="10" fill="#ffd23f" {...S} strokeWidth={2.5} />
    </>
  ),
  cloud: () => (
    <>
      <path d="M24 70 C10 70 8 52 22 48 C20 32 40 26 48 36 C54 22 76 24 76 42 C90 42 92 70 76 70 Z" fill="#9aa1a9" {...S} />
      <path d="M30 80 L26 90 M50 80 L46 90 M70 80 L66 90" stroke="#2f7de1" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  snowman: () => (
    <>
      <circle cx="50" cy="70" r="22" fill="#fff" {...S} />
      <circle cx="50" cy="34" r="16" fill="#fff" {...S} />
      <circle cx="44" cy="31" r="2.4" fill={INK} />
      <circle cx="56" cy="31" r="2.4" fill={INK} />
      <path d="M50 36 L62 39 L50 40 Z" fill="#ff8a1f" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx="50" cy="62" r="2.4" fill={INK} />
      <circle cx="50" cy="72" r="2.4" fill={INK} />
      <path d="M28 62 L14 52 M72 62 L86 52" stroke="#8a5a2e" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  note: () => (
    <>
      <path d="M40 72 L40 22 L80 14 L80 62" fill="none" stroke="#1d1b22" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 22 L80 14 L80 26 L40 34 Z" fill="#1d1b22" {...S} />
      <ellipse cx="30" cy="74" rx="12" ry="9" fill="#1d1b22" {...S} transform="rotate(-18 30 74)" />
      <ellipse cx="70" cy="64" rx="12" ry="9" fill="#1d1b22" {...S} transform="rotate(-18 70 64)" />
    </>
  ),
  teddy: () => (
    <>
      <circle cx="28" cy="26" r="11" fill="#8a5a2e" {...S} />
      <circle cx="72" cy="26" r="11" fill="#8a5a2e" {...S} />
      <circle cx="50" cy="52" r="32" fill="#8a5a2e" {...S} />
      <ellipse cx="50" cy="64" rx="14" ry="11" fill="#d9a873" {...S} strokeWidth={2.5} />
      <ellipse cx="50" cy="59" rx="5" ry="3.6" fill={INK} />
      <circle cx="38" cy="46" r="3.4" fill={INK} />
      <circle cx="62" cy="46" r="3.4" fill={INK} />
      <path d="M44 68 C47 71 53 71 56 68" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    </>
  ),
  carrot: () => (
    <>
      <path d="M40 30 C30 18 34 8 40 8 C42 16 44 22 48 28 M52 28 C52 16 60 8 66 12 C62 18 58 24 56 30 M50 28 C46 18 50 6 54 6" fill="#2fb457" {...S} strokeWidth={2.5} />
      <path d="M34 30 C40 26 62 26 66 32 C64 54 56 78 50 92 C44 78 36 54 34 30 Z" fill="#ff8a1f" {...S} />
      <path d="M40 44 L48 44 M44 58 L54 58 M46 72 L52 72" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  star: () => (
    <path d="M50 8 L61 36 L92 38 L68 58 L76 89 L50 72 L24 89 L32 58 L8 38 L39 36 Z" fill="#ffd23f" {...S} />
  ),
};

export const PICTURE_IDS = Object.keys(P);

export function Picture({ id, size = 96, paint, label, className }: {
  id: string;
  size?: number | string;
  paint?: string;
  /** Accessible label. Leave empty when the name would give the answer away. */
  label?: string;
  className?: string;
}) {
  const draw = P[id];
  if (!draw) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {draw(paint)}
    </svg>
  );
}
