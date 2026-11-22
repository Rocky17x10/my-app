import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export const metadata: Metadata = { title: 'Support' };

export default function Page() {
  return <PlaceholderPage title="Support" description="Ask IT for help and follow your tickets." />;
}
