'use client';

import { CircleExclamationPoint, Hourglass, Lock, Mail, RotateCcw, SearchX, Send } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';

import { useCurrentUser } from '@/components/shell';
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  EmptyState,
  Field,
  IdTag,
  PageHeader,
  PriorityBadge,
  Select,
  Skeleton,
  SOFT,
  StatusBadge,
  STATUS_META,
  Textarea,
  useToast,
  type Tone,
} from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, timeAgo } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { SupportTicket, TicketStatus, User, UserRef } from '@/types';
import { TICKET_STATUSES } from './ticket-list';

type Area = 'admin' | 'employee';

type Entry = {
  key: string;
  sender: User | UserRef;
  message: string;
  createdAt: string;
  internal: boolean;
  opening?: boolean;
};

const BUBBLE: Record<'requester' | 'staff' | 'internal', string> = {
  requester: 'border-border bg-surface-muted',
  staff: 'border-primary/20 bg-primary/8',
  internal: 'border-dashed border-warning/50 bg-warning/10',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase() || '?';
}

export function Avatar({ name, tone, className }: { name: string; tone: Tone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        SOFT[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

function Message({ entry, side, fromRequester, isMe }: { entry: Entry; side: 'left' | 'right'; fromRequester: boolean; isMe: boolean }) {
  const kind = entry.internal ? 'internal' : fromRequester ? 'requester' : 'staff';
  const right = side === 'right';
  return (
    <li className={cn('flex gap-3', right && 'flex-row-reverse')}>
      <Avatar name={entry.sender.name} tone={kind === 'internal' ? 'warning' : kind === 'staff' ? 'primary' : 'teal'} />
      <div className={cn('flex max-w-[min(38rem,85%)] min-w-0 flex-col gap-1', right && 'items-end')}>
        <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', right && 'flex-row-reverse')}>
          <span className="text-sm font-medium text-foreground">{isMe ? 'You' : entry.sender.name}</span>
          {kind === 'internal' ? (
            <Badge tone="warning">
              <Lock className="size-3" aria-hidden="true" />
              Internal note
            </Badge>
          ) : kind === 'staff' ? (
            <Badge tone="primary">IT support</Badge>
          ) : null}
          <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)} className="text-xs text-muted">
            {timeAgo(entry.createdAt)}
          </time>
        </div>
        <div
          className={cn(
            'rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground',
            BUBBLE[kind],
            right ? 'rounded-tr-sm' : 'rounded-tl-sm',
          )}
        >
          {entry.opening && <span className="mb-1 block text-xs font-medium text-muted">Opened the ticket</span>}
          {entry.message}
        </div>
        {kind === 'internal' && <p className="text-xs text-warning">Only IT staff can see this note.</p>}
      </div>
    </li>
  );
}

function ReplyBox({
  ticket,
  admin,
  onSent,
}: {
  ticket: SupportTicket;
  admin: boolean;
  onSent: (ticket: SupportTicket) => void;
}) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const note = admin && internal;
  const reopens = !admin && (ticket.status === 'resolved' || ticket.status === 'closed');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    setSending(true);
    setError('');
    try {
      const updated = await api.post<SupportTicket>(
        `/support-tickets/${ticket.id}/messages`,
        admin ? { message, isInternalNote: internal } : { message },
      );
      onSent(updated);
      setText('');
      toast.success(note ? 'Internal note added' : reopens ? 'Reply sent, ticket reopened' : 'Reply sent');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className={cn('flex flex-col gap-3 border-t border-border p-5 transition-colors', note && 'bg-warning/6')}
    >
      {error && (
        <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <Field
        label={note ? 'Internal note' : admin ? `Reply to ${ticket.createdBy.name}` : 'Your reply'}
        hint={
          note
            ? 'Visible to IT staff only. The employee is not notified.'
            : admin
              ? 'The employee gets a notification.'
              : reopens
                ? 'This ticket is closed. Replying reopens it.'
                : 'IT support is notified of your reply.'
        }
      >
        <Textarea
          rows={4}
          maxLength={5000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={note ? 'Write a note for IT staff…' : 'Write your reply…'}
          className={cn(note && 'border-warning/60 bg-surface')}
        />
      </Field>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {admin && (
          <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-md border border-border-strong px-3 py-2 text-sm text-foreground transition-colors select-none hover:bg-surface-muted has-checked:border-warning/50 has-checked:bg-warning/12 has-checked:text-warning">
            <input
              type="checkbox"
              checked={internal}
              onChange={(event) => setInternal(event.target.checked)}
              className="size-4 cursor-pointer accent-warning"
            />
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            Internal note (not visible to the employee)
          </label>
        )}
        <Button type="submit" loading={sending} disabled={!text.trim()} className="sm:ml-auto">
          {note ? <Lock aria-hidden="true" /> : <Send aria-hidden="true" />}
          {note ? 'Add internal note' : 'Send reply'}
        </Button>
      </div>
    </form>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function TicketDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[28rem] rounded-lg lg:col-span-2" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}

/** Ticket page for both areas; `admin` adds the status control, requester card and internal notes. */
export function TicketDetail({ id, area }: { id: string; area: Area }) {
  const admin = area === 'admin';
  const { user } = useCurrentUser();
  const toast = useToast();
  const ticket = useApi<SupportTicket>(`/support-tickets/${encodeURIComponent(id)}`);
  const [savingStatus, setSavingStatus] = useState(false);
  const back = admin ? { href: '/tickets', label: 'Support tickets' } : { href: '/support', label: 'Support' };
  // useApi keeps the previous ticket while another id loads; never show it under this URL.
  const t = ticket.data && String(ticket.data.id) === id ? ticket.data : undefined;

  if (!t) {
    if (!ticket.error) return <TicketDetailSkeleton />;
    const missing = [400, 403, 404].includes(ticket.error.status);
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Support ticket" back={back} />
        <Card>
          <EmptyState
            icon={missing ? SearchX : CircleExclamationPoint}
            tone={missing ? 'teal' : 'danger'}
            title={missing ? 'Ticket not found' : 'The ticket could not be loaded'}
            description={missing ? 'It does not exist, or you cannot view it.' : ticket.error.message}
            action={
              missing ? (
                <Link href={back.href} className={buttonClasses('secondary')}>
                  Back to {back.label.toLowerCase()}
                </Link>
              ) : (
                <Button variant="secondary" onClick={ticket.reload}>
                  Try again
                </Button>
              )
            }
          />
        </Card>
      </div>
    );
  }

  async function changeStatus(status: TicketStatus) {
    setSavingStatus(true);
    try {
      const updated = await api.patch<SupportTicket>(`/support-tickets/${id}/status`, { status });
      ticket.setData(() => updated);
      toast.success(`Status changed to ${STATUS_META[status].label.toLowerCase()}`);
    } catch (error) {
      toast.error('Could not change the status', errorMessage(error));
    } finally {
      setSavingStatus(false);
    }
  }

  const requesterId = t.createdBy.id;
  const messages = t.messages ?? [];
  const notes = messages.filter((m) => m.isInternalNote).length;
  const entries: Entry[] = [
    { key: 'opening', sender: t.createdBy, message: t.description, createdAt: t.createdAt, internal: false, opening: true },
    ...messages.map((m) => ({
      key: String(m.id),
      sender: m.sender,
      message: m.message,
      createdAt: m.createdAt,
      internal: m.isInternalNote,
    })),
  ];
  const replies = messages.length - notes;
  const requester = 'email' in t.createdBy ? t.createdBy : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={back}
        title={t.subject}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <IdTag>{t.ticketNumber}</IdTag>
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
            <span>
              Opened by {t.createdBy.id === user.id ? 'you' : t.createdBy.name}, {timeAgo(t.createdAt)}
            </span>
          </span>
        }
        actions={
          admin && (
            <label className="flex items-center gap-2 text-sm font-medium text-muted">
              Status
              <Select
                className="w-52"
                value={t.status}
                disabled={savingStatus}
                onChange={(event) => changeStatus(event.target.value as TicketStatus)}
              >
                {TICKET_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </Select>
            </label>
          )
        }
      />

      {!admin && t.status === 'waiting_for_employee' && (
        <p className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          IT support is waiting for your answer. Reply below to continue.
        </p>
      )}
      {!admin && (t.status === 'resolved' || t.status === 'closed') && (
        <p className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
          <RotateCcw className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This ticket is {STATUS_META[t.status].label.toLowerCase()}. If the problem comes back, reply and it reopens.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card
          title="Conversation"
          description={
            `${replies} ${replies === 1 ? 'reply' : 'replies'}` +
            (admin && notes > 0 ? ` · ${notes} internal ${notes === 1 ? 'note' : 'notes'}` : '')
          }
          className="lg:col-span-2"
          bodyClassName="p-0"
        >
          <ol className="flex flex-col gap-5 p-5" aria-label="Messages">
            {entries.map((entry) => {
              const fromRequester = entry.sender.id === requesterId;
              const side = (admin ? !fromRequester : fromRequester) ? 'right' : 'left';
              return (
                <Message
                  key={entry.key}
                  entry={entry}
                  side={side}
                  fromRequester={fromRequester}
                  isMe={entry.sender.id === user.id}
                />
              );
            })}
          </ol>
          <ReplyBox ticket={t} admin={admin} onSent={(updated) => ticket.setData(() => updated)} />
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Details" bodyClassName="p-0">
            <dl className="divide-y divide-border text-sm">
              <DetailRow label="Status">
                <StatusBadge status={t.status} />
              </DetailRow>
              <DetailRow label="Priority">
                <PriorityBadge priority={t.priority} />
              </DetailRow>
              <DetailRow label="Category">{t.category}</DetailRow>
              <DetailRow label="Opened">{formatDateTime(t.createdAt)}</DetailRow>
              <DetailRow label="Last update">{formatDateTime(t.updatedAt)}</DetailRow>
              {t.resolvedAt && <DetailRow label="Resolved">{formatDateTime(t.resolvedAt)}</DetailRow>}
              {t.closedAt && <DetailRow label="Closed">{formatDateTime(t.closedAt)}</DetailRow>}
            </dl>
          </Card>

          {admin && requester && (
            <Card title="Requester">
              <div className="flex items-start gap-3">
                <Avatar name={requester.name} tone="teal" className="size-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{requester.name}</p>
                  <p className="truncate text-sm text-muted">
                    {[requester.designation, requester.department].filter(Boolean).join(' · ') || 'Employee'}
                  </p>
                  <a
                    href={`mailto:${requester.email}`}
                    className="mt-2 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Mail className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{requester.email}</span>
                  </a>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
