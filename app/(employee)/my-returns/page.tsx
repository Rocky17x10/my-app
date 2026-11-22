import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export const metadata: Metadata = { title: 'My returns' };

export default function Page() {
  return <PlaceholderPage title="My returns" description="Devices you are handing back to IT." />;
}
