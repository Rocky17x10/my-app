'use client';

import {
  Archive,
  Boxes,
  CircleCheck,
  CircleExclamationPoint,
  History,
  Laptop,
  Pencil,
  Plus,
  TriangleAlert,
  UserMinus,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';

import { IdTag, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/hooks/use-api';
import { usePagedList } from '@/lib/hooks/use-paged-list';
import type { Asset, AssetStatus, DashboardStatistics } from '@/types';
import { AssetFormDialog } from './asset-form-dialog';
import { AssignDialog } from './assign-dialog';
import { brandModel } from './detail-list';
import { Person } from './person';

type Filters = { status: AssetStatus | ''; category: string };
/** A dialog stays mounted while it closes (focus return); a new `key` per opening resets its form. */
type Opened = { open: boolean; asset: Asset | null; key: number };

const columns: Column<Asset>[] = [
  { key: 'tag', header: 'Tag', sortKey: 'assetTag', cell: (a) => <IdTag>{a.assetTag}</IdTag> },
  {
    key: 'name',
    header: 'Asset',
    sortKey: 'name',
    cell: (a) => (
      <div className="min-w-40">
        <p className="font-medium text-foreground">{a.name}</p>
        {brandModel(a) && <p className="text-xs text-muted">{brandModel(a)}</p>}
      </div>
    ),
  },
  { key: 'category', header: 'Category', sortKey: 'category', hideBelow: 'md', cell: (a) => a.category },
  {
    key: 'assignee',
    header: 'Assigned to',
    hideBelow: 'md',
    cell: (a) => {
      // The API keeps status and assignee in step; flag old rows where they disagree.
      const mismatch = (a.status === 'assigned') !== Boolean(a.assignedTo);
      return (
        <div className="min-w-0">
          {a.assignedTo ? (
            <Person name={a.assignedTo.name} detail={a.assignedTo.email} className="max-w-56" />
          ) : (
            <span className="text-muted">—</span>
          )}
          {mismatch && (
            <p className="mt-1 flex items-center gap-1 text-xs text-warning">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              Status and assignee disagree
            </p>
          )}
        </div>
      );
    },
  },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (a) => <StatusBadge status={a.status} /> },
  {
    key: 'added',
    header: 'Added',
    sortKey: 'createdAt',
    hideBelow: 'lg',
    cell: (a) => <span className="whitespace-nowrap text-muted">{formatDate(a.createdAt)}</span>,
  },
];

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function AssetsView() {
  const toast = useToast();
  const list = usePagedList<Asset, Filters>('/assets', { sort: 'createdAt' });
  const stats = useApi<DashboardStatistics>('/dashboard/statistics');
  // shortcut: loads every asset to list the categories; use a categories endpoint if the API gets one.
  const allAssets = useApi<Asset[]>('/reports/assets');
  const categories = [...new Set((allAssets.data ?? []).map((a) => a.category))].sort((a, b) => a.localeCompare(b));

  const [form, setForm] = useState<Opened>({ open: false, asset: null, key: 0 });
  const [assign, setAssign] = useState<Opened>({ open: false, asset: null, key: 0 });
  const [unassign, setUnassign] = useState<Asset | null>(null);
  const [unassignError, setUnassignError] = useState('');
  const [unassigning, setUnassigning] = useState(false);

  // DataTable's search box keeps its own text; a new key resets it when the filters are cleared.
  const [tableKey, setTableKey] = useState(0);
  const filtered = Boolean(list.search || list.filters.status || list.filters.category);
  const summary = stats.data?.summary;
  const statValue = (value: number | undefined) => (value === undefined ? '—' : value.toLocaleString());

  function refresh() {
    list.reload();
    stats.reload();
  }

  async function confirmUnassign() {
    if (!unassign) return;
    setUnassigning(true);
    setUnassignError('');
    try {
      await api.patch<Asset>(`/assets/${unassign.id}/unassign`);
      toast.success('Asset unassigned', `${unassign.assetTag} is available again.`);
      setUnassign(null);
      refresh();
    } catch (err) {
      setUnassignError(errorMessage(err, 'Could not unassign the asset. Try again.'));
    } finally {
      setUnassigning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Assets"
        description="Every device and accessory the company owns, who holds it and what state it is in."
        actions={
          <Button onClick={() => setForm((f) => ({ open: true, asset: null, key: f.key + 1 }))}>
            <Plus aria-hidden="true" />
            Add asset
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total assets"
          value={statValue(summary?.totalAssets)}
          icon={Boxes}
          tone="primary"
          hint={allAssets.data ? `${categories.length} categories` : 'In the inventory'}
          loading={stats.loading && !summary}
        />
        <StatCard
          label="Available"
          value={statValue(summary?.availableAssets)}
          icon={CircleCheck}
          tone="success"
          hint="Ready to assign"
          loading={stats.loading && !summary}
        />
        <StatCard
          label="Assigned"
          value={statValue(summary?.assignedAssets)}
          icon={Laptop}
          tone="info"
          hint={
            summary
              ? `${percent(summary.assignedAssets, summary.totalAssets - summary.retiredAssets)}% of active equipment`
              : 'With employees'
          }
          loading={stats.loading && !summary}
        />
        <StatCard
          label="In maintenance"
          value={statValue(summary?.maintenanceAssets)}
          icon={Wrench}
          tone="warning"
          hint="Under repair or inspection"
          loading={stats.loading && !summary}
        />
        <StatCard
          label="Retired"
          value={statValue(summary?.retiredAssets)}
          icon={Archive}
          tone="danger"
          hint="Out of service"
          loading={stats.loading && !summary}
        />
      </div>

      <DataTable
        key={`table-${tableKey}`}
        {...list.tableProps}
        label="Assets"
        columns={columns}
        rowKey={(a) => a.id}
        searchPlaceholder="Search tag, name, serial, holder…"
        filters={
          <>
            <Select
              aria-label="Status"
              className="w-44"
              value={list.filters.status ?? ''}
              onChange={(event) => list.setFilter('status', event.target.value as AssetStatus | '')}
            >
              <option value="">All statuses</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">In maintenance</option>
              <option value="retired">Retired</option>
            </Select>
            <Select
              aria-label="Category"
              className="w-44"
              value={list.filters.category ?? ''}
              onChange={(event) => list.setFilter('category', event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </>
        }
        rowActionsLabel={(a) => `Actions for ${a.assetTag}`}
        rowActions={(a) => [
          { label: 'Edit', icon: Pencil, onSelect: () => setForm((f) => ({ open: true, asset: a, key: f.key + 1 })) },
          !a.assignedTo &&
            a.status === 'available' && {
              label: 'Assign',
              icon: UserPlus,
              onSelect: () => setAssign((s) => ({ open: true, asset: a, key: s.key + 1 })),
            },
          { label: 'View history', icon: History, href: `/assets/${a.id}/history` },
          a.assignedTo && 'separator',
          a.assignedTo && {
            label: 'Unassign',
            icon: UserMinus,
            tone: 'danger',
            onSelect: () => {
              setUnassignError('');
              setUnassign(a);
            },
          },
        ]}
        empty={
          filtered
            ? {
                title: 'No assets match these filters',
                description: 'Try another search, or clear the filters to see every asset.',
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
                title: 'No assets yet',
                description: 'Add your first device to start tracking who has what.',
                action: (
                  <Button onClick={() => setForm((f) => ({ open: true, asset: null, key: f.key + 1 }))}>
                    <Plus aria-hidden="true" />
                    Add asset
                  </Button>
                ),
              }
        }
      />

      <AssetFormDialog
        key={`form-${form.key}`}
        open={form.open}
        asset={form.asset}
        categories={categories}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSaved={(saved, created) => {
          setForm((f) => ({ ...f, open: false }));
          toast.success(created ? 'Asset added' : 'Asset updated', `${saved.assetTag} · ${saved.name}`);
          refresh();
          allAssets.reload();
        }}
      />

      <AssignDialog
        key={`assign-${assign.key}`}
        open={assign.open}
        asset={assign.asset}
        onClose={() => setAssign((s) => ({ ...s, open: false }))}
        onAssigned={(saved, employee) => {
          setAssign((s) => ({ ...s, open: false }));
          toast.success('Asset assigned', `${saved.assetTag} is now with ${employee.name}. They have been notified.`);
          refresh();
        }}
      />

      <ConfirmDialog
        open={unassign !== null}
        onClose={() => setUnassign(null)}
        onConfirm={confirmUnassign}
        loading={unassigning}
        title="Unassign asset?"
        description={
          unassign &&
          `${unassign.assignedTo?.name ?? 'The current holder'} will no longer hold ${unassign.assetTag} (${unassign.name}). It becomes available again.`
        }
        confirmLabel="Unassign asset"
      >
        <p className="text-sm text-muted">A pending return request for this asset is closed automatically.</p>
        {unassignError && (
          <p role="alert" className="mt-3 flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {unassignError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
