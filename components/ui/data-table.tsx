'use client';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  CircleExclamationPoint,
  Search,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import type { SortOrder } from '@/types';
import { Button } from './button';
import { EmptyState } from './empty-state';
import { Input, Select } from './form';
import { Menu, type MenuItem } from './popover';
import { Skeleton } from './skeleton';

export type Column<T> = {
  /** Unique id of the column. */
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Server `sort` value; makes the header a sort button. */
  sortKey?: string;
  align?: 'left' | 'right';
  /** Hide on narrow screens; keep identity + status + actions always visible. */
  hideBelow?: 'sm' | 'md' | 'lg';
  className?: string;
};

export type DataTableProps<T> = {
  /** Accessible name of the table, e.g. "Assets". */
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;

  sort?: string;
  order?: SortOrder;
  onSortChange?: (sort: string, order: SortOrder) => void;

  /** Shows the search box when set. Debounced (300 ms) before `onSearchChange`. */
  onSearchChange?: (search: string) => void;
  search?: string;
  searchPlaceholder?: string;
  /** Filter controls (Selects) next to the search box. */
  filters?: ReactNode;
  /** Right side of the toolbar (e.g. an export button). */
  toolbarActions?: ReactNode;

  /** Row actions in a kebab menu (last column). Return [] for a row without actions. */
  rowActions?: (row: T) => (MenuItem | 'separator' | false | null | undefined)[];
  /** Accessible name of a row's menu, e.g. `(a) => \`Actions for ${a.assetTag}\``. */
  rowActionsLabel?: (row: T) => string;

  /** Shown when there are no rows. */
  empty?: { title: string; description?: ReactNode; action?: ReactNode };
  className?: string;
};

const HIDE: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

const LIMITS = [10, 25, 50, 100];

function SearchBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  const [text, setText] = useState(value);

  useEffect(() => {
    if (text.trim() === value) return;
    const timer = window.setTimeout(() => onChange(text.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <div className="w-full sm:w-72">
      <Input
        type="search"
        icon={<Search />}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={`Search ${label.toLowerCase()}`}
      />
    </div>
  );
}

/**
 * Server-side table: the parent owns page/limit/sort/order/search (usually `usePagedList`,
 * spread as `{...list.tableProps}`) and refetches when a callback fires.
 * Sticky header, row hover, loading skeleton, error and empty states, pagination.
 */
export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  sort,
  order = 'desc',
  onSortChange,
  onSearchChange,
  search = '',
  searchPlaceholder = 'Search…',
  filters,
  toolbarActions,
  rowActions,
  rowActionsLabel,
  empty = { title: 'Nothing here yet' },
  className,
}: DataTableProps<T>) {
  const colCount = columns.length + (rowActions ? 1 : 0);
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  const showToolbar = Boolean(onSearchChange || filters || toolbarActions);
  const firstLoad = loading && rows.length === 0;

  function sortBy(key: string) {
    if (!onSortChange) return;
    onSortChange(key, sort === key && order === 'asc' ? 'desc' : 'asc');
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showToolbar && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {onSearchChange && (
            <SearchBox value={search} onChange={onSearchChange} placeholder={searchPlaceholder} label={label} />
          )}
          {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
          {toolbarActions && <div className="flex items-center gap-2 sm:ml-auto">{toolbarActions}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="max-h-[calc(100dvh-16rem)] min-h-40 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr>
                {columns.map((column) => {
                  const active = column.sortKey !== undefined && sort === column.sortKey;
                  const SortIcon = active ? (order === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cn(
                        'sticky top-0 z-10 border-b border-border bg-surface-muted px-4 py-2.5 text-xs font-medium whitespace-nowrap text-muted',
                        column.align === 'right' ? 'text-right' : 'text-left',
                        column.hideBelow && HIDE[column.hideBelow],
                        column.className,
                      )}
                    >
                      {column.sortKey && onSortChange ? (
                        <button
                          type="button"
                          onClick={() => sortBy(column.sortKey as string)}
                          className={cn(
                            '-mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 hover:bg-border/60 hover:text-foreground',
                            active && 'text-foreground',
                          )}
                        >
                          {column.header}
                          <SortIcon className={cn('size-3.5', !active && 'opacity-50')} aria-hidden="true" />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
                {rowActions && (
                  <th scope="col" className="sticky top-0 z-10 w-12 border-b border-border bg-surface-muted px-2">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody aria-busy={loading || undefined} className={cn(loading && rows.length > 0 && 'opacity-60')}>
              {firstLoad &&
                Array.from({ length: Math.min(limit, 8) }, (_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {Array.from({ length: colCount }, (__, cell) => (
                      <td key={cell} className="border-b border-border px-4 py-3.5">
                        <Skeleton className={cn('h-4', cell === 0 ? 'w-24' : cell % 2 ? 'w-32' : 'w-16')} />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && error && rows.length === 0 && (
                <tr>
                  <td colSpan={colCount}>
                    <EmptyState
                      icon={CircleExclamationPoint}
                      tone="danger"
                      title="This list could not be loaded"
                      description={error}
                      action={
                        onRetry && (
                          <Button variant="secondary" onClick={onRetry}>
                            Try again
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={colCount}>
                    <EmptyState title={empty.title} description={empty.description} action={empty.action} />
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr key={rowKey(row)} className="group">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'border-b border-border px-4 py-2.5 align-middle text-foreground group-last:border-b-0 group-hover:bg-surface-muted/70',
                        column.align === 'right' && 'text-right tabular-nums',
                        column.hideBelow && HIDE[column.hideBelow],
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="border-b border-border px-2 py-1.5 text-right group-last:border-b-0 group-hover:bg-surface-muted/70">
                      {rowActions(row).some(Boolean) && (
                        <Menu label={rowActionsLabel?.(row) ?? 'Row actions'} items={rowActions(row)} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <nav
          aria-label={`${label} pagination`}
          className="flex flex-col gap-3 border-t border-border px-4 py-2.5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="tabular-nums" aria-live="polite">
            {total === 0 ? 'No results' : `${first}–${last} of ${total.toLocaleString()}`}
          </p>
          <div className="flex items-center gap-3">
            {onLimitChange && (
              <label className="flex items-center gap-2">
                <span className="whitespace-nowrap">Rows</span>
                <Select
                  value={limit}
                  onChange={(event) => onLimitChange(Number(event.target.value))}
                  className="w-20"
                >
                  {LIMITS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <span className="tabular-nums whitespace-nowrap">
              Page {totalPages === 0 ? 0 : page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="Previous page"
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="Next page"
                disabled={page >= totalPages || loading}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
