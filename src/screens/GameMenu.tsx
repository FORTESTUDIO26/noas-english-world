import type { GameId } from '../learn/questions.ts';
import { useNav } from '../state/nav.tsx';
import { T } from '../text/he.ts';

/** Game cards from ids – titles and descriptions come from the central texts. */
export const gameList = (ids: GameId[]) => ids.map((id) => ({ id, title: T.games[id as keyof typeof T.games][0] as string, desc: T.games[id as keyof typeof T.games][1] as string }));

const TONES = ['purple', 'pink', 'teal', 'yellow'];

export function GameMenu({ games }: { games: { id: GameId; title: string; desc: string }[] }) {
  const nav = useNav();
  return (
    <div className="game-list">
      {games.map((g, i) => (
        <button key={g.id} type="button" className={`game-card game-card--${TONES[i % 4]}`} onClick={() => nav.go({ name: 'game', game: g.id, title: g.title })}>
          <span className="game-card__title">{g.title}</span>
          <span className="game-card__desc">{g.desc}</span>
        </button>
      ))}
    </div>
  );
}
