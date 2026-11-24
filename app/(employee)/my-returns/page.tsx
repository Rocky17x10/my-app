import type { Metadata } from 'next';

import { MyReturnsView } from './my-returns-view';

export const metadata: Metadata = { title: 'My returns' };

export default function MyReturnsPage() {
  return <MyReturnsView />;
}
