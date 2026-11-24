'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: LucideIcon; extra?: ReactNode };

/** Pill group of toggle buttons (one pressed). Scrolls sideways when it does not fit. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('max-w-full overflow-x-auto', className)}>
      <div role="group" aria-label={label} className="inline-flex gap-1 rounded-lg border border-border bg-surface-muted p-1">
        {options.map(({ value: option, label: text, icon: Icon, extra }) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)}
              className={cn(
                'inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-surface text-foreground shadow-raised ring-1 ring-border'
                  : 'text-muted hover:bg-surface/60 hover:text-foreground',
              )}
            >
              {Icon && <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : '')} aria-hidden="true" />}
              {text}
              {extra}
            </button>
          );
        })}
      </div>
    </div>
  );
}
