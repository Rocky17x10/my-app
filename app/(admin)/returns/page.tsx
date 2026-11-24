import type { Metadata } from 'next';

import { ReturnsView } from './returns-view';

export const metadata: Metadata = { title: 'Returns' };

export default function ReturnsPage() {
  return <ReturnsView />;
}
