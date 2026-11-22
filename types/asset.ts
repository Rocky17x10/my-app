import type { User, UserRef } from './user';

export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired';

export interface Asset {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  status: AssetStatus;
  /** Absent when the endpoint does not load the relation (e.g. `/reports/available-assets`). */
  assignedTo?: User | null;
  department: string | null;
  location: string | null;
  /** Date only, `YYYY-MM-DD`. */
  purchaseDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One assignment of an asset; `returnedAt === null` means it is still active. */
export interface AssignmentHistory {
  id: number;
  asset?: Asset;
  assignedTo?: User;
  /** `{ id, name }` only on `/assets/history/employee/:id`. */
  assignedBy?: User | UserRef | null;
  assignedAt: string;
  returnedAt: string | null;
}
