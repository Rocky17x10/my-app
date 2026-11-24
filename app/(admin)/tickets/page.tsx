import type { Metadata } from 'next';

import { TicketsView } from './tickets-view';

export const metadata: Metadata = { title: 'Support tickets' };

export default function TicketsPage() {
  return <TicketsView />;
}
