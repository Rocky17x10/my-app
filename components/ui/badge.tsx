import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import type {
  AssetStatus,
  MaintenanceStatus,
  RequestStatus,
  ReturnCondition,
  TicketPriority,
  TicketStatus,
} from '@/types';
import { SOFT, type Tone } from './tone';

export type BadgeProps = {
  tone?: Tone;
  /** Leading dot; on for statuses. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', dot = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        SOFT[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

export type AnyStatus = AssetStatus | RequestStatus | MaintenanceStatus | TicketStatus | ReturnCondition;

/**
 * One colour language for every status in the app (charts use the same tones):
 * green = done/good, blue = in use/in progress, amber = waiting/maintenance,
 * red = retired/rejected, slate = closed, violet = new/open, pink = reopened.
 */
export const STATUS_META: Record<AnyStatus, { label: string; tone: Tone }> = {
  available: { label: 'Available', tone: 'success' },
  assigned: { label: 'Assigned', tone: 'info' },
  maintenance: { label: 'In maintenance', tone: 'warning' },
  retired: { label: 'Retired', tone: 'danger' },
  pending: { label: 'Pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  open: { label: 'Open', tone: 'primary' },
  waiting_for_employee: { label: 'Waiting for employee', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
  reopened: { label: 'Reopened', tone: 'pink' },
  good: { label: 'Good', tone: 'success' },
  damaged: { label: 'Damaged', tone: 'danger' },
  needs_maintenance: { label: 'Needs maintenance', tone: 'warning' },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; tone: Tone }> = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'info' },
  high: { label: 'High', tone: 'warning' },
  urgent: { label: 'Urgent', tone: 'danger' },
};

export function StatusBadge({ status, className }: { status: AnyStatus; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' as const };
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: TicketPriority; className?: string }) {
  const meta = PRIORITY_META[priority] ?? { label: priority, tone: 'neutral' as const };
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}

/** Machine identifiers (asset tag, serial number, ticket number), printed like a label. */
export function IdTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border-strong bg-surface-muted px-1.5 py-px font-mono text-xs font-medium whitespace-nowrap text-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}
