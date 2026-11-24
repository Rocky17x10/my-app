'use client';

import { Eye, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, DataTable, PageHeader, useToast } from '@/components/ui';
import { TicketFilterSelects, ticketColumns, type TicketFilters } from '@/features/tickets/ticket-list';
import { usePagedList } from '@/lib/hooks';
import type { SupportTicket } from '@/types';
import { NewTicketDialog } from './new-ticket-dialog';

const columns = ticketColumns('/support', false);

export function SupportView() {
  const router = useRouter();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const list = usePagedList<SupportTicket, TicketFilters>('/support-tickets/my', { sort: 'createdAt' });
  const filtered = Boolean(list.search || list.filters.status || list.filters.priority);

  const newTicket = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden="true" />
      New ticket
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Support"
        description="Ask IT for help with hardware, software or access, and follow your tickets."
        actions={newTicket}
      />

      <DataTable
        {...list.tableProps}
        label="My support tickets"
        columns={columns}
        rowKey={(t) => t.id}
        searchPlaceholder="Search number or subject…"
        filters={<TicketFilterSelects filters={list.filters} setFilter={list.setFilter} />}
        rowActionsLabel={(t) => `Actions for ${t.ticketNumber}`}
        rowActions={(t) => [{ label: 'View conversation', icon: Eye, href: `/support/${t.id}` }]}
        empty={
          filtered
            ? { title: 'No tickets match these filters', description: 'Try another status or priority, or clear the search.' }
            : {
                title: 'No support tickets yet',
                description: 'Something not working? Open a ticket and IT support will reply here.',
                action: newTicket,
              }
        }
      />

      <NewTicketDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(ticket) => {
          setCreating(false);
          toast.success(`Ticket ${ticket.ticketNumber} created`, 'IT support has been notified.');
          router.push(`/support/${ticket.id}`);
        }}
      />
    </div>
  );
}
