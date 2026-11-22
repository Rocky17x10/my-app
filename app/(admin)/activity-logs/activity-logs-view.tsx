'use client';

import { ChevronRight, Laptop, PackagePlus, Undo2, UserRound, Wrench, X, type LucideIcon } from 'lucide-react';
import { Fragment } from 'react';

import { Badge, Button, DataTable, IconChip, PageHeader, Select, type Column, type Tone } from '@/components/ui';
import { DateFilter } from '@/features/reports/date-filter';
import { formatDateTime, timeAgo } from '@/lib/format';
import { usePagedList } from '@/lib/hooks';
import type { ActivityEntityType, ActivityLog } from '@/types';

const ENTITIES: Record<ActivityEntityType, { label: string; icon: LucideIcon; tone: Tone; actions: string[] }> = {
  employee: {
    label: 'Employees',
    icon: UserRound,
    tone: 'pink',
    actions: [
      'EMPLOYEE_CREATED',
      'EMPLOYEE_UPDATED',
      'EMPLOYEE_ROLE_CHANGED',
      'EMPLOYEE_ACTIVATED',
      'EMPLOYEE_DEACTIVATED',
      'EMPLOYEE_DELETED',
      'PASSWORD_CHANGED',
      'PASSWORD_RESET',
    ],
  },
  asset: {
    label: 'Assets',
    icon: Laptop,
    tone: 'info',
    actions: ['ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_ASSIGNED', 'ASSET_UNASSIGNED'],
  },
  asset_request: {
    label: 'Asset requests',
    icon: PackagePlus,
    tone: 'primary',
    actions: ['ASSET_REQUEST_CREATED', 'ASSET_REQUEST_APPROVED', 'ASSET_REQUEST_REJECTED'],
  },
  asset_return: {
    label: 'Asset returns',
    icon: Undo2,
    tone: 'teal',
    actions: ['ASSET_RETURN_REQUESTED', 'ASSET_RETURN_APPROVED', 'ASSET_RETURN_REJECTED'],
  },
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    tone: 'warning',
    actions: ['MAINTENANCE_CREATED', 'MAINTENANCE_UPDATED', 'MAINTENANCE_STATUS_CHANGED'],
  },
};

const ENTITY_SINGULAR: Record<ActivityEntityType, string> = {
  employee: 'Employee',
  asset: 'Asset',
  asset_request: 'Request',
  asset_return: 'Return',
  maintenance: 'Maintenance',
};

type Filters = { action: string; entityType: ActivityEntityType | ''; from: string; to: string };

/** `ASSET_REQUEST_APPROVED` → "Asset request approved". */
function actionLabel(action: string): string {
  const text = action.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Same colour language as statuses: red = removed/refused, green = added/approved, amber = waiting. */
function actionTone(action: string): Tone {
  if (/DELETED|REJECTED|DEACTIVATED/.test(action)) return 'danger';
  if (/REQUEST_CREATED|REQUESTED/.test(action)) return 'warning';
  if (/CREATED|APPROVED|ACTIVATED/.test(action)) return 'success';
  if (/UNASSIGNED/.test(action)) return 'neutral';
  if (/ASSIGNED/.test(action)) return 'info';
  if (/PASSWORD|ROLE/.test(action)) return 'pink';
  if (/STATUS/.test(action)) return 'teal';
  return 'primary';
}

/** `previousRole` → "Previous role". */
function keyLabel(key: string): string {
  const text = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function valueText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value !== 'object') return String(value);
  // Related records are logged as `{ id, name }`: show "Ayesha Rahman (#3)" instead of JSON.
  if ('name' in value && typeof value.name === 'string') {
    return 'id' in value && value.id !== undefined ? `${value.name} (#${String(value.id)})` : value.name;
  }
  return JSON.stringify(value);
}

function MetadataDetails({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <details className="group/meta mt-1.5">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 transition-transform group-open/meta:rotate-90" aria-hidden="true" />
        Details ({entries.length})
      </summary>
      <dl className="mt-2 grid max-w-xl grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-1 rounded-md border border-border bg-surface-muted/60 p-3 text-xs">
        {entries.map(([key, value]) => (
          <Fragment key={key}>
            <dt className="text-muted">{keyLabel(key)}</dt>
            <dd className="break-words text-foreground">{valueText(value)}</dd>
          </Fragment>
        ))}
      </dl>
    </details>
  );
}

const columns: Column<ActivityLog>[] = [
  {
    key: 'when',
    header: 'When',
    cell: (log) => (
      <div className="whitespace-nowrap">
        <p>{formatDateTime(log.createdAt)}</p>
        <p className="text-xs text-muted">{timeAgo(log.createdAt)}</p>
      </div>
    ),
  },
  {
    key: 'actor',
    header: 'By',
    hideBelow: 'md',
    cell: (log) =>
      log.actor ? (
        <div className="min-w-0">
          <p className="truncate font-medium">{log.actor.name}</p>
          <p className="truncate text-xs text-muted">{log.actor.email}</p>
        </div>
      ) : (
        <span className="text-muted">System</span>
      ),
  },
  {
    key: 'action',
    header: 'Action',
    cell: (log) => (
      <Badge tone={actionTone(log.action)} dot>
        {actionLabel(log.action)}
      </Badge>
    ),
  },
  {
    key: 'entity',
    header: 'Record',
    hideBelow: 'lg',
    cell: (log) => {
      const entity = ENTITIES[log.entityType];
      return (
        <span className="flex items-center gap-2 whitespace-nowrap">
          {entity && <IconChip icon={entity.icon} tone={entity.tone} size="sm" />}
          <span>
            {ENTITY_SINGULAR[log.entityType] ?? log.entityType}
            {log.entityId !== null && <span className="text-muted tabular-nums"> #{log.entityId}</span>}
          </span>
        </span>
      );
    },
  },
  {
    key: 'description',
    header: 'Description',
    className: 'min-w-64',
    cell: (log) => (
      <div>
        <p className="text-foreground">{log.description}</p>
        {log.metadata && <MetadataDetails data={log.metadata} />}
      </div>
    ),
  },
];

export function ActivityLogsView() {
  const list = usePagedList<ActivityLog, Filters>('/activity-logs', { limit: 25 });
  const { action = '', entityType = '', from = '', to = '' } = list.filters;
  const filtered = Boolean(list.search || action || entityType || from || to);
  const groups = (entityType ? [entityType] : (Object.keys(ENTITIES) as ActivityEntityType[])).map((key) => ({
    key,
    ...ENTITIES[key],
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity log" description="Who changed what, and when. Changes to users, assets, requests, returns and maintenance." />

      <DataTable
        {...list.tableProps}
        label="Activity log"
        columns={columns}
        rowKey={(log) => log.id}
        searchPlaceholder="Search description, action or person…"
        filters={
          <>
            <Select
              aria-label="Record type"
              className="w-44"
              value={entityType}
              onChange={(event) => {
                const next = event.target.value as ActivityEntityType | '';
                const keepAction = !next || ENTITIES[next].actions.includes(action);
                list.setFilters({ ...list.filters, entityType: next, action: keepAction ? action : '' });
              }}
            >
              <option value="">All records</option>
              {(Object.keys(ENTITIES) as ActivityEntityType[]).map((key) => (
                <option key={key} value={key}>
                  {ENTITIES[key].label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Action"
              className="w-56"
              value={action}
              onChange={(event) => list.setFilter('action', event.target.value)}
            >
              <option value="">All actions</option>
              {groups.map((group) => (
                <optgroup key={group.key} label={group.label}>
                  {group.actions.map((a) => (
                    <option key={a} value={a}>
                      {actionLabel(a)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <DateFilter label="From" name="From date" value={from} max={to || undefined} onChange={(v) => list.setFilter('from', v)} />
            <DateFilter label="to" name="To date" value={to} min={from || undefined} onChange={(v) => list.setFilter('to', v)} />
            {(action || entityType || from || to) && (
              <Button variant="ghost" size="sm" onClick={() => list.setFilters({})}>
                <X aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </>
        }
        empty={
          filtered
            ? { title: 'No activity matches these filters', description: 'Try another record type, action or date range.' }
            : { title: 'No activity yet', description: 'Changes to users, assets, requests, returns and maintenance are logged here.' }
        }
      />
    </div>
  );
}
