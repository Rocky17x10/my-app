'use client';

import Link from 'next/link';

import { IdTag, PriorityBadge, PRIORITY_META, Select, StatusBadge, STATUS_META, type Column } from '@/components/ui';
import { formatDateTime, timeAgo } from '@/lib/format';
import type { SupportTicket, TicketPriority, TicketStatus } from '@/types';

export const TICKET_STATUSES: TicketStatus[] = [
  'open',
  'in_progress',
  'waiting_for_employee',
  'resolved',
  'closed',
  'reopened',
];
export const TICKET_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
/** Suggestions for the free-text `category` column. */
export const TICKET_CATEGORIES = [
  'Hardware',
  'Software',
  'Network and Wi-Fi',
  'Account and access',
  'Email',
  'Printer',
  'Other',
];

export type TicketFilters = { status: TicketStatus | ''; priority: TicketPriority | '' };

export function TicketFilterSelects({
  filters,
  setFilter,
}: {
  filters: Partial<TicketFilters>;
  setFilter: <K extends keyof TicketFilters>(key: K, value: TicketFilters[K] | undefined) => void;
}) {
  return (
    <>
      <Select
        aria-label="Status"
        className="w-48"
        value={filters.status ?? ''}
        onChange={(event) => setFilter('status', event.target.value as TicketStatus | '')}
      >
        <option value="">All statuses</option>
        {TICKET_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Priority"
        className="w-40"
        value={filters.priority ?? ''}
        onChange={(event) => setFilter('priority', event.target.value as TicketPriority | '')}
      >
        <option value="">All priorities</option>
        {TICKET_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_META[priority].label}
          </option>
        ))}
      </Select>
    </>
  );
}

export function RelativeTime({ value }: { value: string }) {
  return (
    <time dateTime={value} title={formatDateTime(value)} className="whitespace-nowrap text-muted">
      {timeAgo(value)}
    </time>
  );
}

/** Table columns shared by the admin and employee ticket lists. */
export function ticketColumns(base: '/tickets' | '/support', withRequester: boolean): Column<SupportTicket>[] {
  const requester: Column<SupportTicket> = {
    key: 'requester',
    header: 'Requester',
    hideBelow: 'md',
    cell: (t) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{t.createdBy.name}</p>
        {'department' in t.createdBy && (
          <p className="truncate text-xs text-muted">{t.createdBy.department || t.createdBy.email}</p>
        )}
      </div>
    ),
  };
  return [
    {
      key: 'ticket',
      header: 'Ticket',
      cell: (t) => (
        <Link href={`${base}/${t.id}`} className="group/ticket flex min-w-48 flex-col gap-1 py-0.5">
          <span className="line-clamp-2 font-medium text-foreground group-hover/ticket:text-primary group-hover/ticket:underline">
            {t.subject}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <IdTag>{t.ticketNumber}</IdTag>
            {t.category}
          </span>
        </Link>
      ),
    },
    ...(withRequester ? [requester] : []),
    { key: 'priority', header: 'Priority', sortKey: 'priority', cell: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'status', header: 'Status', sortKey: 'status', cell: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'created',
      header: 'Opened',
      sortKey: 'createdAt',
      hideBelow: 'sm',
      cell: (t) => <RelativeTime value={t.createdAt} />,
    },
    { key: 'updated', header: 'Last update', hideBelow: 'lg', cell: (t) => <RelativeTime value={t.updatedAt} /> },
  ];
}
