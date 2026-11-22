import { Suspense, type ReactNode } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { ShellSkeleton } from '@/components/shell/shell-skeleton';

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShell area="employee">{children}</AppShell>
    </Suspense>
  );
}
