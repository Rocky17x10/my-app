import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeHistoryView } from './employee-history-view';

export const metadata: Metadata = { title: 'Assignment history' };

// cacheComponents: the id is runtime data, so it is read inside Suspense.
export default function EmployeeHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
      {params.then(({ id }) => (
        <EmployeeHistoryView id={id} />
      ))}
    </Suspense>
  );
}
