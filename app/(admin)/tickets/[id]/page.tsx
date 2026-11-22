import type { Metadata } from 'next';
import { Suspense } from 'react';

import { TicketDetail, TicketDetailSkeleton } from '@/features/tickets/ticket-detail';

export const metadata: Metadata = { title: 'Support ticket' };

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<TicketDetailSkeleton />}>
      {params.then(({ id }) => (
        <TicketDetail id={id} area="admin" />
      ))}
    </Suspense>
  );
}
