import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { IconChip } from './icon-chip';
import type { Tone } from './tone';

export type EmptyStateProps = {
  icon?: LucideIcon;
  tone?: Tone;
  /** Say what is empty: "No assets match these filters". */
  title: string;
  /** Say what to do next. */
  description?: ReactNode;
  /** One button or link that fixes it. */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon = Inbox, tone = 'primary', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <IconChip icon={icon} tone={tone} size="lg" />
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
