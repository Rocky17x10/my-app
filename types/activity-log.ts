import type { User } from './user';

export type ActivityEntityType =
  | 'employee'
  | 'asset'
  | 'asset_request'
  | 'asset_return'
  | 'maintenance';

export interface ActivityLog {
  id: number;
  actor: User | null;
  /** e.g. `ASSET_ASSIGNED`; full list in API_DOCUMENTATION.md §3. */
  action: string;
  entityType: ActivityEntityType;
  entityId: number | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
