/** Envelope of every paginated list endpoint (and `/activity-logs`). */
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  /** 0 when there are no rows. */
  totalPages: number;
}

export type SortOrder = 'asc' | 'desc';
