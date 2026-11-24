'use client';

import { Bell, BellDot, BellOff, Check, CheckCheck, ChevronLeft, ChevronRight, CircleExclamationPoint } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { NOTIFICATION_META, notificationHref, useCurrentUser } from '@/components/shell';
import { Badge, Button, Card, EmptyState, IconChip, IdTag, PageHeader, Skeleton, useToast } from '@/components/ui';
import { Segmented } from '@/features/reports/segmented';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, timeAgo } from '@/lib/format';
import { useApi, usePagedList } from '@/lib/hooks';
import type { Notification, NotificationType } from '@/types';

const TYPE_LABELS: Record<NotificationType, string> = {
  support_ticket: 'Support ticket',
  asset_request_new: 'New asset request',
  asset_request_approved: 'Request approved',
  asset_request_rejected: 'Request rejected',
  asset_assigned: 'Asset assigned',
};

type View = 'all' | 'unread';

export function NotificationsView() {
  const { user } = useCurrentUser();
  const toast = useToast();
  const list = usePagedList<Notification, { unread: boolean }>('/notifications', { limit: 20 });
  const unread = useApi<{ count: number }>('/notifications/unread-count');
  const [markingAll, setMarkingAll] = useState(false);
  const count = unread.data?.count ?? 0;
  const view: View = list.filters.unread ? 'unread' : 'all';

  const hrefFor = (n: Notification) => notificationHref(n, user.role);

  function markRead(n: Notification) {
    if (n.isRead) return;
    list.setData((page) => page && { ...page, data: page.data.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) });
    unread.setData((value) => ({ count: Math.max(0, (value?.count ?? 1) - 1) }));
    api.patch(`/notifications/${n.id}/read`).catch((error: unknown) => {
      toast.error('Could not mark the notification as read', errorMessage(error));
      list.reload();
      unread.reload();
    });
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      // The unread view would now be empty: refetch it instead of showing read rows under "Unread".
      if (view === 'unread') list.reload();
      else list.setData((page) => page && { ...page, data: page.data.map((x) => ({ ...x, isRead: true })) });
      unread.setData(() => ({ count: 0 }));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Could not mark notifications as read', errorMessage(error));
    } finally {
      setMarkingAll(false);
    }
  }

  const first = list.total === 0 ? 0 : (list.page - 1) * list.limit + 1;
  const last = Math.min(list.page * list.limit, list.total);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description={
          count > 0
            ? `You have ${count} unread ${count === 1 ? 'notification' : 'notifications'}.`
            : 'You are all caught up. Assignments, request decisions and ticket replies show up here.'
        }
        actions={
          <Button variant="secondary" onClick={markAllRead} loading={markingAll} disabled={count === 0}>
            <CheckCheck aria-hidden="true" />
            Mark all as read
          </Button>
        }
      />

      <Card bodyClassName="p-0">
        <div className="border-b border-border px-5 py-3">
          <Segmented<View>
            label="Show"
            value={view}
            onChange={(next) => list.setFilter('unread', next === 'unread' ? true : undefined)}
            options={[
              { value: 'all', label: 'All', icon: Bell },
              {
                value: 'unread',
                label: 'Unread',
                icon: BellDot,
                extra: count > 0 && (
                  <Badge tone="primary" className="tabular-nums">
                    {count > 99 ? '99+' : count}
                  </Badge>
                ),
              },
            ]}
          />
        </div>
        {list.loading && list.rows.length === 0 ? (
          <ul className="divide-y divide-border" aria-busy="true">
            {[0, 1, 2, 3, 4].map((key) => (
              <li key={key} className="flex gap-3 px-5 py-4">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </li>
            ))}
          </ul>
        ) : list.error && list.rows.length === 0 ? (
          <EmptyState
            icon={CircleExclamationPoint}
            tone="danger"
            title="Notifications could not be loaded"
            description={list.error.message}
            action={
              <Button variant="secondary" onClick={list.reload}>
                Try again
              </Button>
            }
          />
        ) : list.rows.length === 0 ? (
          view === 'unread' ? (
            <EmptyState
              icon={CheckCheck}
              tone="success"
              title="No unread notifications"
              description="You have read everything. Switch to All to see older notifications."
            />
          ) : (
            <EmptyState
              icon={BellOff}
              title="No notifications yet"
              description="Assignments, request decisions and ticket replies will show up here."
            />
          )
        ) : (
          <ul className={cn('divide-y divide-border', list.loading && 'opacity-60')}>
            {list.rows.map((n) => {
              const meta = NOTIFICATION_META[n.type] ?? { icon: Bell, tone: 'neutral' as const };
              return (
                <li
                  key={n.id}
                  className={cn(
                    'relative flex gap-3 px-5 py-4 transition-colors hover:bg-surface-muted/70',
                    !n.isRead && 'bg-primary/4',
                  )}
                >
                  <IconChip icon={meta.icon} tone={meta.tone} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      {/* Stretched link: the whole row opens the notification. */}
                      <Link
                        href={hrefFor(n)}
                        onClick={() => markRead(n)}
                        className={cn(
                          'truncate text-sm text-foreground after:absolute after:inset-0 hover:text-primary',
                          n.isRead ? 'font-medium' : 'font-semibold',
                        )}
                      >
                        {n.title}
                      </Link>
                      {!n.isRead && (
                        <span className="size-2 shrink-0 rounded-full bg-primary">
                          <span className="sr-only">Unread</span>
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{n.message}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      {n.ticket && <IdTag>{n.ticket.ticketNumber}</IdTag>}
                      <span>{TYPE_LABELS[n.type] ?? n.type}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>
                        {timeAgo(n.createdAt)}
                      </time>
                    </p>
                  </div>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Mark "${n.title}" as read`}
                      title="Mark as read"
                      onClick={() => markRead(n)}
                      className="relative z-10 self-center"
                    >
                      <Check aria-hidden="true" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <nav
          aria-label="Notifications pagination"
          className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-sm text-muted"
        >
          <p className="tabular-nums" aria-live="polite">
            {list.total === 0 ? 'No results' : `${first}–${last} of ${list.total.toLocaleString()}`}
          </p>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap tabular-nums">
              Page {list.totalPages === 0 ? 0 : list.page} of {list.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="Previous page"
                disabled={list.page <= 1 || list.loading}
                onClick={() => list.setPage(list.page - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="Next page"
                disabled={list.page >= list.totalPages || list.loading}
                onClick={() => list.setPage(list.page + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </nav>
      </Card>
    </div>
  );
}
