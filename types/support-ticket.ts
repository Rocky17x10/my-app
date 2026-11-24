import type { User, UserRef } from './user';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_for_employee'
  | 'resolved'
  | 'closed'
  | 'reopened';

export interface TicketMessage {
  id: number;
  /** `{ id, name }` only for non-admin callers. */
  sender: User | UserRef;
  message: string;
  /** Admin-only notes; non-admins never receive `true` ones. */
  isInternalNote: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  /** `IT-YYYY-0001` */
  ticketNumber: string;
  subject: string;
  category: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: User | UserRef;
  assignedTo: User | UserRef | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only on `GET /support-tickets/:id` and the message/status responses. */
  messages?: TicketMessage[];
}
