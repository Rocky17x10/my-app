import type { ReactNode } from 'react';

import { StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import type { AssetRequest } from '@/types';

function Item({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-wrap text-foreground">{children}</dd>
    </div>
  );
}

/** Read-only facts of one request; the admin view adds the requester. */
export function RequestDetails({ request, showRequester }: { request: AssetRequest; showRequester?: boolean }) {
  const reviewed = request.status !== 'pending';
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {showRequester && (
        <Item label="Requested by" wide>
          <span className="font-medium">{request.requestedBy.name}</span>
          <span className="text-muted"> · {request.requestedBy.email}</span>
        </Item>
      )}
      <Item label="Item">
        <span className="font-medium">{request.itemName}</span>
      </Item>
      <Item label="Category">{request.category}</Item>
      <Item label="Submitted">{formatDateTime(request.createdAt)}</Item>
      <Item label="Status">
        <StatusBadge status={request.status} />
      </Item>
      <Item label="Reason" wide>
        {request.reason}
      </Item>
      {reviewed && (
        <>
          <Item label="Reviewed by">{request.reviewedBy?.name ?? '—'}</Item>
          <Item label="Reviewed">{formatDateTime(request.updatedAt)}</Item>
          <Item label="Note from IT" wide>
            {request.adminNote || <span className="text-muted">No note</span>}
          </Item>
        </>
      )}
    </dl>
  );
}
