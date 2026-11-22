'use client';

import { CircleCheck, CircleX, ClipboardCheck, Eye, Hourglass, PackagePlus, RefreshCw } from 'lucide-react';

import { Button, DataTable, PageHeader, Select, StatCard, StatusBadge, useToast, type Column } from '@/components/ui';
import { useDialogTarget } from '@/features/dialogs/use-dialog-target';
import { formatDate } from '@/lib/format';
import { useApi, usePagedList } from '@/lib/hooks';
import type { AssetRequest, Page, RequestStatus } from '@/types';
import { ReviewDialog } from './review-dialog';

type Filters = { status: RequestStatus | '' };

const columns: Column<AssetRequest>[] = [
  {
    key: 'item',
    header: 'Item',
    sortKey: 'itemName',
    cell: (r) => (
      <div className="min-w-40">
        <p className="font-medium">{r.itemName}</p>
        <p className="text-muted">
          <span className="tabular-nums">#{r.id}</span> · {r.category}
        </p>
      </div>
    ),
  },
  {
    key: 'employee',
    header: 'Requested by',
    hideBelow: 'sm',
    cell: (r) => (
      <div className="min-w-0">
        <p className="truncate">{r.requestedBy.name}</p>
        <p className="truncate text-muted">{r.requestedBy.email}</p>
      </div>
    ),
  },
  {
    key: 'submitted',
    header: 'Submitted',
    sortKey: 'createdAt',
    hideBelow: 'md',
    cell: (r) => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span>,
  },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (r) => <StatusBadge status={r.status} /> },
  {
    key: 'reviewer',
    header: 'Reviewed by',
    hideBelow: 'lg',
    cell: (r) => r.reviewedBy?.name ?? <span className="text-muted">—</span>,
  },
];

export function AssetRequestsView() {
  const toast = useToast();
  const list = usePagedList<AssetRequest, Filters>('/asset-requests', { sort: 'createdAt' });
  const all = useApi<Page<AssetRequest>>('/asset-requests', { limit: 1 });
  const pending = useApi<Page<AssetRequest>>('/asset-requests', { status: 'pending', limit: 1 });
  const approved = useApi<Page<AssetRequest>>('/asset-requests', { status: 'approved', limit: 1 });
  const rejected = useApi<Page<AssetRequest>>('/asset-requests', { status: 'rejected', limit: 1 });
  const review = useDialogTarget<AssetRequest>();
  const filtered = Boolean(list.search || list.filters.status);

  function refresh() {
    list.reload();
    all.reload();
    pending.reload();
    approved.reload();
    rejected.reload();
  }

  const waiting = pending.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Asset requests" description="Equipment employees asked for. Review each one and leave a note." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All requests" value={all.data?.total.toLocaleString()} icon={PackagePlus} tone="info" hint="Since the system started" loading={!all.data} />
        <StatCard
          label="Pending"
          value={waiting.toLocaleString()}
          icon={Hourglass}
          tone="warning"
          hint={waiting > 0 ? 'Waiting for your review' : 'All reviewed'}
          loading={!pending.data}
        />
        <StatCard label="Approved" value={approved.data?.total.toLocaleString()} icon={CircleCheck} tone="success" hint="Accepted requests" loading={!approved.data} />
        <StatCard label="Rejected" value={rejected.data?.total.toLocaleString()} icon={CircleX} tone="danger" hint="Declined requests" loading={!rejected.data} />
      </div>

      <DataTable
        {...list.tableProps}
        label="Asset requests"
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search item, category or employee…"
        toolbarActions={
          <Button variant="secondary" size="sm" onClick={refresh} disabled={list.loading}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        }
        filters={
          <Select
            aria-label="Status"
            className="w-44"
            value={list.filters.status ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value as Filters['status'])}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        }
        rowActionsLabel={(r) => `Actions for request #${r.id}`}
        rowActions={(r) => [
          r.status === 'pending'
            ? { label: 'Review request', icon: ClipboardCheck, onSelect: () => review.show(r) }
            : { label: 'View details', icon: Eye, onSelect: () => review.show(r) },
        ]}
        empty={
          filtered
            ? { title: 'No requests match these filters', description: 'Try another search or status.' }
            : { title: 'No asset requests yet', description: 'Requests appear here when employees ask for equipment.' }
        }
      />

      {review.target && (
        <ReviewDialog
          key={`review-${review.key}`}
          request={review.target}
          open={review.open}
          onClose={review.close}
          onStale={refresh}
          onReviewed={(updated) => {
            review.close();
            toast.success(
              updated.status === 'approved' ? 'Request approved' : 'Request rejected',
              `${updated.itemName} for ${updated.requestedBy.name}. They have been notified.`,
            );
            refresh();
          }}
        />
      )}
    </div>
  );
}
