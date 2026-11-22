import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export const metadata: Metadata = { title: 'Reports' };

export default function Page() {
  return <PlaceholderPage title="Reports" description="Lists of assets, people and history to export or print." />;
}
