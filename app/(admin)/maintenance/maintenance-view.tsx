'use client';

import { CheckCheck, CircleCheck, Eye, Laptop, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Button,
  DataTable,
  Dialog,
  IdTag,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
  useToast,
  type Column,
} from '@/components/ui';
import { useDialogTarget } from '@/features/dialogs/use-dialog-target';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useApi, usePagedList } from '@/lib/hooks';
import type { Asset, Maintenance, MaintenanceStatus, Page } from '@/types';
import { CompleteMaintenanceDialog } from './complete-dialog';
import { StartMaintenanceDialog } from './start-dialog';

type Filters = { status: MaintenanceStatus | '' };

const columns: Column<Maintenance>[] = [
  {
    key: 'asset',
    header: 'Asset',
    cell: (m) => (
      <div className="flex min-w-44 flex-col items-start gap-1">
        <IdTag>{m.asset.assetTag}</IdTag>
        <span className="font-medium">{m.asset.name}</span>
      </div>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    hideBelow: 'sm',
    cell: (m) => (
      <div className="max-w-64">
        <p>{m.maintenanceType}</p>
        <p className="truncate text-muted">{m.problemDescription}</p>
      </div>
    ),
  },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (m) => <StatusBadge status={m.status} /> },
  {
    key: 'start',
    header: 'Started',
    sortKey: 'startDate',
    hideBelow: 'md',
    cell: (m) => <span className="whitespace-nowrap">{formatDate(m.startDate)}</span>,
  },
  {
    key: 'done',
    header: 'Completed',
    hideBelow: 'lg',
    cell: (m) => <span className="whitespace-nowrap">{formatDate(m.completionDate)}</span>,
  },
  {
    key: 'cost',
    header: 'Cost',
    align: 'right',
    hideBelow: 'md',
    cell: (m) => (m.status === 'completed' ? formatMoney(m.cost) : <span className="text-muted">—</span>),
  },
];

function Item({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-wrap text-foreground">{children ?? '—'}</dd>
    </div>
  );
}

function MaintenanceDetails({ record: m }: { record: Maintenance }) {
  const done = m.status === 'completed';
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <Item label="Asset" wide>
        <span className="flex flex-wrap items-center gap-2">
          <IdTag>{m.asset.assetTag}</IdTag>
          <span className="font-medium">{m.asset.name}</span>
          <span className="text-muted">
            {[m.asset.category, m.asset.brand, m.asset.model].filter(Boolean).join(' · ')}
            {m.asset.serialNumber && ` · S/N ${m.asset.serialNumber}`}
          </span>
        </span>
      </Item>
      <Item label="Status">
        <StatusBadge status={m.status} />
      </Item>
      <Item label="Type">{m.maintenanceType}</Item>
      <Item label="Problem" wide>
        {m.problemDescription}
      </Item>
      <Item label="Started">{formatDateTime(m.startDate)}</Item>
      <Item label="Started by">{m.createdBy?.name}</Item>
      <Item label="Service provider">{m.serviceProvider || null}</Item>
      <Item label="Cost">{done ? formatMoney(m.cost) : null}</Item>
      {done && (
        <>
          <Item label="Completed">{formatDateTime(m.completionDate)}</Item>
          <Item label="Completed by">{m.completedBy?.name}</Item>
          <Item label="Repair details" wide>
            {m.repairDetails || null}
          </Item>
        </>
      )}
      <Item label="Notes" wide>
        {m.adminNotes || null}
      </Item>
    </dl>
  );
}

export function MaintenanceView() {
  const toast = useToast();
  const list = usePagedList<Maintenance, Filters>('/maintenance', { sort: 'createdAt' });
  const open = useApi<Page<Maintenance>>('/maintenance', { status: 'in_progress', limit: 1 });
  const done = useApi<Page<Maintenance>>('/maintenance', { status: 'completed', limit: 1 });
  const assets = useApi<Page<Asset>>('/assets', { status: 'maintenance', limit: 1 });
  const start = useDialogTarget<true>();
  const details = useDialogTarget<Maintenance>();
  const complete = useDialogTarget<Maintenance>();
  const filtered = Boolean(list.search || list.filters.status);

  function refresh() {
    list.reload();
    open.reload();
    done.reload();
    assets.reload();
  }

  const startButton = (
    <Button onClick={() => start.show(true)}>
      <Wrench aria-hidden="true" />
      Start maintenance
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Maintenance" description="Repairs and inspections, open and completed." actions={startButton} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="In progress" value={open.data?.total.toLocaleString()} icon={Wrench} tone="info" hint="Open maintenance records" loading={!open.data} />
        <StatCard label="Completed" value={done.data?.total.toLocaleString()} icon={CircleCheck} tone="success" hint="Closed records" loading={!done.data} />
        <StatCard
          label="Assets in maintenance"
          value={assets.data?.total.toLocaleString()}
          icon={Laptop}
          tone="warning"
          hint="Out of service right now"
          loading={!assets.data}
        />
      </div>

      <DataTable
        {...list.tableProps}
        label="Maintenance records"
        columns={columns}
        rowKey={(m) => m.id}
        searchPlaceholder="Search asset, type or problem…"
        filters={
          <Select
            aria-label="Status"
            className="w-44"
            value={list.filters.status ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value as Filters['status'])}
          >
            <option value="">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </Select>
        }
        rowActionsLabel={(m) => `Actions for ${m.asset.assetTag}`}
        rowActions={(m) => [
          { label: 'View details', icon: Eye, onSelect: () => details.show(m) },
          m.status === 'in_progress' && { label: 'Complete', icon: CheckCheck, onSelect: () => complete.show(m) },
        ]}
        empty={
          filtered
            ? { title: 'No records match these filters', description: 'Try another search or status.' }
            : { title: 'No maintenance records', description: 'Records appear when an asset is sent for repair.', action: startButton }
        }
      />

      {start.target && (
        <StartMaintenanceDialog
          key={`start-${start.key}`}
          open={start.open}
          onClose={start.close}
          onStarted={(m) => {
            start.close();
            toast.success('Maintenance started', `${m.asset.assetTag} is now in maintenance.`);
            refresh();
          }}
        />
      )}

      {details.target && (
        <Dialog
          key={`details-${details.key}`}
          open={details.open}
          onClose={details.close}
          size="lg"
          title={`Maintenance #${details.target.id}`}
          description={`${details.target.maintenanceType} · ${details.target.asset.assetTag}`}
          footer={
            <>
              <Button variant="secondary" onClick={details.close} data-autofocus>
                Close
              </Button>
              {details.target.status === 'in_progress' && (
                <Button
                  onClick={() => {
                    const record = details.target;
                    details.close();
                    if (record) complete.show(record);
                  }}
                >
                  <CheckCheck aria-hidden="true" />
                  Complete maintenance
                </Button>
              )}
            </>
          }
        >
          <MaintenanceDetails record={details.target} />
        </Dialog>
      )}

      {complete.target && (
        <CompleteMaintenanceDialog
          key={`complete-${complete.key}`}
          record={complete.target}
          open={complete.open}
          onClose={complete.close}
          onCompleted={(m) => {
            complete.close();
            toast.success('Maintenance completed', `${m.asset.assetTag} is ${m.asset.status === 'available' ? 'available again' : 'closed'}.`);
            refresh();
          }}
        />
      )}
    </div>
  );
}
