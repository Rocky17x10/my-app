'use client';

import {
  Boxes,
  ChartColumn,
  ChevronRight,
  CircleExclamationPoint,
  Laptop,
  PackagePlus,
  Undo2,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { useCurrentUser } from '@/components/shell/current-user';
import { STATUS_META } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, StatCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconChip } from '@/components/ui/icon-chip';
import { Skeleton } from '@/components/ui/skeleton';
import { SOLID, STROKE, type Tone } from '@/components/ui/tone';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/hooks/use-api';
import type { AssetStatus, DashboardStatistics } from '@/types';

const FLEET: { status: AssetStatus; key: keyof DashboardStatistics['summary'] }[] = [
  { status: 'available', key: 'availableAssets' },
  { status: 'assigned', key: 'assignedAssets' },
  { status: 'maintenance', key: 'maintenanceAssets' },
  { status: 'retired', key: 'retiredAssets' },
];

const SHORTCUTS: { label: string; text: string; href: string; icon: LucideIcon; tone: Tone }[] = [
  { label: 'Add an asset', text: 'Register new equipment', href: '/', icon: Laptop, tone: 'info' },
  { label: 'Add a user', text: 'Create an employee account', href: '/users', icon: UserPlus, tone: 'pink' },
  { label: 'Review returns', text: 'Check handed-back devices', href: '/returns', icon: Undo2, tone: 'teal' },
  { label: 'Open reports', text: 'Export and print lists', href: '/reports', icon: ChartColumn, tone: 'warning' },
];

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Donut chart: one segment per asset status, same colours as the status badges. */
function FleetDonut({ segments, total }: { segments: { tone: Tone; value: number }[]; total: number }) {
  // r = 100 / 2π, so the circumference is 100 and dash lengths are percentages.
  const arcs = segments.reduce<{ tone: Tone; length: number; start: number }[]>((list, { tone, value }) => {
    const previous = list.at(-1);
    const start = previous ? previous.start + previous.length : 0;
    return [...list, { tone, length: total > 0 ? (value / total) * 100 : 0, start }];
  }, []);
  return (
    <div className="relative size-44 shrink-0">
      <svg viewBox="0 0 42 42" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5" className="stroke-surface-muted" />
        {arcs.map(({ tone, length, start }) =>
          length > 0 ? (
            <circle
              key={tone}
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              strokeWidth="5"
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={-start}
              className={STROKE[tone]}
            />
          ) : null,
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{total.toLocaleString()}</span>
        <span className="text-xs text-muted">assets</span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-32 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-[8.5rem] rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-lg lg:col-span-3" />
        <Skeleton className="h-80 rounded-lg lg:col-span-2" />
      </div>
    </div>
  );
}

export function DashboardView() {
  const { user } = useCurrentUser();
  const stats = useApi<DashboardStatistics>('/dashboard/statistics');

  if (!stats.data) {
    if (!stats.error) return <DashboardSkeleton />;
    return (
      <Card>
        <EmptyState
          icon={CircleExclamationPoint}
          tone="danger"
          title="The dashboard could not be loaded"
          description={stats.error.message}
          action={
            <Button variant="secondary" onClick={stats.reload}>
              Try again
            </Button>
          }
        />
      </Card>
    );
  }

  const { summary, departmentStatistics } = stats.data;
  const active = summary.totalAssets - summary.retiredAssets;
  const inUse = percent(summary.assignedAssets, active);
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const segments = FLEET.map(({ status, key }) => ({
    status,
    tone: STATUS_META[status].tone,
    label: STATUS_META[status].label,
    value: summary[key],
  }));

  const departments = departmentStatistics.slice(0, 7);
  const otherTotal = departmentStatistics.slice(7).reduce((sum, row) => sum + row.totalAssets, 0);
  if (otherTotal > 0) departments.push({ department: 'Other departments', totalAssets: otherTotal });
  const maxDepartment = Math.max(1, ...departments.map((row) => row.totalAssets));

  return (
    <div className="flex flex-col gap-6">
      <header className="relative overflow-hidden rounded-xl border border-primary/15 bg-linear-110 from-primary/12 via-info/6 to-surface p-6 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              {summary.pendingRequests > 0
                ? `${summary.pendingRequests} asset ${summary.pendingRequests === 1 ? 'request is' : 'requests are'} waiting for your review. ${inUse}% of active equipment is in use.`
                : `No requests are waiting for review. ${inUse}% of active equipment is in use.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className={buttonClasses('secondary')}>
              <Laptop aria-hidden="true" />
              View assets
            </Link>
            {summary.pendingRequests > 0 && (
              <Link href="/asset-requests" className={buttonClasses('primary')}>
                <PackagePlus aria-hidden="true" />
                Review requests
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total assets"
          value={summary.totalAssets.toLocaleString()}
          icon={Boxes}
          tone="primary"
          hint={`${summary.retiredAssets.toLocaleString()} retired`}
          href="/"
        />
        <StatCard
          label="Assigned"
          value={summary.assignedAssets.toLocaleString()}
          icon={Laptop}
          tone="info"
          hint={`${inUse}% of active equipment`}
          href="/"
        />
        <StatCard
          label="Employees"
          value={summary.totalEmployees.toLocaleString()}
          icon={Users}
          tone="teal"
          hint="Accounts with the employee role"
          href="/users"
        />
        <StatCard
          label="Pending requests"
          value={summary.pendingRequests.toLocaleString()}
          icon={PackagePlus}
          tone="warning"
          hint={summary.pendingRequests > 0 ? 'Waiting for review' : 'All reviewed'}
          href="/asset-requests"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card
          title="Fleet status"
          description="Every asset by its current status"
          className="lg:col-span-3"
          actions={
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              Open assets
            </Link>
          }
        >
          {summary.totalAssets === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No assets yet"
              description="Add your first device to start tracking assignments."
              action={
                <Link href="/" className={buttonClasses('primary')}>
                  Add an asset
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
              <FleetDonut segments={segments} total={summary.totalAssets} />
              <ul className="flex w-full flex-1 flex-col gap-4">
                {segments.map((segment) => {
                  const share = percent(segment.value, summary.totalAssets);
                  return (
                    <li key={segment.status}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <span className={cn('size-2.5 rounded-full', SOLID[segment.tone])} aria-hidden="true" />
                          {segment.label}
                        </span>
                        <span className="text-muted tabular-nums">
                          <span className="font-medium text-foreground">{segment.value.toLocaleString()}</span>
                          <span className="ml-2 inline-block w-10 text-right">{share}%</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                        <div
                          className={cn('h-full rounded-full transition-[width] duration-700', SOLID[segment.tone])}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Assets by department" description="Where equipment is used" className="lg:col-span-2">
          {departments.length === 0 ? (
            <EmptyState
              icon={Users}
              tone="teal"
              title="No departments yet"
              description="Set a department on assets to see the split here."
            />
          ) : (
            <ul className="flex flex-col gap-3.5">
              {departments.map((row) => (
                <li key={row.department}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-foreground">{row.department}</span>
                    <span className="font-medium text-foreground tabular-nums">{row.totalAssets.toLocaleString()}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-linear-90 from-primary to-info transition-[width] duration-700"
                      style={{ width: `${(row.totalAssets / maxDepartment) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title" className="mb-3 text-base font-semibold text-foreground">
          Shortcuts
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.label}>
              <Link
                href={shortcut.href}
                className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40"
              >
                <IconChip icon={shortcut.icon} tone={shortcut.tone} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{shortcut.label}</span>
                  <span className="block truncate text-sm text-muted">{shortcut.text}</span>
                </span>
                <ChevronRight
                  className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
