'use client';

import { CircleExclamationPoint, History, Undo2, UserCheck, Users } from 'lucide-react';
import Link from 'next/link';

import { Badge, IdTag, STATUS_META, StatusBadge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, StatCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconChip } from '@/components/ui/icon-chip';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { brandModel, DetailList } from '@/features/assets/detail-list';
import { Person } from '@/features/assets/person';
import { formatDate, formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/hooks/use-api';
import type { Asset, AssignmentHistory } from '@/types';

const DAY = 86_400_000;

/** "3 days", "5 months"; how long an assignment lasted (or has lasted so far). */
function duration(from: string, to: string | null): string {
  const days = Math.max(0, Math.round(((to ? new Date(to) : new Date()).getTime() - new Date(from).getTime()) / DAY));
  if (days < 1) return 'less than a day';
  if (days < 60) return `${days} ${days === 1 ? 'day' : 'days'}`;
  const months = Math.round(days / 30);
  return months < 24 ? `${months} months` : `${Math.round(days / 365)} years`;
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-[8.5rem] rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-lg lg:col-span-3" />
        <Skeleton className="h-80 rounded-lg lg:col-span-2" />
      </div>
    </div>
  );
}

function Timeline({ history }: { history: AssignmentHistory[] }) {
  return (
    <ol className="flex flex-col">
      {history.map((record, index) => {
        const active = record.returnedAt === null;
        return (
          <li key={record.id} className="relative flex gap-4 pb-6 last:pb-0">
            {index < history.length - 1 && (
              <span aria-hidden="true" className="absolute top-10 bottom-1 left-[1.125rem] w-px bg-border" />
            )}
            <IconChip icon={active ? UserCheck : Undo2} tone={active ? 'info' : 'success'} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Person
                  name={record.assignedTo?.name ?? 'Unknown employee'}
                  detail={[record.assignedTo?.email, record.assignedTo?.department].filter(Boolean).join(' · ')}
                  className="text-sm"
                />
                {active ? <Badge tone="info" dot>Current holder</Badge> : <Badge tone="success" dot>Returned</Badge>}
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Assigned</dt>
                  <dd className="text-foreground">{formatDateTime(record.assignedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Returned</dt>
                  <dd className="text-foreground">{active ? 'Still assigned' : formatDateTime(record.returnedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Assigned by</dt>
                  <dd className={record.assignedBy ? 'text-foreground' : 'text-warning'}>
                    {record.assignedBy?.name ?? 'Not recorded (legacy assignment)'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{active ? 'Held for' : 'Held'}</dt>
                  <dd className="text-foreground">{duration(record.assignedAt, record.returnedAt)}</dd>
                </div>
              </dl>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function AssetHistoryView({ id }: { id: string }) {
  const valid = /^\d+$/.test(id);
  const asset = useApi<Asset>(valid ? `/assets/${id}` : null);
  const history = useApi<AssignmentHistory[]>(valid ? `/assets/${id}/history` : null);
  const back = { href: '/', label: 'Assets' };

  const failed = !valid || asset.error || history.error;
  if (failed) {
    const notFound = !valid || asset.error?.status === 404 || history.error?.status === 404;
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Asset history" back={back} />
        <Card>
          <EmptyState
            icon={CircleExclamationPoint}
            tone={notFound ? 'warning' : 'danger'}
            title={notFound ? 'This asset does not exist' : 'The history could not be loaded'}
            description={
              notFound ? 'It may have been removed, or the link is wrong.' : (asset.error ?? history.error)?.message
            }
            action={
              notFound ? (
                <Link href="/" className={buttonClasses('secondary')}>
                  Back to assets
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    asset.reload();
                    history.reload();
                  }}
                >
                  Try again
                </Button>
              )
            }
          />
        </Card>
      </div>
    );
  }

  if (!asset.data || !history.data) return <HistorySkeleton />;

  const item = asset.data;
  const records = history.data;
  const people = new Set(records.map((record) => record.assignedTo?.id)).size;
  const holder = item.assignedTo ?? records.find((record) => record.returnedAt === null)?.assignedTo ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={back}
        title={item.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <IdTag>{item.assetTag}</IdTag>
            <span>{[item.category, brandModel(item)].filter(Boolean).join(' · ')}</span>
            <StatusBadge status={item.status} />
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Assignments"
          value={records.length.toLocaleString()}
          icon={History}
          tone="primary"
          hint={records.length > 0 ? `First on ${formatDate(records.at(-1)?.assignedAt)}` : 'Never assigned'}
        />
        <StatCard
          label="Employees"
          value={people.toLocaleString()}
          icon={Users}
          tone="pink"
          hint="Different people who held it"
        />
        <StatCard
          label="Current holder"
          value={<span className="block truncate text-xl leading-9">{holder?.name ?? 'Nobody'}</span>}
          icon={UserCheck}
          tone="info"
          hint={holder ? holder.email : STATUS_META[item.status].label}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card
          title="Assignment history"
          description="Newest first. Every assignment and return of this asset."
          className="lg:col-span-3"
        >
          {records.length === 0 ? (
            <EmptyState
              icon={History}
              tone="info"
              title="Never assigned"
              description="Assignments appear here once this asset is given to an employee."
            />
          ) : (
            <Timeline history={records} />
          )}
        </Card>

        <Card title="Asset details" className="lg:col-span-2">
          <DetailList
            items={[
              ['Asset tag', <IdTag key="tag">{item.assetTag}</IdTag>],
              ['Category', item.category],
              ['Brand', item.brand],
              ['Model', item.model],
              ['Serial number', item.serialNumber && <span key="serial" className="font-mono text-xs">{item.serialNumber}</span>],
              ['Purchase date', item.purchaseDate && formatDate(item.purchaseDate)],
              ['Department', item.department],
              ['Location', item.location],
              ['Added', formatDate(item.createdAt)],
              ['Last updated', formatDate(item.updatedAt)],
            ]}
          />
          {item.notes && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs text-muted">Notes</p>
              <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">{item.notes}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
