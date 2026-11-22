import { Boxes, Building2, History, PackageCheck, UserCheck, Users, Wrench, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge, IdTag, StatusBadge, STATUS_META, type AnyStatus, type Column, type Tone } from '@/components/ui';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import type { Asset, AssignmentHistory, Maintenance, User, UserRef } from '@/types';
import type { CsvValue } from './csv';

/** Row of `GET /reports/employees` (role `user` only). */
export type EmployeeReportRow = Pick<User, 'id' | 'name' | 'email' | 'department' | 'designation'> & {
  assignedAssetCount: number;
  assignedAssets: Asset[];
};

/** Row of `GET /reports/departments`. */
export type DepartmentReportRow = {
  department: string;
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  maintenanceAssets: number;
  retiredAssets: number;
  totalEmployees: number;
};

export type ReportFilter = 'status' | 'department' | 'employeeId' | 'search' | 'from' | 'to';

export type ReportColumn<T> = Omit<Column<T>, 'cell'> & {
  /** Plain value used for CSV, the print view and client-side sorting. */
  value: (row: T) => CsvValue;
  /** Screen cell; defaults to `value`. */
  cell?: (row: T) => ReactNode;
  /** Only in the CSV export. */
  exportOnly?: boolean;
};

export type ReportId =
  | 'assets'
  | 'employees'
  | 'departments'
  | 'assigned-assets'
  | 'available-assets'
  | 'maintenance'
  | 'assignment-history';

export type Report<T> = {
  /** Also the endpoint: `/reports/<id>`. */
  id: ReportId;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  /** Query params the endpoint accepts. */
  filters: ReportFilter[];
  statuses?: AnyStatus[];
  /** What `from`/`to` filter on. */
  dateLabel?: string;
  searchPlaceholder?: string;
  columns: ReportColumn<T>[];
  rowKey: (row: T) => string | number;
};

// Columns are contravariant in T, so the list stores them as `unknown` rows; each report reads only its own rows.
function report<T>(definition: Report<T>): Report<unknown> {
  return definition as unknown as Report<unknown>;
}

/** Local "YYYY-MM-DD HH:mm", sortable and spreadsheet friendly. */
function stamp(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Two({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{primary}</p>
      {secondary && <p className="truncate text-xs text-muted">{secondary}</p>}
    </div>
  );
}

const dash = <span className="text-muted">—</span>;

function day(value: string | null | undefined): ReactNode {
  if (!value) return dash;
  // Date-only values (`YYYY-MM-DD`) have no time worth a tooltip.
  return (
    <span className="whitespace-nowrap" title={value.length > 10 ? formatDateTime(value) : undefined}>
      {formatDate(value)}
    </span>
  );
}

function person(user: User | UserRef | null | undefined): ReactNode {
  if (!user) return dash;
  return <Two primary={user.name} secondary={'email' in user ? user.email : undefined} />;
}

function assetColumns<T>(get: (row: T) => Asset | undefined): ReportColumn<T>[] {
  return [
    {
      key: 'assetTag',
      header: 'Asset tag',
      sortKey: 'assetTag',
      value: (r) => get(r)?.assetTag,
      cell: (r) => <IdTag>{get(r)?.assetTag ?? '—'}</IdTag>,
    },
    {
      key: 'name',
      header: 'Name',
      sortKey: 'name',
      value: (r) => get(r)?.name,
      cell: (r) => {
        const a = get(r);
        return <Two primary={a?.name ?? '—'} secondary={[a?.brand, a?.model].filter(Boolean).join(' ')} />;
      },
    },
  ];
}

const assetTagName = assetColumns<Asset>((a) => a);
const category: ReportColumn<Asset> = { key: 'category', header: 'Category', sortKey: 'category', value: (a) => a.category };
const brand: ReportColumn<Asset> = { key: 'brand', header: 'Brand', exportOnly: true, value: (a) => a.brand };
const model: ReportColumn<Asset> = { key: 'model', header: 'Model', exportOnly: true, value: (a) => a.model };
const serial: ReportColumn<Asset> = { key: 'serial', header: 'Serial number', exportOnly: true, value: (a) => a.serialNumber };
const assetStatus: ReportColumn<Asset> = {
  key: 'status',
  header: 'Status',
  sortKey: 'status',
  value: (a) => STATUS_META[a.status]?.label ?? a.status,
  cell: (a) => <StatusBadge status={a.status} />,
};
const assignedTo: ReportColumn<Asset> = {
  key: 'assignedTo',
  header: 'Assigned to',
  sortKey: 'assignedTo',
  value: (a) => a.assignedTo?.name,
  cell: (a) => person(a.assignedTo),
};
const department: ReportColumn<Asset> = {
  key: 'department',
  header: 'Department',
  sortKey: 'department',
  hideBelow: 'md',
  value: (a) => a.department,
};
const location: ReportColumn<Asset> = {
  key: 'location',
  header: 'Location',
  sortKey: 'location',
  hideBelow: 'lg',
  value: (a) => a.location,
};
const purchased: ReportColumn<Asset> = {
  key: 'purchaseDate',
  header: 'Purchased',
  sortKey: 'purchaseDate',
  hideBelow: 'lg',
  value: (a) => a.purchaseDate,
  cell: (a) => day(a.purchaseDate),
};

const count = (key: keyof DepartmentReportRow, header: string, hideBelow?: Column<unknown>['hideBelow']) =>
  ({ key, header, sortKey: key, align: 'right', hideBelow, value: (d) => d[key] }) satisfies ReportColumn<DepartmentReportRow>;

export const REPORTS: Report<unknown>[] = [
  report<Asset>({
    id: 'assets',
    label: 'All assets',
    description: 'Every asset with its status, holder and location.',
    icon: Boxes,
    tone: 'info',
    filters: ['search', 'status', 'department', 'employeeId', 'from', 'to'],
    statuses: ['available', 'assigned', 'maintenance', 'retired'],
    dateLabel: 'Added',
    searchPlaceholder: 'Search tag, name, brand or holder…',
    rowKey: (a) => a.id,
    columns: [...assetTagName, brand, model, serial, category, assetStatus, assignedTo, department, location, purchased],
  }),
  report<EmployeeReportRow>({
    id: 'employees',
    label: 'Employees',
    description: 'Employees and the assets they hold right now.',
    icon: Users,
    tone: 'pink',
    filters: [],
    rowKey: (e) => e.id,
    columns: [
      { key: 'name', header: 'Employee', sortKey: 'name', value: (e) => e.name, cell: (e) => <Two primary={e.name} secondary={e.email} /> },
      { key: 'email', header: 'Email', exportOnly: true, value: (e) => e.email },
      { key: 'department', header: 'Department', sortKey: 'department', value: (e) => e.department },
      { key: 'designation', header: 'Designation', sortKey: 'designation', hideBelow: 'md', value: (e) => e.designation },
      { key: 'count', header: 'Assets', sortKey: 'count', align: 'right', value: (e) => e.assignedAssetCount },
      {
        key: 'tags',
        header: 'Asset tags',
        hideBelow: 'lg',
        value: (e) => e.assignedAssets.map((a) => a.assetTag).join('; '),
        cell: (e) =>
          e.assignedAssets.length ? (
            <span className="flex flex-wrap gap-1">
              {e.assignedAssets.map((a) => (
                <IdTag key={a.id}>{a.assetTag}</IdTag>
              ))}
            </span>
          ) : (
            dash
          ),
      },
    ],
  }),
  report<DepartmentReportRow>({
    id: 'departments',
    label: 'Departments',
    description: 'Assets and people per department.',
    icon: Building2,
    tone: 'teal',
    filters: [],
    rowKey: (d) => d.department,
    columns: [
      { key: 'department', header: 'Department', sortKey: 'department', value: (d) => d.department, cell: (d) => <span className="font-medium">{d.department}</span> },
      count('totalEmployees', 'Employees'),
      count('totalAssets', 'Assets'),
      count('assignedAssets', 'Assigned'),
      count('availableAssets', 'Available', 'md'),
      count('maintenanceAssets', 'In maintenance', 'md'),
      count('retiredAssets', 'Retired', 'md'),
      {
        key: 'inUse',
        header: 'In use',
        sortKey: 'inUse',
        hideBelow: 'sm',
        value: (d) => {
          const active = d.totalAssets - d.retiredAssets;
          return active > 0 ? Math.round((d.assignedAssets / active) * 100) : 0;
        },
        cell: (d) => {
          const active = d.totalAssets - d.retiredAssets;
          const share = active > 0 ? Math.round((d.assignedAssets / active) * 100) : 0;
          return (
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                <span className="block h-full rounded-full bg-linear-90 from-primary to-info" style={{ width: `${share}%` }} />
              </span>
              <span className="w-9 text-right tabular-nums">{share}%</span>
            </span>
          );
        },
      },
    ],
  }),
  report<Asset>({
    id: 'assigned-assets',
    label: 'Assigned assets',
    description: 'Assets currently assigned, with their holder.',
    icon: UserCheck,
    tone: 'primary',
    filters: ['search', 'department', 'employeeId'],
    searchPlaceholder: 'Search tag, name or holder…',
    rowKey: (a) => a.id,
    columns: [...assetTagName, serial, category, assignedTo, department, location],
  }),
  report<Asset>({
    id: 'available-assets',
    label: 'Available assets',
    description: 'Assets in stock and ready to assign.',
    icon: PackageCheck,
    tone: 'success',
    filters: ['search', 'department'],
    searchPlaceholder: 'Search tag, name or category…',
    rowKey: (a) => a.id,
    columns: [...assetTagName, brand, model, serial, category, { ...department, hideBelow: undefined }, location, purchased],
  }),
  report<Maintenance>({
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Repairs and inspections with cost and provider.',
    icon: Wrench,
    tone: 'warning',
    filters: ['search', 'status', 'from', 'to'],
    statuses: ['in_progress', 'completed'],
    dateLabel: 'Started',
    searchPlaceholder: 'Search asset or problem…',
    rowKey: (m) => m.id,
    columns: [
      ...assetColumns<Maintenance>((m) => m.asset),
      { key: 'type', header: 'Type', sortKey: 'type', value: (m) => m.maintenanceType },
      {
        key: 'problem',
        header: 'Problem',
        hideBelow: 'lg',
        value: (m) => m.problemDescription,
        cell: (m) => <span className="line-clamp-2 max-w-xs">{m.problemDescription}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        sortKey: 'status',
        value: (m) => STATUS_META[m.status]?.label ?? m.status,
        cell: (m) => <StatusBadge status={m.status} />,
      },
      { key: 'start', header: 'Started', sortKey: 'start', value: (m) => m.startDate?.slice(0, 10), cell: (m) => day(m.startDate) },
      {
        key: 'done',
        header: 'Completed',
        sortKey: 'done',
        hideBelow: 'md',
        value: (m) => m.completionDate?.slice(0, 10),
        cell: (m) => day(m.completionDate),
      },
      { key: 'cost', header: 'Cost', sortKey: 'cost', align: 'right', value: (m) => Number(m.cost), cell: (m) => formatMoney(m.cost) },
      { key: 'provider', header: 'Provider', hideBelow: 'lg', value: (m) => m.serviceProvider },
      { key: 'repair', header: 'Repair details', exportOnly: true, value: (m) => m.repairDetails },
      { key: 'createdBy', header: 'Created by', exportOnly: true, value: (m) => m.createdBy?.name },
      { key: 'completedBy', header: 'Completed by', exportOnly: true, value: (m) => m.completedBy?.name },
    ],
  }),
  report<AssignmentHistory>({
    id: 'assignment-history',
    label: 'Assignment history',
    description: 'Every assignment, current and returned, newest first.',
    icon: History,
    tone: 'neutral',
    filters: [],
    rowKey: (h) => h.id,
    columns: [
      ...assetColumns<AssignmentHistory>((h) => h.asset),
      { key: 'employee', header: 'Employee', sortKey: 'employee', value: (h) => h.assignedTo?.name, cell: (h) => person(h.assignedTo) },
      { key: 'by', header: 'Assigned by', sortKey: 'by', hideBelow: 'md', value: (h) => h.assignedBy?.name },
      {
        key: 'assigned',
        header: 'Assigned',
        sortKey: 'assigned',
        value: (h) => stamp(h.assignedAt),
        cell: (h) => day(h.assignedAt),
      },
      {
        key: 'returned',
        header: 'Returned',
        sortKey: 'returned',
        value: (h) => (h.returnedAt ? stamp(h.returnedAt) : 'Still assigned'),
        cell: (h) =>
          h.returnedAt ? (
            day(h.returnedAt)
          ) : (
            <Badge tone="info" dot>
              Still assigned
            </Badge>
          ),
      },
    ],
  }),
];
