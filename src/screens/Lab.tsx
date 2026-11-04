import { useMemo, useState } from 'react';
import { T } from '../text/he.ts';
import { buildListeningLab, twoStepUnlocked } from '../learn/questions.ts';
import { useStore } from '../state/store.tsx';
import { Screen } from '../ui/Screen.tsx';
import { GameRunner } from './GameRunner.tsx';
import { Guide } from '../art/Guide.tsx';

export function LabScreen() {
  const { save } = useStore();
  const [mode, setMode] = useState<'lab-learn' | 'lab-test' | null>(null);
  const [round, setRound] = useState(0);
  const questions = useMemo(() => (mode ? buildListeningLab(save, 8) : []), [mode, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const two = twoStepUnlocked(save);
  return (
    <Screen title={T.lab.title} en="Listening Lab" tone="teal">
      {!mode ? (
        <div className="intro">
          <Guide size={120} mood="think" />
          <p>{T.lab.lead}</p>
          <div className="choice-cards">
            <button type="button" className="choice-card choice-card--learn" onClick={() => setMode('lab-learn')}>
              <b>{T.lab.learnMode}</b>
              <span>{T.lab.learnModeSub}</span>
            </button>
            <button type="button" className="choice-card choice-card--test" onClick={() => setMode('lab-test')}>
              <b>{T.lab.testMode}</b>
              <span>{T.lab.testModeSub}</span>
            </button>
          </div>
          <p className="hint">{two ? T.lab.twoOpen : T.lab.twoLocked}</p>
        </div>
      ) : (
        <GameRunner key={round} questions={questions} title={mode === 'lab-learn' ? T.lab.runLearn : T.lab.runTest} mode={mode}
          onExit={() => setMode(null)} onFinish={() => { setMode(null); setRound(round + 1); }} finishLabel={T.lab.backToLab} introKey="lab" />
      )}
    </Screen>
  );
}
