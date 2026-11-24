'use client';

import { CircleCheck, CircleExclamationPoint, ClockArrowLeft, Laptop, PackageOpen } from 'lucide-react';
import Link from 'next/link';

import {
  Badge,
  buttonClasses,
  Card,
  DataTable,
  EmptyState,
  IdTag,
  PageHeader,
  Skeleton,
  StatCard,
  StatusBadge,
  type Column,
} from '@/components/ui';
import { ActiveBadge, RoleBadge, UserAvatar } from '@/features/users/user-meta';
import { formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { AssignmentHistory, User } from '@/types';

const columns: Column<AssignmentHistory>[] = [
  {
    key: 'asset',
    header: 'Asset',
    cell: (h) => (
      <div className="flex min-w-44 flex-col items-start gap-1">
        <IdTag>{h.asset?.assetTag ?? '—'}</IdTag>
        <span className="font-medium">{h.asset?.name}</span>
      </div>
    ),
  },
  {
    key: 'model',
    header: 'Category',
    hideBelow: 'md',
    cell: (h) => (
      <>
        <p>{h.asset?.category}</p>
        <p className="text-muted">{[h.asset?.brand, h.asset?.model].filter(Boolean).join(' · ')}</p>
      </>
    ),
  },
  {
    key: 'by',
    header: 'Assigned by',
    hideBelow: 'lg',
    cell: (h) => h.assignedBy?.name ?? <span className="text-muted">Unknown (older record)</span>,
  },
  { key: 'assigned', header: 'Assigned', cell: (h) => <span className="whitespace-nowrap">{formatDateTime(h.assignedAt)}</span> },
  {
    key: 'returned',
    header: 'Returned',
    hideBelow: 'sm',
    cell: (h) => <span className="whitespace-nowrap">{formatDateTime(h.returnedAt)}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (h) =>
      h.returnedAt ? (
        <Badge tone="neutral" dot>
          Returned
        </Badge>
      ) : (
        <StatusBadge status="assigned" />
      ),
  },
];

export function EmployeeHistoryView({ id }: { id: string }) {
  const employee = useApi<User>(`/users/${encodeURIComponent(id)}`);
  const history = useApi<AssignmentHistory[]>(`/assets/history/employee/${encodeURIComponent(id)}`);
  const rows = history.data ?? [];
  const active = rows.filter((h) => !h.returnedAt).length;
  const user = employee.data;

  if (employee.error && !user) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader back={{ href: '/users', label: 'Users' }} title="Assignment history" />
        <Card>
          <EmptyState
            icon={CircleExclamationPoint}
            tone="danger"
            title={employee.error.status === 404 ? 'This user does not exist' : 'The user could not be loaded'}
            description={employee.error.message}
            action={
              <Link href="/users" className={buttonClasses('secondary')}>
                Back to users
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: '/users', label: 'Users' }}
        title="Assignment history"
        description="Every asset assigned to this person, current and returned."
      />

      <Card>
        {user ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UserAvatar user={user} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">{user.name}</h2>
                <RoleBadge role={user.role} />
                <ActiveBadge active={user.isActive} />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
            </div>
            <dl className="flex gap-8 text-sm sm:text-right">
              {[
                ['Department', user.department],
                ['Designation', user.designation],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-0.5 font-medium text-foreground">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="flex items-center gap-5" aria-busy="true">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="All assignments" value={rows.length} icon={ClockArrowLeft} tone="pink" hint="Since the account was created" loading={!history.data} />
        <StatCard label="Currently assigned" value={active} icon={Laptop} tone="info" hint="Assets in use now" loading={!history.data} />
        <StatCard
          label="Returned"
          value={rows.length - active}
          icon={CircleCheck}
          tone="success"
          hint="Handed back to IT"
          loading={!history.data}
        />
      </div>

      {/* shortcut: this endpoint is unpaged, so the whole list is one page; page it if histories grow long. */}
      <DataTable
        label="Assignment history"
        columns={columns}
        rows={rows}
        rowKey={(h) => h.id}
        loading={history.loading && !history.data}
        error={history.error?.message}
        onRetry={history.reload}
        page={1}
        limit={rows.length || 8}
        total={rows.length}
        totalPages={rows.length ? 1 : 0}
        onPageChange={() => undefined}
        rowActionsLabel={(h) => `Actions for ${h.asset?.assetTag ?? 'assignment'}`}
        rowActions={(h) => [
          h.asset && { label: 'View asset history', icon: PackageOpen, href: `/assets/${h.asset.id}/history` },
        ]}
        empty={{
          title: 'No assignments yet',
          description: 'Assets assigned to this person from the Assets page appear here.',
        }}
      />
    </div>
  );
}
