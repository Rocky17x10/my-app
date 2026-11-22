import { Suspense, type ReactNode } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { ShellSkeleton } from '@/components/shell/shell-skeleton';

// Suspense: the shell reads usePathname(), which suspends during prerender on [id] routes.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShell area="admin">{children}</AppShell>
    </Suspense>
  );
}
