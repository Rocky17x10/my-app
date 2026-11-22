import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { IconChip } from './icon-chip';
import { Skeleton } from './skeleton';
import type { Tone } from './tone';

export type CardProps = {
  title?: ReactNode;
  description?: ReactNode;
  /** Right side of the header (a link or a small button). */
  actions?: ReactNode;
  className?: string;
  /** Classes for the body; defaults to `p-5`. Pass `p-0` for an edge-to-edge list or table. */
  bodyClassName?: string;
  children?: ReactNode;
};

/** Flat panel: border, no shadow. Use it to group related content, not around every element. */
export function Card({ title, description, actions, className, bodyClassName = 'p-5', children }: CardProps) {
  return (
    <section className={cn('rounded-lg border border-border bg-surface', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export type StatCardProps = {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  /** One short line under the value: a ratio, a trend, what to do. */
  hint?: ReactNode;
  /** Makes the whole card a link. */
  href?: string;
  loading?: boolean;
  className?: string;
};

export function StatCard({ label, value, icon, tone = 'primary', hint, href, loading, className }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <IconChip icon={icon} tone={tone} />
      </div>
      {loading ? (
        <Skeleton className="mt-1 h-8 w-20" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      )}
      {hint && <div className="mt-1.5 text-sm text-muted">{hint}</div>}
    </>
  );
  const classes = cn('block rounded-lg border border-border bg-surface p-5', className);
  if (!href) return <div className={classes}>{body}</div>;
  return (
    <Link href={href} className={cn(classes, 'transition-colors hover:border-primary/40 hover:bg-primary/[0.03]')}>
      {body}
    </Link>
  );
}
