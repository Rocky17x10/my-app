import type { Metadata } from 'next';

import { MyAssetsView } from './my-assets-view';

export const metadata: Metadata = { title: 'My assets' };

export default function MyAssetsPage() {
  return <MyAssetsView />;
}
