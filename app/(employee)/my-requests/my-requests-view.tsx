'use client';

import { Eye, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import {
  Button,
  DataTable,
  Dialog,
  Field,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui';
import { RequestDetails } from '@/features/asset-requests/request-details';
import { FormError } from '@/features/dialogs/form-error';
import { useDialogTarget } from '@/features/dialogs/use-dialog-target';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { usePagedList } from '@/lib/hooks';
import type { AssetRequest, RequestStatus } from '@/types';

type Filters = { status: RequestStatus | '' };

const CATEGORIES = ['Computer', 'Network Device', 'Server', 'Printer', 'Accessories', 'Other'];

const columns: Column<AssetRequest>[] = [
  {
    key: 'item',
    header: 'Item',
    sortKey: 'itemName',
    cell: (r) => (
      <div className="min-w-40">
        <p className="font-medium">{r.itemName}</p>
        <p className="text-muted">{r.category}</p>
      </div>
    ),
  },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (r) => <StatusBadge status={r.status} /> },
  {
    key: 'submitted',
    header: 'Submitted',
    sortKey: 'createdAt',
    hideBelow: 'sm',
    cell: (r) => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span>,
  },
  {
    key: 'reviewer',
    header: 'Reviewed by',
    hideBelow: 'md',
    cell: (r) => r.reviewedBy?.name ?? <span className="text-muted">Waiting for review</span>,
  },
  {
    key: 'note',
    header: 'Note from IT',
    hideBelow: 'lg',
    className: 'max-w-xs',
    cell: (r) => (r.adminNote ? <p className="truncate">{r.adminNote}</p> : <span className="text-muted">—</span>),
  },
];

function NewRequestDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (r: AssetRequest) => void }) {
  const [values, setValues] = useState({ itemName: '', category: CATEGORIES[0], reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { itemName: values.itemName.trim(), category: values.category, reason: values.reason.trim() };
    if (!body.itemName || !body.reason) {
      setError('Enter the item and the reason.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      onCreated(await api.post<AssetRequest>('/asset-requests', body));
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="New asset request"
      description="Tell IT what you need and why. You are notified when it is reviewed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="new-request-form" loading={saving}>
            Send request
          </Button>
        </>
      }
    >
      <form id="new-request-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
        <Field label="Item" required>
          <Input value={values.itemName} onChange={set('itemName')} maxLength={150} placeholder="e.g. Dell laptop" />
        </Field>
        <Field label="Category" required>
          <Select value={values.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Reason" required hint={`${values.reason.length}/2000 characters`} className="sm:col-span-2">
          <Textarea
            value={values.reason}
            onChange={set('reason')}
            maxLength={2000}
            rows={5}
            placeholder="Why do you need it? e.g. My current laptop battery lasts under an hour."
          />
        </Field>
      </form>
    </Dialog>
  );
}

export function MyRequestsView() {
  const toast = useToast();
  const list = usePagedList<AssetRequest, Filters>('/asset-requests/my', { sort: 'createdAt' });
  const create = useDialogTarget<true>();
  const details = useDialogTarget<AssetRequest>();
  const filtered = Boolean(list.search || list.filters.status);

  const newButton = (
    <Button onClick={() => create.show(true)}>
      <Plus aria-hidden="true" />
      New request
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My requests"
        description="Ask IT for equipment and follow each request until it is reviewed."
        actions={newButton}
      />

      <DataTable
        {...list.tableProps}
        label="My requests"
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search item or category…"
        filters={
          <Select
            aria-label="Status"
            className="w-44"
            value={list.filters.status ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value as Filters['status'])}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        }
        rowActionsLabel={(r) => `Actions for ${r.itemName}`}
        rowActions={(r) => [{ label: 'View details', icon: Eye, onSelect: () => details.show(r) }]}
        empty={
          filtered
            ? { title: 'No requests match these filters', description: 'Try another search or status.' }
            : { title: 'No requests yet', description: 'Need a laptop, monitor or other equipment? Ask IT here.', action: newButton }
        }
      />

      {create.target && (
        <NewRequestDialog
          key={`create-${create.key}`}
          open={create.open}
          onClose={create.close}
          onCreated={(r) => {
            create.close();
            toast.success('Request sent', `${r.itemName}: IT will review it and you will get a notification.`);
            list.reload();
          }}
        />
      )}

      {details.target && (
        <Dialog
          key={`details-${details.key}`}
          open={details.open}
          onClose={details.close}
          size="lg"
          title={details.target.itemName}
          description={`Request #${details.target.id}`}
          footer={
            <Button variant="secondary" onClick={details.close} data-autofocus>
              Close
            </Button>
          }
        >
          <RequestDetails request={details.target} />
        </Dialog>
      )}
    </div>
  );
}
