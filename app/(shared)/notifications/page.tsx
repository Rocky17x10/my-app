import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export const metadata: Metadata = { title: 'Notifications' };

export default function Page() {
  return <PlaceholderPage title="Notifications" description="Assignments, request decisions and ticket replies." />;
}
