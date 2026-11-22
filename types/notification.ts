import type { SupportTicket } from './support-ticket';

export type NotificationType =
  | 'support_ticket'
  | 'asset_request_new'
  | 'asset_request_approved'
  | 'asset_request_rejected'
  | 'asset_assigned';

export interface Notification {
  id: number;
  /** asset_request id for `asset_request_*`, asset id for `asset_assigned`, null for tickets. */
  referenceId: number | null;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  /** Set for `support_ticket` (no nested relations); absent on `PATCH /notifications/:id/read`. */
  ticket?: SupportTicket | null;
}
