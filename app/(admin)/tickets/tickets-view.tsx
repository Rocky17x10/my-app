'use client';

import { CircleCheck, CircleX, Eye, Hourglass, Inbox, LoaderCircle, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { DataTable, PageHeader, StatCard, STATUS_META, useToast, type Tone } from '@/components/ui';
import { TicketFilterSelects, ticketColumns, type TicketFilters } from '@/features/tickets/ticket-list';
import { api, errorMessage } from '@/lib/api';
import { useApi, usePagedList } from '@/lib/hooks';
import type { Page, SupportTicket, TicketStatus } from '@/types';

const columns = ticketColumns('/tickets', true);

const COUNTS: { status: TicketStatus; icon: LucideIcon; tone: Tone; hint: string }[] = [
  { status: 'open', icon: Inbox, tone: 'primary', hint: 'New, not picked up yet' },
  { status: 'in_progress', icon: LoaderCircle, tone: 'info', hint: 'Being worked on' },
  { status: 'waiting_for_employee', icon: Hourglass, tone: 'warning', hint: 'Waiting for an answer' },
  { status: 'resolved', icon: CircleCheck, tone: 'success', hint: 'Solved, not closed yet' },
];

function StatusCount({ status, icon, tone, hint }: (typeof COUNTS)[number]) {
  const count = useApi<Page<SupportTicket>>('/support-tickets', { status, limit: 1 });
  return (
    <StatCard
      label={STATUS_META[status].label}
      value={count.data?.total.toLocaleString() ?? '–'}
      loading={count.loading && !count.data}
      icon={icon}
      tone={tone}
      hint={hint}
    />
  );
}

export function TicketsView() {
  const toast = useToast();
  const list = usePagedList<SupportTicket, TicketFilters>('/support-tickets', { sort: 'createdAt' });
  // Bumped after a status change so the count cards reload (remount).
  const [version, setVersion] = useState(0);
  const filtered = Boolean(list.search || list.filters.status || list.filters.priority);

  async function setStatus(ticket: SupportTicket, status: TicketStatus) {
    try {
      await api.patch(`/support-tickets/${ticket.id}/status`, { status });
      toast.success(`${ticket.ticketNumber} marked ${STATUS_META[status].label.toLowerCase()}`);
      list.reload();
      setVersion((value) => value + 1);
    } catch (error) {
      toast.error('Could not change the status', errorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Support tickets" description="Questions and problems raised by employees. Open a ticket to reply." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COUNTS.map((item) => (
          <StatusCount key={`${item.status}-${version}`} {...item} />
        ))}
      </div>

      <DataTable
        {...list.tableProps}
        label="Support tickets"
        columns={columns}
        rowKey={(t) => t.id}
        searchPlaceholder="Search number or subject…"
        filters={<TicketFilterSelects filters={list.filters} setFilter={list.setFilter} />}
        rowActionsLabel={(t) => `Actions for ${t.ticketNumber}`}
        rowActions={(t) => [
          { label: 'View conversation', icon: Eye, href: `/tickets/${t.id}` },
          'separator',
          { label: 'Mark in progress', icon: LoaderCircle, disabled: t.status === 'in_progress', onSelect: () => setStatus(t, 'in_progress') },
          { label: 'Mark resolved', icon: CircleCheck, disabled: t.status === 'resolved', onSelect: () => setStatus(t, 'resolved') },
          { label: 'Close ticket', icon: CircleX, disabled: t.status === 'closed', onSelect: () => setStatus(t, 'closed') },
        ]}
        empty={
          filtered
            ? { title: 'No tickets match these filters', description: 'Try another status or priority, or clear the search.' }
            : { title: 'No support tickets yet', description: 'Tickets appear here when employees ask IT for help.' }
        }
      />
    </div>
  );
}
