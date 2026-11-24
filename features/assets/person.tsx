import type { ReactNode } from 'react';

import { SOFT, type Tone } from '@/components/ui/tone';
import { cn } from '@/lib/cn';

const AVATAR_TONES: Tone[] = ['primary', 'info', 'teal', 'pink', 'warning', 'success'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase() || '?';
}

/** Same person, same colour: the tone is picked from the name. */
function toneFor(name: string): Tone {
  let sum = 0;
  for (const char of name) sum += char.charCodeAt(0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

/** Initials avatar + name + an optional muted second line (email, department…). */
export function Person({ name, detail, className }: { name: string; detail?: ReactNode; className?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          SOFT[toneFor(name)],
        )}
      >
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{name}</span>
        {detail && <span className="block truncate text-xs text-muted">{detail}</span>}
      </span>
    </span>
  );
}
