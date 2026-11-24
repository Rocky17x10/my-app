'use client';

import { CircleExclamationPoint } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button, Dialog, Field, Input, PRIORITY_META, Select, Textarea } from '@/components/ui';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@/features/tickets/ticket-list';
import { api, errorMessage } from '@/lib/api';
import type { SupportTicket, TicketPriority } from '@/types';

const EMPTY = { subject: '', category: '', priority: 'medium' as TicketPriority, description: '' };

/** The draft survives Cancel; it is cleared only after the ticket was created. */
export function NewTicketDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = form.description.trim();
    if (description.length < 10) {
      setDescriptionError('Describe the problem in at least 10 characters.');
      return;
    }
    setDescriptionError('');
    setSaving(true);
    setError('');
    try {
      const ticket = await api.post<SupportTicket>('/support-tickets', {
        subject: form.subject.trim(),
        category: form.category,
        priority: form.priority,
        description,
      });
      setForm(EMPTY);
      onCreated(ticket);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="New support ticket"
      description="Tell IT what is wrong. You can follow the conversation on the ticket page."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="new-ticket-form" loading={saving}>
            Create ticket
          </Button>
        </>
      }
    >
      <form id="new-ticket-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && (
          <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger sm:col-span-2">
            <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <Field label="Subject" required className="sm:col-span-2">
          <Input
            value={form.subject}
            onChange={(event) => update('subject', event.target.value)}
            maxLength={200}
            placeholder="e.g. Laptop does not connect to the office Wi-Fi"
          />
        </Field>
        <Field label="Category" required>
          <Select value={form.category} onChange={(event) => update('category', event.target.value)}>
            <option value="" disabled>
              Choose a category
            </option>
            {TICKET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority" hint="Urgent = you cannot work at all.">
          <Select value={form.priority} onChange={(event) => update('priority', event.target.value as TicketPriority)}>
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_META[priority].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Description"
          required
          className="sm:col-span-2"
          hint="What happened, what you tried, and any error message."
          error={descriptionError || null}
        >
          <Textarea
            rows={6}
            minLength={10}
            maxLength={5000}
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  );
}
