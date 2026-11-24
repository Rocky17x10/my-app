import type { Metadata } from 'next';

import { MaintenanceView } from './maintenance-view';

export const metadata: Metadata = { title: 'Maintenance' };

export default function MaintenancePage() {
  return <MaintenanceView />;
}
