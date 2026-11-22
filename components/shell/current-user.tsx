'use client';

import { createContext, use } from 'react';

import type { SessionUser } from '@/types';

export type CurrentUser = {
  user: SessionUser;
  /** `admin` or `super_admin`. */
  isAdmin: boolean;
  /** Re-fetch `/auth/profile` (e.g. after the user edited their own profile). */
  reload: () => void;
};

export const CurrentUserContext = createContext<CurrentUser | null>(null);

/**
 * The signed-in user, loaded once by the app shell. Pages inside (admin), (employee) and
 * (shared) render only after it is loaded, so `user` is never null there.
 */
export function useCurrentUser(): CurrentUser {
  const value = use(CurrentUserContext);
  if (!value) throw new Error('useCurrentUser() works only inside the app shell layouts.');
  return value;
}
