'use client';

import { ClipboardCheck, Eye, History } from 'lucide-react';
import { useState } from 'react';

import { IdTag, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { Person } from '@/features/assets/person';
import { ReturnStats, useReturnCounts } from '@/features/returns/return-stats';
import { formatDate } from '@/lib/format';
import { usePagedList } from '@/lib/hooks/use-paged-list';
import type { AssetReturn, ReturnStatus } from '@/types';
import { ReviewDialog } from './review-dialog';

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
    key: 'employee',
    header: 'Employee',
    hideBelow: 'md',
    cell: (r) => <Person name={r.requestedBy.name} detail={r.requestedBy.email} className="max-w-60" />,
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
    hideBelow: 'lg',
    cell: (r) => (r.condition ? <StatusBadge status={r.condition} /> : <span className="text-muted">—</span>),
  },
  {
    key: 'reviewed',
    header: 'Reviewed',
    hideBelow: 'lg',
    cell: (r) =>
      r.reviewedAt ? (
        <div className="whitespace-nowrap">
          <p>{formatDate(r.reviewedAt)}</p>
          {r.reviewedBy && <p className="text-xs text-muted">by {r.reviewedBy.name}</p>}
        </div>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
];

export function ReturnsView() {
  const toast = useToast();
  const list = usePagedList<AssetReturn, Filters>('/asset-returns', { sort: 'requestedAt' });
  const counts = useReturnCounts('/asset-returns');
  const [review, setReview] = useState<{ open: boolean; request: AssetReturn | null; key: number }>({
    open: false,
    request: null,
    key: 0,
  });
  const waiting = counts.pending;

  function refresh() {
    list.reload();
    counts.reload();
  }

  const open = (request: AssetReturn) => setReview((s) => ({ open: true, request, key: s.key + 1 }));
  // DataTable's search box keeps its own text; a new key resets it when the filters are cleared.
  const [tableKey, setTableKey] = useState(0);
  const filtered = Boolean(list.search || list.filters.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Returns"
        description={
          waiting === undefined
            ? 'Devices employees want to hand back. Check each one and record its condition.'
            : waiting === 0
              ? 'No returns are waiting for review. Devices employees hand back appear here.'
              : `${waiting} ${waiting === 1 ? 'return is' : 'returns are'} waiting for review. Check each device and record its condition.`
        }
      />

      <ReturnStats
        counts={counts}
        hints={{ pending: 'Waiting for your review', approved: 'Devices back with IT', rejected: 'Kept by the employee' }}
      />

      <DataTable
        key={`table-${tableKey}`}
        {...list.tableProps}
        label="Return requests"
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search asset or employee…"
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
        rowActions={(r) => [
          r.status === 'pending'
            ? { label: 'Review return', icon: ClipboardCheck, onSelect: () => open(r) }
            : { label: 'View details', icon: Eye, onSelect: () => open(r) },
          { label: 'View asset history', icon: History, href: `/assets/${r.asset.id}/history` },
        ]}
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
                description: 'When an employee asks to hand a device back, the request appears here for review.',
              }
        }
      />

      <ReviewDialog
        key={`review-${review.key}`}
        open={review.open}
        request={review.request}
        onClose={() => setReview((s) => ({ ...s, open: false }))}
        onStale={refresh}
        onReviewed={(updated) => {
          setReview((s) => ({ ...s, open: false }));
          const tag = updated.asset.assetTag;
          if (updated.status === 'rejected') {
            toast.success('Return rejected', `${tag} stays with ${updated.requestedBy.name}.`);
          } else if (updated.condition === 'good') {
            toast.success('Return approved', `${tag} is back in stock and available.`);
          } else {
            toast.success('Return approved', `${tag} went to maintenance. A Return inspection record was opened.`);
          }
          refresh();
        }}
      />
    </div>
  );
}
