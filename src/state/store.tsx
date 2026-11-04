import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { saveKey } from './profiles.ts';
import { loadSave, recordAnswer, writeSave, emptySave, type Save, type ExamRecord } from '../learn/progress.ts';

interface Store {
  save: Save;
  answer: (skill: string, correct: boolean) => void;
  markOpened: (key: string) => void;
  finishSession: (id: string, correct: number, total: number) => void;
  addExam: (e: ExamRecord) => void;
  setSlow: (slow: boolean) => void;
  setResume: (sessionId: string, step: number | null) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

/** Progress of ONE profile. Re-mount (key={profileId}) when the profile changes. */
export function StoreProvider({ profileId, children }: { profileId: string; children: ReactNode }) {
  const key = saveKey(profileId);
  const [save, setSave] = useState<Save>(() => loadSave(key));
  const ref = useRef(save);
  ref.current = save;

  // Write after every change; also on page hide (iOS may kill the tab).
  useEffect(() => writeSave(key, save), [key, save]);
  useEffect(() => {
    const flush = () => writeSave(key, ref.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [key]);

  const answer = useCallback((skill: string, correct: boolean) => setSave((s) => recordAnswer(s, skill, correct)), []);
  const markOpened = useCallback((key: string) => setSave((s) => ({ ...s, opened: { ...s.opened, [key]: Date.now() } })), []);
  const finishSession = useCallback((id: string, correct: number, total: number) => setSave((s) => {
    const prev = s.sessions[id];
    return { ...s, sessions: { ...s.sessions, [id]: { done: true, runs: (prev?.runs ?? 0) + 1, lastCorrect: correct, lastTotal: total, finishedAt: Date.now() } } };
  }), []);
  const addExam = useCallback((e: ExamRecord) => setSave((s) => ({ ...s, exams: [...s.exams, e].slice(-20) })), []);
  const setSlow = useCallback((slow: boolean) => setSave((s) => ({ ...s, settings: { ...s.settings, slow } })), []);
  const reset = useCallback(() => setSave(emptySave()), []);
  const setResume = useCallback((id: string, step: number | null) => setSave((s) => {
    const r = { ...(s.resume ?? {}) };
    if (step === null) delete r[id]; else r[id] = step;
    return { ...s, resume: r };
  }), []);

  const value = useMemo(() => ({ save, answer, markOpened, finishSession, addExam, setSlow, reset, setResume }), [save, answer, markOpened, finishSession, addExam, setSlow, reset, setResume]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
