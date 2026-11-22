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
    /** Return requests waiting for review. */
    pendingReturns: number;
    /** Maintenance records still in progress. */
    inProgressMaintenance: number;
    /** Tickets that are not resolved or closed. */
    openTickets: number;
  };
  /** Ordered by count DESC; blank departments come back as "Unspecified". */
  departmentStatistics: { department: string; totalAssets: number }[];
}
