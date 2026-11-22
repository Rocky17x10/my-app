import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export const metadata: Metadata = { title: 'Support tickets' };

export default function Page() {
  return <PlaceholderPage title="Support tickets" description="Questions and problems raised by employees." />;
}
