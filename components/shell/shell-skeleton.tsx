import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { Brand } from './brand';

/** Shell placeholder while the profile loads (and the Suspense fallback of the shell layouts). */
export function ShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh" aria-busy="true">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface px-5 py-4 lg:flex">
        <Brand />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-7" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto size-8 rounded-full" />
        </div>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children ?? (
            <div className="flex flex-col gap-6">
              <Skeleton className="h-8 w-56" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-32 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-72 rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
