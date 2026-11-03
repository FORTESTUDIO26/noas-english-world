import { useCallback, useEffect, useMemo, useState } from 'react';
import { StoreProvider, useStore } from './state/store.tsx';
import { NavCtx, type Route } from './state/nav.tsx';
import { Home, Welcome } from './screens/Home.tsx';
import { LettersWorld, LetterScreen } from './screens/Letters.tsx';
import { NumbersWorld, ColorsWorld, WordsWorld } from './screens/Worlds.tsx';
import { PathScreen, SessionScreen } from './screens/Path.tsx';
import { ExamScreen } from './screens/Exam.tsx';
import { LabScreen } from './screens/Lab.tsx';
import { ParentsScreen, SoundCheckScreen } from './screens/Parents.tsx';
import { GameRunner } from './screens/GameRunner.tsx';
import { Screen } from './ui/Screen.tsx';
import { buildGame, type GameId } from './learn/questions.ts';
import type { LetterId } from './content/letters.ts';
import { Picture, PICTURE_IDS } from './art/pictures.tsx';

function GameScreen({ game, title, letters, onExit }: { game: GameId; title: string; letters?: LetterId[]; onExit: () => void }) {
  const { save } = useStore();
  const [round, setRound] = useState(0);
  const qs = useMemo(() => buildGame(game, save, game === 'letterPairs' || game === 'numberMemory' ? 3 : 8, { letters }), [game, round]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen title={title}>
      <GameRunner key={round} questions={qs} title={title} onExit={onExit} onFinish={() => setRound(round + 1)} finishLabel="עוד סיבוב" />
    </Screen>
  );
}

function Router() {
  // The welcome screen also gives Safari the first touch it needs for sound.
  const [started, setStarted] = useState(false);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);

  const go = useCallback((r: Route) => {
    setStack((s) => [...s, r]);
    history.pushState({ depth: Date.now() }, '');
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => history.back(), []);
  const home = useCallback(() => {
    setStack([{ name: 'home' }]);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const nav = useMemo(() => ({ go, back, home }), [go, back, home]);
  const r = stack[stack.length - 1];

  let page: React.ReactNode;
  if (!started) page = <Welcome onStart={() => setStarted(true)} />;
  else switch (r.name) {
    case 'home': page = <Home />; break;
    case 'letters': page = <LettersWorld />; break;
    case 'letter': page = <LetterScreen key={r.id} id={r.id} />; break;
    case 'numbers': page = <NumbersWorld />; break;
    case 'colors': page = <ColorsWorld />; break;
    case 'words': page = <WordsWorld />; break;
    case 'game': page = <GameScreen key={r.game + stack.length} game={r.game} title={r.title} letters={r.letters} onExit={back} />; break;
    case 'lab': page = <LabScreen />; break;
    case 'path': page = <PathScreen />; break;
    case 'session': page = <SessionScreen key={r.id + stack.length} id={r.id} />; break;
    case 'exam': page = <ExamScreen />; break;
    case 'parents': page = <ParentsScreen />; break;
    case 'soundcheck': page = <SoundCheckScreen />; break;
    case 'quick': page = <ParentsScreen />; break;
  }
  return <NavCtx.Provider value={nav}>{page}</NavCtx.Provider>;
}

export default function App() {
  // Dev-only picture gallery for checking the illustrations: /?gallery
  if (import.meta.env.DEV && location.search.includes('gallery')) {
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8 }}>{PICTURE_IDS.map((id) => <figure key={id} style={{ margin: 0, textAlign: 'center' }}><Picture id={id} size={110} /><figcaption>{id}</figcaption></figure>)}</div>;
  }
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
