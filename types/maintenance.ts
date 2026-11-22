import type { Asset } from './asset';
import type { User } from './user';

export type MaintenanceStatus = 'in_progress' | 'completed';

export interface Maintenance {
  id: number;
  asset: Asset;
  createdBy: User;
  completedBy: User | null;
  maintenanceType: string;
  problemDescription: string;
  repairDetails: string | null;
  startDate: string;
  completionDate: string | null;
  /** DECIMAL(12,2) comes back as a string, e.g. `"0.00"`. */
  cost: string;
  serviceProvider: string | null;
  status: MaintenanceStatus;
  /** Plural here; asset requests and returns use `adminNote`. */
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}
