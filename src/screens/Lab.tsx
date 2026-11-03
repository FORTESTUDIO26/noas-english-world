import { useMemo, useState } from 'react';
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
    <Screen title="מעבדת הקשבה" en="Listening Lab" tone="teal">
      {!mode ? (
        <div className="intro">
          <Guide size={120} mood="think" />
          <p>שומעים הוראה באנגלית ועושים מה שהיא אומרת. ההוראה לא כתובה – צריך להקשיב! אפשר לשמוע שוב כמה שרוצים.</p>
          <div className="choice-cards">
            <button type="button" className="choice-card choice-card--learn" onClick={() => setMode('lab-learn')}>
              <b>מצב לימוד</b>
              <span>עם כפתור עזרה בעברית</span>
            </button>
            <button type="button" className="choice-card choice-card--test" onClick={() => setMode('lab-test')}>
              <b>מצב מבחן</b>
              <span>בלי עזרה ובלי תרגום</span>
            </button>
          </div>
          <p className="hint">{two ? '⭐ נפתחו משימות עם שתי הוראות!' : 'אחרי שתצליחי במשימות פשוטות ייפתחו משימות עם שתי הוראות.'}</p>
        </div>
      ) : (
        <GameRunner key={round} questions={questions} title={mode === 'lab-learn' ? 'מעבדה · לימוד' : 'מעבדה · מבחן'} mode={mode}
          onExit={() => setMode(null)} onFinish={() => { setMode(null); setRound(round + 1); }} finishLabel="חזרה למעבדה" />
      )}
    </Screen>
  );
}
