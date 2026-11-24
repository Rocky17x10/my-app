import { Boxes } from 'lucide-react';

import { cn } from '@/lib/cn';

/** Logo mark + product name. `compact` shows the mark only (collapsed sidebar). */
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-135 from-primary to-info text-white shadow-raised dark:text-primary-foreground">
        <Boxes className="size-[18px]" aria-hidden="true" />
      </span>
      {compact ? (
        <span className="sr-only">IT Asset Management</span>
      ) : (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">IT Assets</span>
          <span className="truncate text-xs text-muted">Management console</span>
        </span>
      )}
    </span>
  );
}
