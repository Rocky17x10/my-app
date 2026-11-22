'use client';

import {
  Bell,
  BellOff,
  CheckCheck,
  CircleCheck,
  CircleX,
  Laptop,
  PackagePlus,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button, buttonClasses } from '@/components/ui/button';
import { IconChip } from '@/components/ui/icon-chip';
import { Popover } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import type { Tone } from '@/components/ui/tone';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { useApi } from '@/lib/hooks/use-api';
import type { Notification, NotificationType, Page } from '@/types';
import { useCurrentUser } from './current-user';
import { notificationHref } from './nav';

/** Icon and colour per notification type; reuse it on the notifications page. */
export const NOTIFICATION_META: Record<NotificationType, { icon: LucideIcon; tone: Tone }> = {
  support_ticket: { icon: Ticket, tone: 'teal' },
  asset_request_new: { icon: PackagePlus, tone: 'info' },
  asset_request_approved: { icon: CircleCheck, tone: 'success' },
  asset_request_rejected: { icon: CircleX, tone: 'danger' },
  asset_assigned: { icon: Laptop, tone: 'primary' },
};

const POLL_MS = 60_000;

export function NotificationsBell() {
  const { user } = useCurrentUser();
  const toast = useToast();
  const unread = useApi<{ count: number }>('/notifications/unread-count');
  const [opened, setOpened] = useState(false);
  const latest = useApi<Page<Notification>>(opened ? '/notifications' : null, { limit: 5 });
  const [marking, setMarking] = useState(false);

  const reloadUnread = unread.reload;
  useEffect(() => {
    const timer = window.setInterval(reloadUnread, POLL_MS);
    return () => window.clearInterval(timer);
  }, [reloadUnread]);

  const count = unread.data?.count ?? 0;

  function handleOpenChange(open: boolean) {
    if (!open) return;
    if (opened) latest.reload();
    else setOpened(true);
    unread.reload();
  }

  async function markAllRead() {
    setMarking(true);
    try {
      await api.patch('/notifications/read-all');
      unread.setData(() => ({ count: 0 }));
      latest.setData((page) => page && { ...page, data: page.data.map((n) => ({ ...n, isRead: true })) });
    } catch (error) {
      toast.error('Could not mark notifications as read', errorMessage(error));
    } finally {
      setMarking(false);
    }
  }

  function markRead(notification: Notification) {
    if (notification.isRead) return;
    unread.setData((value) => ({ count: Math.max(0, (value?.count ?? 1) - 1) }));
    latest.setData(
      (page) => page && { ...page, data: page.data.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)) },
    );
    api.patch(`/notifications/${notification.id}/read`).catch(() => unread.reload());
  }

  return (
    <Popover
      label="Notifications"
      width="w-[22rem]"
      onOpenChange={handleOpenChange}
      trigger={(props) => (
        <button
          {...props}
          aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
          className={cn(buttonClasses('ghost', 'icon'), 'relative')}
        >
          <Bell aria-hidden="true" />
          {count > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-surface tabular-nums ring-2 ring-surface">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-2 px-2.5 pt-1.5 pb-2">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Button variant="ghost" size="sm" onClick={markAllRead} loading={marking} disabled={count === 0}>
              <CheckCheck aria-hidden="true" />
              Mark all as read
            </Button>
          </div>
          <div className="h-px bg-border" />

          {latest.loading && !latest.data ? (
            <div className="flex flex-col gap-3 p-3" aria-busy="true">
              {[0, 1, 2].map((key) => (
                <div key={key} className="flex gap-3">
                  <Skeleton className="size-7" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : latest.error ? (
            <p className="p-4 text-sm text-danger">{latest.error.message}</p>
          ) : latest.data?.data.length ? (
            <ul className="flex flex-col py-1">
              {latest.data.data.map((notification) => {
                const meta = NOTIFICATION_META[notification.type] ?? { icon: Bell, tone: 'neutral' as const };
                return (
                  <li key={notification.id}>
                    <Link
                      href={notificationHref(notification, user.role)}
                      onClick={() => {
                        markRead(notification);
                        close();
                      }}
                      className="flex gap-3 rounded-md px-2.5 py-2 hover:bg-surface-muted"
                    >
                      <IconChip icon={meta.icon} tone={meta.tone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <span className="truncate">{notification.title}</span>
                          {!notification.isRead && (
                            <span className="size-2 shrink-0 rounded-full bg-primary">
                              <span className="sr-only">Unread</span>
                            </span>
                          )}
                        </p>
                        <p className="line-clamp-2 text-sm text-muted">{notification.message}</p>
                        <p className="mt-0.5 text-xs text-muted">{timeAgo(notification.createdAt)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <IconChip icon={BellOff} tone="neutral" />
              <p className="mt-3 text-sm font-medium">You are all caught up</p>
              <p className="mt-0.5 text-sm text-muted">New assignments and replies will show up here.</p>
            </div>
          )}

          <div className="h-px bg-border" />
          <Link
            href="/notifications"
            onClick={close}
            className="m-1 rounded-md px-2.5 py-2 text-center text-sm font-medium text-primary hover:bg-primary/10"
          >
            View all notifications
          </Link>
        </div>
      )}
    </Popover>
  );
}
