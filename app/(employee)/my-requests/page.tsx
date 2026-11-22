import type { Metadata } from 'next';

import { MyRequestsView } from './my-requests-view';

export const metadata: Metadata = { title: 'My requests' };

export default function MyRequestsPage() {
  return <MyRequestsView />;
}
