import type { GameId } from '../learn/questions.ts';
import { useNav } from '../state/nav.tsx';

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
