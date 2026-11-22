'use client';

import { useCallback, useState } from 'react';

import type { Query } from '@/lib/api';
import type { Page, SortOrder } from '@/types';
import { useApi } from './use-api';

export type PagedListOptions<F extends Query> = {
  /** Rows per page (API max 100). Default 25. */
  limit?: number;
  /** Server `sort` value; omitted → the endpoint's default. */
  sort?: string;
  order?: SortOrder;
  /** Initial filters, e.g. `{ status: 'pending' }`. Empty values are not sent. */
  filters?: Partial<F>;
};

type Params<F> = {
  page: number;
  limit: number;
  sort?: string;
  order: SortOrder;
  search: string;
  filters: Partial<F>;
};

/**
 * Server-side paged list: `GET path?page&limit&sort&order&search&...filters` → `Page<T>`.
 * Changing limit, sort, search or a filter goes back to page 1.
 * Feed a DataTable with `<DataTable {...list.tableProps} label columns rowKey />`.
 */
export function usePagedList<T, F extends Query = Query>(path: string | null, options: PagedListOptions<F> = {}) {
  const [params, setParams] = useState<Params<F>>({
    page: 1,
    limit: options.limit ?? 25,
    sort: options.sort,
    order: options.order ?? 'desc',
    search: '',
    filters: options.filters ?? {},
  });

  const { page, limit, sort, order, search, filters } = params;
  const { data, error, loading, reload, setData } = useApi<Page<T>>(path, {
    ...filters,
    page,
    limit,
    sort,
    order,
    search,
  });

  const setPage = useCallback((value: number) => setParams((p) => ({ ...p, page: value })), []);
  const setLimit = useCallback((value: number) => setParams((p) => ({ ...p, limit: value, page: 1 })), []);
  const setSort = useCallback(
    (value: string, direction: SortOrder) => setParams((p) => ({ ...p, sort: value, order: direction, page: 1 })),
    [],
  );
  const setSearch = useCallback((value: string) => setParams((p) => ({ ...p, search: value, page: 1 })), []);
  const setFilter = useCallback(
    <K extends keyof F>(key: K, value: F[K] | undefined) =>
      setParams((p) => ({ ...p, filters: { ...p.filters, [key]: value }, page: 1 })),
    [],
  );
  const setFilters = useCallback((value: Partial<F>) => setParams((p) => ({ ...p, filters: value, page: 1 })), []);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return {
    rows,
    total,
    totalPages,
    page,
    limit,
    sort,
    order,
    search,
    filters,
    loading,
    error,
    reload,
    /** Patch the loaded page locally, e.g. after a row was updated. */
    setData,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setFilter,
    setFilters,
    /** Everything DataTable needs for paging, sorting, search, loading and errors. */
    tableProps: {
      rows,
      page,
      limit,
      total,
      totalPages,
      loading,
      error: error?.message ?? null,
      onRetry: reload,
      onPageChange: setPage,
      onLimitChange: setLimit,
      sort,
      order,
      onSortChange: setSort,
      search,
      onSearchChange: setSearch,
    },
  };
}
