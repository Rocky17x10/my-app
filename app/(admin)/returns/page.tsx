import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export const metadata: Metadata = { title: 'Returns' };

export default function Page() {
  return <PlaceholderPage title="Returns" description="Review devices that employees hand back." />;
}
