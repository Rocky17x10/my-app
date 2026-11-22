/** `GET /dashboard/statistics` */
export interface DashboardStatistics {
  summary: {
    totalAssets: number;
    availableAssets: number;
    assignedAssets: number;
    maintenanceAssets: number;
    retiredAssets: number;
    /** Role `user` only. */
    totalEmployees: number;
    /** Pending asset requests (returns are not counted). */
    pendingRequests: number;
  };
  /** Ordered by count DESC; blank departments come back as "Unspecified". */
  departmentStatistics: { department: string; totalAssets: number }[];
}
