import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { AssetHistoryView } from './history-view';

export const metadata: Metadata = { title: 'Asset history' };

async function HistoryForParams({ params }: Pick<PageProps<'/assets/[id]/history'>, 'params'>) {
  const { id } = await params;
  return <AssetHistoryView id={id} />;
}

// cacheComponents: the params are request data, so they are read inside Suspense.
export default function AssetHistoryPage({ params }: PageProps<'/assets/[id]/history'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
      <HistoryForParams params={params} />
    </Suspense>
  );
}
