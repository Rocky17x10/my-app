import type { Metadata } from 'next';

import { ActivityLogsView } from './activity-logs-view';

export const metadata: Metadata = { title: 'Activity log' };

export default function ActivityLogsPage() {
  return <ActivityLogsView />;
}
