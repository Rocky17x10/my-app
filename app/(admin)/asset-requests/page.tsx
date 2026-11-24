import type { Metadata } from 'next';

import { AssetRequestsView } from './asset-requests-view';

export const metadata: Metadata = { title: 'Asset requests' };

export default function AssetRequestsPage() {
  return <AssetRequestsView />;
}
