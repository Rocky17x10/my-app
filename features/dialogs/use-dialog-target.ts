'use client';

import { useCallback, useState } from 'react';

/**
 * State for a dialog that acts on one item. `show(item)` mounts a fresh dialog (render it with
 * ``key={`name-${dialog.key}`}`` so its form state starts empty; prefix it, sibling dialogs share
 * numbers); `close()` keeps it mounted with
 * `open: false`, so the native <dialog> closes properly and focus returns to the opener.
 */
export function useDialogTarget<T>() {
  const [state, setState] = useState<{ target: T; open: boolean; key: number } | null>(null);
  const show = useCallback((target: T) => setState((s) => ({ target, open: true, key: (s?.key ?? 0) + 1 })), []);
  const close = useCallback(() => setState((s) => (s ? { ...s, open: false } : s)), []);
  return { target: state?.target ?? null, open: state?.open ?? false, key: state?.key ?? 0, show, close };
}
