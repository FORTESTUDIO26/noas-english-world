// Several learners on one device. Each profile has only a first name or a
// nickname (no gender, no email, no password) and its own progress save.
// Everything stays in this browser's local storage – it is NOT a cloud
// account and anyone using the same device can open any profile.

import { T } from '../text/he.ts';

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
}

interface ProfilesState {
  v: 1;
  list: Profile[];
  current: string | null;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const KEY = 'noa-english:profiles';
/** Save written by the first version (before profiles existed). */
const LEGACY_SAVE = 'noa-english:save';

export const saveKey = (profileId: string) => `noa-english:p:${profileId}:save`;
export const MAX_NAME = 20;

function read(s: Store): ProfilesState {
  try {
    const raw = s.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as ProfilesState;
      if (p.v === 1 && Array.isArray(p.list)) return p;
    }
  } catch { /* fall through */ }
  return { v: 1, list: [], current: null };
}

function write(s: Store, p: ProfilesState) {
  try { s.setItem(KEY, JSON.stringify(p)); } catch { /* storage full / private mode */ }
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function loadProfiles(s: Store = localStorage): ProfilesState {
  const p = read(s);
  // One-time move of a pre-profiles save into a first profile, so nothing is lost.
  if (!p.list.length) {
    const legacy = s.getItem(LEGACY_SAVE);
    if (legacy) {
      const prof = { id: newId(), name: T.profiles.legacyName, createdAt: Date.now() };
      try {
        s.setItem(saveKey(prof.id), legacy);
        s.removeItem(LEGACY_SAVE);
      } catch { /* keep legacy if copy failed */ }
      const next = { v: 1 as const, list: [prof], current: null };
      write(s, next);
      return next;
    }
  }
  if (p.current && !p.list.some((x) => x.id === p.current)) p.current = null;
  return p;
}

export function cleanName(name: string) {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

export type NameProblem = 'empty' | 'tooLong' | 'taken' | null;

export function checkName(name: string, list: Profile[]): NameProblem {
  const n = name.replace(/\s+/g, ' ').trim();
  if (!n) return 'empty';
  if (n.length > MAX_NAME) return 'tooLong';
  if (list.some((p) => p.name.toLocaleLowerCase() === n.toLocaleLowerCase())) return 'taken';
  return null;
}

export function addProfile(name: string, s: Store = localStorage): Profile {
  const p = loadProfiles(s);
  const prof = { id: newId(), name: cleanName(name), createdAt: Date.now() };
  write(s, { ...p, list: [...p.list, prof], current: prof.id });
  return prof;
}

export function selectProfile(id: string | null, s: Store = localStorage) {
  const p = loadProfiles(s);
  write(s, { ...p, current: id && p.list.some((x) => x.id === id) ? id : null });
}

/** Removes one profile and only its own save. */
export function deleteProfile(id: string, s: Store = localStorage) {
  const p = loadProfiles(s);
  try { s.removeItem(saveKey(id)); } catch { /* ignore */ }
  write(s, { ...p, list: p.list.filter((x) => x.id !== id), current: p.current === id ? null : p.current });
}

/** Ask the browser not to clear this site's data under storage pressure. */
export function requestPersistentStorage() {
  try { void navigator.storage?.persist?.(); } catch { /* not supported */ }
}
