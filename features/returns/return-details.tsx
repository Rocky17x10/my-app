import type { ReactNode } from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { AssetSummary, DetailList } from '@/features/assets/detail-list';
import { formatDateTime } from '@/lib/format';
import type { AssetReturn } from '@/types';

/** Asset summary on top, then every field of a return request. */
export function ReturnDetails({ request, showEmployee = false }: { request: AssetReturn; showEmployee?: boolean }) {
  const reviewed = request.status !== 'pending';
  const items: [string, ReactNode][] = [];
  if (showEmployee) items.push(['Employee', `${request.requestedBy.name} · ${request.requestedBy.email}`]);
  items.push(
    ['Requested', formatDateTime(request.requestedAt)],
    ['Status', <StatusBadge key="status" status={request.status} />],
  );
  if (reviewed) {
    items.push(
      ['Reviewed', formatDateTime(request.reviewedAt)],
      ['Reviewed by', request.reviewedBy?.name],
      ['Condition', request.condition && <StatusBadge key="condition" status={request.condition} />],
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AssetSummary asset={request.asset} />
      <DetailList items={items} />
      <div>
        <p className="text-xs text-muted">{showEmployee ? 'Employee note' : 'Your note'}</p>
        <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">{request.employeeNote || '—'}</p>
      </div>
      {reviewed && (
        <div>
          <p className="text-xs text-muted">{showEmployee ? 'Admin note' : 'Note from IT'}</p>
          <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">{request.adminNote || '—'}</p>
        </div>
      )}
    </div>
  );
}
