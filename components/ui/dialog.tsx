'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Button } from './button';

export type DialogProps = {
  open: boolean;
  /** Called on Esc, the close button and a click on the backdrop. Set `open` to false in it. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons, right-aligned in the footer. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
};

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/**
 * Modal dialog on the native <dialog> element: the page behind is inert (focus stays inside),
 * Esc closes, focus returns to the opener. On open, focus goes to the first element with
 * `data-autofocus`, else the first form control.
 * For a form: put the <form> in `children` and give the submit button `form="<form id>"` in `footer`.
 */
export function Dialog({ open, onClose, title, description, footer, size = 'md', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    dialog
      .querySelector<HTMLElement>(
        '[data-autofocus], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      )
      ?.focus();
    // Also runs when Activity hides the page, so a hidden route never keeps a modal open.
    return () => dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-border bg-surface p-0 text-foreground shadow-overlay',
        'transition-[opacity,scale] duration-150 starting:open:scale-[0.98] starting:open:opacity-0',
        SIZES[size],
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-start gap-4 px-5 pt-5 pb-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold text-foreground">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose} className="-mt-1 -mr-2">
              <X aria-hidden="true" />
            </Button>
          </header>
          {children && <div className="overflow-y-auto px-5 pb-5">{children}</div>}
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-border bg-surface-muted/60 px-5 py-3 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Name the action: "Delete user", "Unassign asset" — not "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  children?: ReactNode;
};

/** Yes/no question before a consequential action. Focus starts on Cancel. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
