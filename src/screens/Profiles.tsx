import { useState } from 'react';
import { T, BRAND } from '../text/he.ts';
import { addProfile, checkName, MAX_NAME, type Profile } from '../state/profiles.ts';
import { Guide } from '../art/Guide.tsx';
import { audio } from '../audio/player.ts';
import { Brand } from '../ui/Brand.tsx';

const PROBLEM: Record<'empty' | 'tooLong' | 'taken', string> = {
  empty: T.profiles.empty,
  tooLong: T.profiles.tooLong,
  taken: T.profiles.taken,
};

/** "Who is learning?" – pick an existing profile or create a new one (name/nickname only). */
export function ProfilesScreen({ list, onPick, onCreated }: {
  list: Profile[];
  onPick: (id: string) => void;
  onCreated: (p: Profile) => void;
}) {
  const [adding, setAdding] = useState(list.length === 0);
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<keyof typeof PROBLEM | null>(null);

  const create = () => {
    const pb = checkName(name, list);
    setProblem(pb);
    if (pb) return;
    audio.unlock();
    onCreated(addProfile(name));
  };

  return (
    <div className="welcome">
      <Brand />
      <Guide size={130} mood="happy" />
      {adding ? (
        <form className="profile-form" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <h2>{T.profiles.newTitle}</h2>
          <label htmlFor="pname">{T.profiles.askName}</label>
          <input id="pname" value={name} maxLength={MAX_NAME + 5} autoComplete="off" autoCapitalize="words" enterKeyHint="go"
            placeholder={T.profiles.namePlaceholder} onChange={(e) => { setName(e.target.value); setProblem(null); }}
            aria-invalid={!!problem} aria-describedby={problem ? 'pname-err' : undefined} />
          {problem && <p id="pname-err" className="form-error" role="alert">{PROBLEM[problem]}</p>}
          <button type="submit" className="btn btn--primary btn--huge">{T.profiles.create}</button>
          {list.length > 0 && <button type="button" className="link-btn" onClick={() => setAdding(false)}>{T.common.back}</button>}
          <p className="welcome__small">{T.profiles.noPersonal}</p>
        </form>
      ) : (
        <div className="profile-pick">
          <h2>{T.profiles.title}</h2>
          <div className="profile-list">
            {list.map((p) => (
              <button key={p.id} type="button" className="profile-chip" onClick={() => { audio.unlock(); onPick(p.id); }}>
                <span className="profile-chip__avatar" aria-hidden>{p.name.charAt(0)}</span>
                <span className="profile-chip__name">{p.name}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => setAdding(true)}>{T.profiles.add}</button>
        </div>
      )}
      <p className="welcome__note">{T.profiles.deviceNote}</p>
      <span className="sr-only">{BRAND.name}</span>
    </div>
  );
}
