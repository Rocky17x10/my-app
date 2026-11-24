'use client';

import { CircleCheck, CircleExclamationPoint, Info, X, type LucideIcon } from 'lucide-react';
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { SOFT, type Tone } from './tone';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; title: string; description?: string };

const KINDS: Record<ToastKind, { icon: LucideIcon; tone: Tone; ms: number }> = {
  success: { icon: CircleCheck, tone: 'success', ms: 5000 },
  info: { icon: Info, tone: 'info', ms: 5000 },
  error: { icon: CircleExclamationPoint, tone: 'danger', ms: 9000 },
};

type ToastApi = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Mounted once in app/layout.tsx. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-3), { id, kind, title, description }]);
      window.setTimeout(() => dismiss(id), KINDS[kind].ms);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => show('success', title, description),
      error: (title, description) => show('error', title, description),
      info: (title, description) => show('info', title, description),
    }),
    [show],
  );

  return (
    <ToastContext value={api}>
      {children}
      {/* Always in the DOM so screen readers track it. A modal dialog makes it inert and covers it:
          show errors of a dialog inside the dialog, and toasts after it closes. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 left-4 z-60 flex flex-col gap-2 sm:left-auto sm:w-96 *:pointer-events-auto"
      >
        {items.map((item) => {
          const { icon: Icon, tone } = KINDS[item.kind];
          return (
            <div
              key={item.id}
              role={item.kind === 'error' ? 'alert' : 'status'}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3.5 text-foreground shadow-overlay transition-[opacity,translate] duration-200 starting:translate-y-2 starting:opacity-0"
            >
              <span className={cn('mt-px flex size-6 shrink-0 items-center justify-center rounded-md', SOFT[tone])}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description && <p className="mt-0.5 text-sm text-muted">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss"
                className="-m-1 rounded-md p-1 text-muted hover:bg-surface-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}

/** `const toast = useToast(); toast.success('Asset saved')`, `toast.error(errorMessage(err))`. */
export function useToast(): ToastApi {
  const api = use(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>.');
  return api;
}
