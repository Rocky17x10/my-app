'use client';

import { CircleCheck, CircleX, Clock } from 'lucide-react';

import { StatCard } from '@/components/ui/card';
import { useApi } from '@/lib/hooks/use-api';
import type { AssetReturn, Page, ReturnStatus } from '@/types';

/** Totals per status from `/asset-returns` or `/asset-returns/my` (one `limit=1` request each). */
export function useReturnCounts(path: string) {
  const pending = useApi<Page<AssetReturn>>(path, { status: 'pending', limit: 1 });
  const approved = useApi<Page<AssetReturn>>(path, { status: 'approved', limit: 1 });
  const rejected = useApi<Page<AssetReturn>>(path, { status: 'rejected', limit: 1 });
  return {
    pending: pending.data?.total,
    approved: approved.data?.total,
    rejected: rejected.data?.total,
    reload: () => {
      pending.reload();
      approved.reload();
      rejected.reload();
    },
  };
}

const CARDS = [
  { status: 'pending', label: 'Pending', icon: Clock, tone: 'warning' },
  { status: 'approved', label: 'Approved', icon: CircleCheck, tone: 'success' },
  { status: 'rejected', label: 'Rejected', icon: CircleX, tone: 'danger' },
] as const;

export function ReturnStats({
  counts,
  hints,
}: {
  counts: ReturnType<typeof useReturnCounts>;
  hints: Record<ReturnStatus, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CARDS.map(({ status, label, icon, tone }) => (
        <StatCard
          key={status}
          label={label}
          value={counts[status]?.toLocaleString()}
          icon={icon}
          tone={tone}
          hint={hints[status]}
          loading={counts[status] === undefined}
        />
      ))}
    </div>
  );
}
