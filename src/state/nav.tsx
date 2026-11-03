import { createContext, useContext } from 'react';
import type { GameId } from '../learn/questions.ts';
import type { LetterId } from '../content/letters.ts';

export type Route =
  | { name: 'home' }
  | { name: 'letters' }
  | { name: 'letter'; id: LetterId }
  | { name: 'numbers' }
  | { name: 'colors' }
  | { name: 'words' }
  | { name: 'game'; game: GameId; title: string; letters?: LetterId[] }
  | { name: 'lab' }
  | { name: 'path' }
  | { name: 'session'; id: string }
  | { name: 'exam' }
  | { name: 'parents' }
  | { name: 'quick' }
  | { name: 'soundcheck' }
  | { name: 'share' }
  | { name: 'install' };

export interface Nav {
  go: (r: Route) => void;
  back: () => void;
  home: () => void;
}

export const NavCtx = createContext<Nav | null>(null);
export function useNav() {
  const n = useContext(NavCtx);
  if (!n) throw new Error('no nav');
  return n;
}
