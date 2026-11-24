import type { Asset, AssignmentHistory } from './asset';
import type { RequestStatus } from './asset-request';
import type { User, UserRef } from './user';

export type ReturnStatus = RequestStatus;
export type ReturnCondition = 'good' | 'damaged' | 'needs_maintenance';

export interface AssetReturn {
  id: number;
  asset: Asset;
  /** Bare row, no nested relations. */
  assignmentHistory: AssignmentHistory;
  requestedBy: User;
  /** `{ id, name }` only on `/asset-returns/my`. */
  reviewedBy: User | UserRef | null;
  status: ReturnStatus;
  condition: ReturnCondition | null;
  employeeNote: string | null;
  adminNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  confirmedAt: string | null;
}
