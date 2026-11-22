import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export const metadata: Metadata = { title: 'Activity log' };

export default function Page() {
  return <PlaceholderPage title="Activity log" description="Who changed what, and when." />;
}
