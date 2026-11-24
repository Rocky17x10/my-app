'use client';

import { ChevronDown, CircleExclamationPoint } from 'lucide-react';
import {
  createContext,
  use,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/cn';

type FieldState = { id: string; describedBy?: string; invalid: boolean; required: boolean };

const FieldContext = createContext<FieldState | null>(null);

export type FieldProps = {
  label: ReactNode;
  /** Shown under the control; replaced visually by `error` but kept for screen readers. */
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Label + control + hint + error. The Input/Select/Textarea inside picks up the id,
 * aria-describedby, aria-invalid and required automatically.
 */
export function Field({ label, hint, error, required = false, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <FieldContext value={{ id, describedBy, invalid: Boolean(error), required }}>
        {children}
      </FieldContext>
      {hint && (
        <p id={hintId} className={cn('text-xs text-muted', error && 'sr-only')}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger">
          <CircleExclamationPoint className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

type A11yProps = {
  id?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
};

function useFieldProps(props: A11yProps) {
  const field = use(FieldContext);
  return {
    id: props.id ?? field?.id,
    required: props.required ?? field?.required,
    'aria-describedby':
      [props['aria-describedby'], field?.describedBy].filter(Boolean).join(' ') || undefined,
    'aria-invalid': props['aria-invalid'] ?? (field?.invalid || undefined),
  };
}

const CONTROL =
  'w-full rounded-md border border-border-strong bg-surface text-sm text-foreground shadow-raised transition-colors placeholder:text-muted/80 hover:border-muted/60 focus-visible:border-primary focus-visible:outline-offset-0 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Decorative icon inside the left edge (e.g. Search). */
  icon?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Input({ className, icon, ...props }: InputProps) {
  const a11y = useFieldProps(props);
  const input = (
    <input {...props} {...a11y} className={cn(CONTROL, 'h-9 px-3', icon ? 'pl-9' : '', className)} />
  );
  if (!icon) return input;
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted [&_svg]:size-4"
        aria-hidden="true"
      >
        {icon}
      </span>
      {input}
    </div>
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> };

/** Native select (keyboard and mobile pickers for free) with the shared look. */
export function Select({ className, children, ...props }: SelectProps) {
  const a11y = useFieldProps(props);
  return (
    <div className={cn('relative', className)}>
      <select {...props} {...a11y} className={cn(CONTROL, 'h-9 cursor-pointer appearance-none pr-9 pl-3')}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
    </div>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  const a11y = useFieldProps(props);
  return <textarea rows={rows} {...props} {...a11y} className={cn(CONTROL, 'px-3 py-2', className)} />;
}
