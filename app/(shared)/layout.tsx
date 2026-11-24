import { Suspense, type ReactNode } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { ShellSkeleton } from '@/components/shell/shell-skeleton';

/** Pages for both roles (e.g. /notifications). */
export default function SharedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShell area="shared">{children}</AppShell>
    </Suspense>
  );
}
