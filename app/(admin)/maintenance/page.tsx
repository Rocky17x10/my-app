import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export const metadata: Metadata = { title: 'Maintenance' };

export default function Page() {
  return <PlaceholderPage title="Maintenance" description="Repairs and inspections, open and completed." />;
}
