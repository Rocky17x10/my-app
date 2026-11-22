import type { User, UserRef } from './user';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

/** A request for a new item (approving it does not create or assign an asset). */
export interface AssetRequest {
  id: number;
  requestedBy: User;
  itemName: string;
  category: string;
  reason: string;
  status: RequestStatus;
  /** `{ id, name }` only on `/asset-requests/my`. */
  reviewedBy: User | UserRef | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}
