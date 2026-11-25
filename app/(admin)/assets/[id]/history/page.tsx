
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { AssetHistoryView } from './history-view';

export const metadata: Metadata = { title: 'Asset history' };

type HistoryPageProps = {
  params: Promise<{ id: string }>;
};

async function HistoryForParams({ params }: HistoryPageProps) {
  const { id } = await params;
  return <AssetHistoryView id={id} />;
}

// cacheComponents: params are request data, so they are read inside Suspense.
export default function AssetHistoryPage({ params }: HistoryPageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
      <HistoryForParams params={params} />
    </Suspense>
  );
}
