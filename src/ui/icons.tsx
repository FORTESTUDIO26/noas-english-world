// Small consistent line icons (24x24, round strokes).
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const IconSpeaker = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>
);
export const IconTurtle = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M4 15c0-4 3.5-7 7.5-7S19 11 19 15z" fill="currentColor" opacity=".25" /><path d="M4 15c0-4 3.5-7 7.5-7S19 11 19 15H4zM19 13h2.5M6 15l-1 3M17 15l1 3M9 8.6 11.5 11 14 8.6" /></svg>
);
export const IconBack = () => <svg {...base}><path d="M9 6l6 6-6 6" /></svg>;
export const IconHome = () => <svg {...base}><path d="M4 11l8-7 8 7M6 10v10h12V10" /></svg>;
export const IconCheck = ({ size = 24 }: { size?: number }) => <svg {...base} width={size} height={size}><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
export const IconStar = ({ size = 24, filled = true }: { size?: number; filled?: boolean }) => (
  <svg {...base} width={size} height={size}><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6-4.5-4.2 6.1-.8z" fill={filled ? 'currentColor' : 'none'} /></svg>
);
export const IconLock = () => <svg {...base}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const IconMic = () => <svg {...base}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
export const IconRefresh = () => <svg {...base}><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" /></svg>;
export const IconHelp = () => <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01" /></svg>;
export const IconEraser = () => <svg {...base}><path d="M4 16l9-9 6 6-6 6H8zM10 19h10" /></svg>;
