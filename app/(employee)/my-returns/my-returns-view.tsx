'use client';

import { Eye, Laptop } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { IdTag, StatusBadge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { ReturnDetails } from '@/features/returns/return-details';
import { ReturnStats, useReturnCounts } from '@/features/returns/return-stats';
import { formatDate } from '@/lib/format';
import { usePagedList } from '@/lib/hooks/use-paged-list';
import type { AssetReturn, ReturnStatus } from '@/types';

type Filters = { status: ReturnStatus | '' };

const columns: Column<AssetReturn>[] = [
  {
    key: 'asset',
    header: 'Asset',
    cell: (r) => (
      <div className="flex min-w-32 flex-col items-start gap-1">
        <IdTag>{r.asset.assetTag}</IdTag>
        <span className="text-xs text-muted">{r.asset.name}</span>
      </div>
    ),
  },
  {
    key: 'requested',
    header: 'Requested',
    sortKey: 'requestedAt',
    hideBelow: 'sm',
    cell: (r) => <span className="whitespace-nowrap">{formatDate(r.requestedAt)}</span>,
  },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (r) => <StatusBadge status={r.status} /> },
  {
    key: 'condition',
    header: 'Condition',
    hideBelow: 'md',
    cell: (r) => (r.condition ? <StatusBadge status={r.condition} /> : <span className="text-muted">—</span>),
  },
  {
    key: 'note',
    header: 'Note from IT',
    hideBelow: 'lg',
    cell: (r) =>
      r.adminNote ? (
        <p className="line-clamp-2 max-w-72 text-muted" title={r.adminNote}>
          {r.adminNote}
        </p>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
];

export function MyReturnsView() {
  const list = usePagedList<AssetReturn, Filters>('/asset-returns/my', { sort: 'requestedAt' });
  const counts = useReturnCounts('/asset-returns/my');
  const [details, setDetails] = useState<AssetReturn | null>(null);
  // DataTable's search box keeps its own text; a new key resets it when the filters are cleared.
  const [tableKey, setTableKey] = useState(0);
  const filtered = Boolean(list.search || list.filters.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My returns"
        description="Devices you asked to hand back, and what IT decided."
        actions={
          <Link href="/my-assets" className={buttonClasses('secondary')}>
            <Laptop aria-hidden="true" />
            My assets
          </Link>
        }
      />

      <ReturnStats
        counts={counts}
        hints={{ pending: 'Waiting for IT to check', approved: 'Handed back to IT', rejected: 'You keep these devices' }}
      />

      <DataTable
        key={`table-${tableKey}`}
        {...list.tableProps}
        label="My return requests"
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search tag or asset name…"
        filters={
          <Select
            aria-label="Status"
            className="w-44"
            value={list.filters.status ?? ''}
            onChange={(event) => list.setFilter('status', event.target.value as ReturnStatus | '')}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        }
        rowActionsLabel={(r) => `Actions for the return of ${r.asset.assetTag}`}
        rowActions={(r) => [{ label: 'View details', icon: Eye, onSelect: () => setDetails(r) }]}
        empty={
          filtered
            ? {
                title: 'No returns match these filters',
                description: 'Try another search or status.',
                action: (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      list.setFilters({});
                      list.setSearch('');
                      setTableKey((k) => k + 1);
                    }}
                  >
                    Clear filters
                  </Button>
                ),
              }
            : {
                title: 'No return requests yet',
                description: 'To hand a device back, open My assets and choose Request return.',
                action: (
                  <Link href="/my-assets" className={buttonClasses('primary')}>
                    <Laptop aria-hidden="true" />
                    Open my assets
                  </Link>
                ),
              }
        }
      />

      <Dialog
        open={details !== null}
        onClose={() => setDetails(null)}
        title={details ? `Return of ${details.asset.assetTag}` : 'Return'}
        description={
          details?.status === 'pending'
            ? 'IT has not reviewed this request yet. You keep the device until they confirm.'
            : 'IT has reviewed this request.'
        }
        footer={
          <Button variant="secondary" onClick={() => setDetails(null)} data-autofocus>
            Close
          </Button>
        }
      >
        {details && <ReturnDetails request={details} />}
      </Dialog>
    </div>
  );
}
