import { createContext, useContext } from 'react';
import type { Profile } from './profiles.ts';

export interface ProfileApi {
  profile: Profile;
  all: Profile[];
  /** back to the "who is learning?" screen */
  switchProfile: () => void;
  removeProfile: (id: string) => void;
}

export const ProfileCtx = createContext<ProfileApi | null>(null);

export function useProfile() {
  const p = useContext(ProfileCtx);
  if (!p) throw new Error('no profile');
  return p;
}
