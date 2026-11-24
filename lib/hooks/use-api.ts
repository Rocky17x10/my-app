'use client';

import { useCallback, useEffect, useState } from 'react';

import { api, ApiError, withQuery, type Query } from '@/lib/api';

type Result<T> = { requestId: string; data?: T; error?: ApiError };

export type ApiState<T> = {
  /** Last loaded value; kept while a reload or a new query is in flight. */
  data: T | undefined;
  /** Error of the current request (never a 401: that one redirects to /login). */
  error: ApiError | null;
  loading: boolean;
  /** Fetch again (after a mutation). */
  reload: () => void;
  /** Change the loaded value locally (optimistic update). */
  setData: (update: (current: T | undefined) => T | undefined) => void;
};

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(0, 'Something went wrong. Try again.');
}

/**
 * GET `path` (+ `query`) on mount and whenever the URL changes. `path = null` waits.
 * Query objects may be literals: only the resulting URL is compared.
 */
export function useApi<T>(path: string | null, query?: Query): ApiState<T> {
  const url = path === null ? null : withQuery(path, query);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const requestId = url === null ? null : `${version}:${url}`;

  useEffect(() => {
    if (url === null) return;
    const id = `${version}:${url}`;
    let active = true;
    api.get<T>(url).then(
      (data) => {
        if (active) setResult({ requestId: id, data });
      },
      (error: unknown) => {
        if (active) setResult((previous) => ({ requestId: id, data: previous?.data, error: toApiError(error) }));
      },
    );
    return () => {
      active = false;
    };
  }, [url, version]);

  const current = result?.requestId === requestId ? result : null;
  const redirecting = current?.error?.status === 401;

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback((update: (value: T | undefined) => T | undefined) => {
    setResult((previous) => (previous ? { ...previous, data: update(previous.data) } : previous));
  }, []);

  return {
    data: result?.data,
    error: current?.error && !redirecting ? current.error : null,
    loading: requestId !== null && (current === null || redirecting),
    reload,
    setData,
  };
}
