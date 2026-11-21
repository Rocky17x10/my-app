import { API_URL } from './config';

export type UserRole = 'super_admin' | 'admin' | 'user';

/** The user object returned by login, refresh and password change. */
export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  designation: string | null;
  mustChangePassword: boolean;
}

// Endpoints whose 401 means "wrong credentials / no session", not "access token expired".
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

let refreshing: Promise<boolean> | null = null;

function postRefresh(): Promise<boolean> {
  return fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  }).then(
    (response) => response.ok,
    () => false,
  );
}

async function refreshAcrossTabs(): Promise<boolean> {
  // Web Locks exist only in secure contexts (https, localhost), not on plain-http LAN addresses.
  if (!('locks' in navigator)) return postRefresh();
  return await navigator.locks.request('auth-refresh', postRefresh);
}

/**
 * One refresh at a time: within a tab through the shared promise, across tabs through a
 * Web Lock. Each refresh token is single-use, so two parallel refreshes would end the session.
 */
function refreshSession(): Promise<boolean> {
  refreshing ??= refreshAcrossTabs().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function needsPasswordChange(response: Response): Promise<boolean> {
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null);
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    body.code === 'PASSWORD_CHANGE_REQUIRED'
  );
}

/**
 * fetch() for the backend: sends the auth cookies, renews an expired access token once,
 * and sends users with an admin-set password to /change-password.
 * Returns the final response; a 401 means the session is over.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const send = () =>
    fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });

  let response = await send();

  if (
    response.status === 401 &&
    !NO_REFRESH.includes(path) &&
    (await refreshSession())
  ) {
    response = await send();
  }

  if (response.status === 403 && (await needsPasswordChange(response))) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- plain module, no router; a full load is fine
    window.location.assign('/change-password');
  }

  return response;
}

/** Ends the session on the server and clears the cookies. Never throws. */
export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
}

export function homePathFor(role: UserRole): string {
  return role === 'user' ? '/my-assets' : '/dashboard';
}
