import { API_URL } from '@/lib/config';
import type { Page, SessionUser, UserRole } from '@/types';

// Kept for older imports; the definitions live in types/.
export type { SessionUser, UserRole };

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

async function readBody(response: Response): Promise<unknown> {
  return response
    .clone()
    .json()
    .catch(() => null);
}

function bodyCode(body: unknown): string | undefined {
  return typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string'
    ? body.code
    : undefined;
}

/** Sends the browser to the login page, remembering where it was. */
function redirectToLogin(): void {
  const { pathname, search } = window.location;
  if (pathname === '/login') return;
  const next = encodeURIComponent(pathname + search);
  // `expired` makes proxy.ts drop a stale `session` cookie instead of bouncing back here.
  // A full load also clears every piece of client state of the ended session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- plain module, no router
  window.location.assign(`/login?expired=1&next=${next}`);
}

/**
 * fetch() for the backend: sends the auth cookies, renews an expired access token once,
 * sends users with an admin-set password to /change-password and ended sessions to /login.
 * Returns the final response. Prefer the typed `api.*` helpers below in new code.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const send = () => fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });

  let response = await send();

  if (response.status === 401 && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) response = await send();
    if (response.status === 401) redirectToLogin();
  }

  if (response.status === 403 && bodyCode(await readBody(response)) === 'PASSWORD_CHANGE_REQUIRED') {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- plain module, no router; a full load is fine
    window.location.assign('/change-password');
  }

  return response;
}

/** A failed API call. `message` is always a readable string (Nest validation arrays are joined). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The message to show for any thrown value (ApiError, network error, anything else). */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = await readBody(response);
  const raw = typeof body === 'object' && body !== null && 'message' in body ? body.message : null;
  const message = Array.isArray(raw)
    ? raw.join('. ')
    : typeof raw === 'string' && raw
      ? raw
      : `Request failed (${response.status}).`;
  return new ApiError(response.status, message, bodyCode(body));
}

/** Query values; `undefined`, `null` and `''` are left out, so filters can be passed as they are. */
export type Query = Record<string, string | number | boolean | null | undefined>;

export function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path;
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(withQuery(path, query), {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Typed JSON calls. They resolve with the parsed body and throw `ApiError` on any non-2xx. */
export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** One page of a paginated list endpoint: `{ data, total, page, limit, totalPages }`. */
export function getPage<T>(path: string, query?: Query): Promise<Page<T>> {
  return api.get<Page<T>>(path, query);
}

/**
 * Loads every page of a paginated list endpoint (`{ data, totalPages }`) and returns a
 * Response whose body is the combined array, so callers keep their array handling.
 * On the first failing page that page's response is returned unchanged.
 * shortcut: loads whole lists; new pages should use getPage()/usePagedList() instead.
 */
export async function apiFetchAll(path: string, init: RequestInit = {}): Promise<Response> {
  const items: unknown[] = [];
  const separator = path.includes('?') ? '&' : '?';

  for (let page = 1; ; page++) {
    const response = await apiFetch(`${path}${separator}page=${page}&limit=100`, init);
    if (!response.ok) return response;

    const body = (await response.json()) as { data: unknown[]; totalPages: number };
    items.push(...body.data);
    if (page >= body.totalPages) break;
  }

  return new Response(JSON.stringify(items), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Ends the session on the server and clears the cookies. Never throws. */
export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function homePathFor(role: UserRole): string {
  return isAdminRole(role) ? '/dashboard' : '/my-assets';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  user: 'Employee',
};
