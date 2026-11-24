'use client';

import '@/features/reports/print.css';

import { Download, Printer, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

import { useCurrentUser } from '@/components/shell';
import {
  Button,
  DataTable,
  IconChip,
  PageHeader,
  Select,
  STATUS_META,
  useToast,
  type AnyStatus,
  type Column,
} from '@/components/ui';
import { downloadCsv, toCsv, type CsvValue } from '@/features/reports/csv';
import { DateFilter } from '@/features/reports/date-filter';
import {
  REPORTS,
  type DepartmentReportRow,
  type Report,
  type ReportFilter,
  type ReportId,
} from '@/features/reports/definitions';
import { Segmented } from '@/features/reports/segmented';
import { formatDate, formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { Page, SortOrder, User } from '@/types';

type Filters = Partial<Record<ReportFilter, string>>;

const isEmpty = (value: CsvValue) => value === null || value === undefined || value === '';

function compare(a: CsvValue, b: CsvValue): number {
  if (isEmpty(a)) return isEmpty(b) ? 0 : 1;
  if (isEmpty(b)) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/** Plain table of every row (not just the current page), portalled to <body> while printing. */
function PrintSheet({ report, rows, meta }: { report: Report<unknown>; rows: unknown[]; meta: string }) {
  const columns = report.columns.filter((c) => !c.exportOnly);
  return (
    <div className="report-print">
      <h1>{report.label} report</h1>
      <p className="report-print-meta">{meta}</p>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'num' : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={report.rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 'num' : undefined}>
                  {c.value(row) ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportPanel({ report, onReportChange }: { report: Report<unknown>; onReportChange: (id: ReportId) => void }) {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState<{ key?: string; order: SortOrder }>({ order: 'asc' });
  const [printedAt, setPrintedAt] = useState('');
  const has = (filter: ReportFilter) => report.filters.includes(filter);

  const result = useApi<unknown[]>(`/reports/${report.id}`, filters);
  const departments = useApi<DepartmentReportRow[]>(has('department') ? '/reports/departments' : null);
  // shortcut: the first 100 employees by name; switch to a searchable picker when there are more.
  const employees = useApi<Page<User>>(has('employeeId') ? '/users' : null, {
    role: 'user',
    sort: 'name',
    order: 'asc',
    limit: 100,
  });

  const rows = result.data;
  const sorted = useMemo(() => {
    const list = rows ?? [];
    const column = report.columns.find((c) => c.sortKey !== undefined && c.sortKey === sort.key);
    if (!column) return list;
    const sign = sort.order === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => sign * compare(column.value(a), column.value(b)));
  }, [rows, report, sort]);

  const total = sorted.length;
  const columns: Column<unknown>[] = report.columns
    .filter((c) => !c.exportOnly)
    .map((c) => ({
      ...c,
      cell:
        c.cell ??
        ((row: unknown) => {
          const value = c.value(row);
          return isEmpty(value) ? <span className="text-muted">—</span> : value;
        }),
    }));

  function setFilter(key: ReportFilter, value: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
    setPage(1);
  }

  const activeFilters = (Object.keys(filters) as ReportFilter[]).filter((key) => key !== 'search' && filters[key]);

  function describe(key: ReportFilter, value: string): string {
    switch (key) {
      case 'status':
        return `Status: ${STATUS_META[value as AnyStatus]?.label ?? value}`;
      case 'employeeId':
        return `Employee: ${employees.data?.data.find((u) => String(u.id) === value)?.name ?? value}`;
      case 'department':
        return `Department: ${value}`;
      case 'from':
        return `${report.dateLabel} from ${formatDate(value)}`;
      case 'to':
        return `${report.dateLabel} to ${formatDate(value)}`;
      case 'search':
        return `Search: "${value}"`;
    }
  }

  function exportCsv() {
    const csv = toCsv(
      report.columns.map((c) => c.header),
      sorted.map((row) => report.columns.map((c) => c.value(row))),
    );
    const filename = `${report.id}-report-${new Date().toLocaleDateString('en-CA')}.csv`;
    downloadCsv(filename, csv);
    toast.success(`Exported ${total} ${total === 1 ? 'row' : 'rows'}`, filename);
  }

  function print() {
    flushSync(() => setPrintedAt(new Date().toISOString()));
    window.addEventListener('afterprint', () => setPrintedAt(''), { once: true });
    window.print();
  }

  const printMeta = [
    `Generated ${formatDateTime(printedAt)} by ${user.name}`,
    `${total} ${total === 1 ? 'row' : 'rows'}`,
    ...(Object.keys(filters) as ReportFilter[]).flatMap((key) => (filters[key] ? [describe(key, filters[key])] : [])),
  ].join(' · ');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Lists of assets, people and history. Filter, then export as CSV or print."
        actions={
          <>
            <Button variant="secondary" onClick={print} disabled={!rows}>
              <Printer aria-hidden="true" />
              Print
            </Button>
            <Button onClick={exportCsv} disabled={!rows || total === 0}>
              <Download aria-hidden="true" />
              Export CSV
            </Button>
          </>
        }
      />

      <Segmented<ReportId>
        label="Report"
        value={report.id}
        onChange={onReportChange}
        options={REPORTS.map((r) => ({ value: r.id, label: r.label, icon: r.icon }))}
      />

      <section aria-labelledby="report-title" className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <IconChip icon={report.icon} tone={report.tone} />
          <div className="min-w-0">
            <h2 id="report-title" className="text-base font-semibold text-foreground">
              {report.label}
            </h2>
            <p className="text-sm text-muted">{report.description}</p>
          </div>
        </div>

        <DataTable
          label={`${report.label} report`}
          columns={columns}
          rows={sorted.slice((page - 1) * limit, page * limit)}
          rowKey={report.rowKey}
          loading={result.loading}
          error={result.error?.message ?? null}
          onRetry={result.reload}
          page={page}
          limit={limit}
          total={total}
          totalPages={Math.ceil(total / limit)}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          sort={sort.key}
          order={sort.order}
          onSortChange={(key, order) => {
            setSort({ key, order });
            setPage(1);
          }}
          search={filters.search ?? ''}
          onSearchChange={has('search') ? (value) => setFilter('search', value) : undefined}
          searchPlaceholder={report.searchPlaceholder}
          filters={
            report.filters.some((f) => f !== 'search') && (
              <>
                {has('status') && (
                  <Select
                    aria-label="Status"
                    className="w-44"
                    value={filters.status ?? ''}
                    onChange={(event) => setFilter('status', event.target.value)}
                  >
                    <option value="">All statuses</option>
                    {report.statuses?.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_META[status].label}
                      </option>
                    ))}
                  </Select>
                )}
                {has('department') && (
                  <Select
                    aria-label="Department"
                    className="w-44"
                    value={filters.department ?? ''}
                    onChange={(event) => setFilter('department', event.target.value)}
                  >
                    <option value="">All departments</option>
                    {departments.data?.map((d) => (
                      <option key={d.department} value={d.department}>
                        {d.department}
                      </option>
                    ))}
                  </Select>
                )}
                {has('employeeId') && (
                  <Select
                    aria-label="Employee"
                    className="w-48"
                    value={filters.employeeId ?? ''}
                    onChange={(event) => setFilter('employeeId', event.target.value)}
                  >
                    <option value="">All employees</option>
                    {employees.data?.data.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                )}
                {has('from') && (
                  <DateFilter
                    label={`${report.dateLabel} from`}
                    name={`${report.dateLabel} from`}
                    value={filters.from ?? ''}
                    max={filters.to}
                    onChange={(value) => setFilter('from', value)}
                  />
                )}
                {has('to') && (
                  <DateFilter
                    label="to"
                    name={`${report.dateLabel} to`}
                    value={filters.to ?? ''}
                    min={filters.from}
                    onChange={(value) => setFilter('to', value)}
                  />
                )}
                {activeFilters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilters((current) => ({ search: current.search }));
                      setPage(1);
                    }}
                  >
                    <X aria-hidden="true" />
                    Clear filters
                  </Button>
                )}
              </>
            )
          }
          empty={
            activeFilters.length > 0 || filters.search
              ? { title: 'Nothing matches these filters', description: 'Change or clear the filters to see more rows.' }
              : { title: 'This report is empty', description: 'Rows appear here as soon as there is data for it.' }
          }
        />
      </section>

      {printedAt && createPortal(<PrintSheet report={report} rows={sorted} meta={printMeta} />, document.body)}
    </div>
  );
}

export function ReportsView() {
  const [id, setId] = useState<ReportId>('assets');
  const report = REPORTS.find((r) => r.id === id) ?? REPORTS[0];
  // Keyed: switching reports starts with fresh filters, sort and paging.
  return <ReportPanel key={report.id} report={report} onReportChange={setId} />;
}
