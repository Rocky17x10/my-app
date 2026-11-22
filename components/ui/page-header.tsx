import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type PageHeaderProps = {
  /** The page's only <h1>. */
  title: ReactNode;
  description?: ReactNode;
  /** Page-level buttons, right-aligned (one primary at most). */
  actions?: ReactNode;
  /** Link back to the parent list on detail pages. */
  back?: { href: string; label: string };
  className?: string;
};

export function PageHeader({ title, description, actions, back, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted hover:text-primary"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
