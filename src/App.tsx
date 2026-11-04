import { T } from './text/he.ts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StoreProvider, useStore } from './state/store.tsx';
import { NavCtx, type Route } from './state/nav.tsx';
import { Home, Welcome } from './screens/Home.tsx';
import { LettersWorld, LetterScreen } from './screens/Letters.tsx';
import { NumbersWorld, ColorsWorld, WordsWorld } from './screens/Worlds.tsx';
import { PathScreen, SessionScreen } from './screens/Path.tsx';
import { ExamScreen } from './screens/Exam.tsx';
import { LabScreen } from './screens/Lab.tsx';
import { ParentsScreen } from './screens/Parents.tsx';
import { SoundCheckScreen } from './screens/QA.tsx';
import { GameRunner } from './screens/GameRunner.tsx';
import { Screen } from './ui/Screen.tsx';
import { buildGame, type GameId } from './learn/questions.ts';
import type { LetterId } from './content/letters.ts';
import { Picture, PICTURE_IDS } from './art/pictures.tsx';
import { ShareScreen, InstallScreen } from './screens/ShareInstall.tsx';
import { ProfilesScreen } from './screens/Profiles.tsx';
import { ProfileCtx } from './state/profileCtx.tsx';
import { deleteProfile, loadProfiles, requestPersistentStorage, selectProfile } from './state/profiles.ts';
import { UpdateBanner } from './ui/UpdateBanner.tsx';
import { audio } from './audio/player.ts';

function GameScreen({ game, title, letters, onExit }: { game: GameId; title: string; letters?: LetterId[]; onExit: () => void }) {
  const { save } = useStore();
  const [round, setRound] = useState(0);
  const qs = useMemo(() => buildGame(game, save, game === 'letterPairs' || game === 'numberMemory' ? 3 : 8, { letters }), [game, round]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen title={title}>
      <GameRunner key={round} questions={qs} title={title} onExit={onExit} onFinish={() => setRound(round + 1)} finishLabel={T.games.anotherRound} introKey={game} />
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
  // Leaving a screen always silences it: no sound carries over to the next screen.
  useEffect(() => { audio.stop(); }, [stack]);
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
    case 'share': page = <ShareScreen />; break;
    case 'install': page = <InstallScreen />; break;
  }
  return <NavCtx.Provider value={nav}>{page}</NavCtx.Provider>;
}

export default function App() {
  // Dev-only picture gallery for checking the illustrations: /?gallery
  if (import.meta.env.DEV && location.search.includes('gallery')) {
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8 }}>{PICTURE_IDS.map((id) => <figure key={id} style={{ margin: 0, textAlign: 'center' }}><Picture id={id} size={110} /><figcaption>{id}</figcaption></figure>)}</div>;
  }
  return <ProfileGate />;
}

/** Chooses the active profile; each profile gets its own progress store. */
function ProfileGate() {
  const [state, setState] = useState(() => loadProfiles());
  useEffect(() => requestPersistentStorage(), []);
  const refresh = () => setState(loadProfiles());
  const current = state.list.find((p) => p.id === state.current);

  const api = useMemo(() => current && ({
    profile: current,
    all: state.list,
    switchProfile: () => { selectProfile(null); refresh(); },
    removeProfile: (id: string) => { deleteProfile(id); refresh(); },
  }), [current, state.list]);

  return (
    <>
      {!current || !api ? (
        <ProfilesScreen list={state.list}
          onPick={(id) => { selectProfile(id); refresh(); }}
          onCreated={() => refresh()} />
      ) : (
        <ProfileCtx.Provider value={api}>
          <StoreProvider key={current.id} profileId={current.id}>
            <Router key={current.id} />
          </StoreProvider>
        </ProfileCtx.Provider>
      )}
      <UpdateBanner />
    </>
  );
}
