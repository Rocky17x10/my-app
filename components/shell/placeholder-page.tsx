import { Construction } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

/** Temporary body of routes that are in the nav but not built yet. Delete when the page lands. */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState
          icon={Construction}
          tone="warning"
          title="Coming soon"
          description="This page is being built. The rest of the app works as usual."
        />
      </Card>
    </div>
  );
}
