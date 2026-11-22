'use client';

import { CircleExclamationPoint, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { homePathFor, isAdminRole } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/hooks/use-api';
import type { SessionUser } from '@/types';
import { Brand } from './brand';
import { CurrentUserContext, type CurrentUser } from './current-user';
import { navFor, type NavItem } from './nav';
import { ShellSkeleton } from './shell-skeleton';
import { SidebarNav } from './sidebar';
import { TopBar } from './top-bar';

/** Which route group the layout belongs to; a user of the other role is sent home. */
export type ShellArea = 'admin' | 'employee' | 'shared';

function MobileDrawer({
  open,
  onClose,
  items,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  pathname: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    dialog.showModal();
    return () => dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Navigation"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-r border-border bg-surface p-0 text-foreground shadow-overlay transition-transform duration-200 starting:open:-translate-x-full lg:hidden"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <Brand />
            <Button variant="ghost" size="icon-sm" aria-label="Close navigation" onClick={onClose}>
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav items={items} pathname={pathname} onNavigate={onClose} />
          </div>
        </div>
      )}
    </dialog>
  );
}

/**
 * Layout of every signed-in page: sidebar (collapsible on desktop, drawer on mobile), top bar
 * with breadcrumb, notifications and profile menu. Loads `/auth/profile` once and provides it
 * through `useCurrentUser()`. Children render only once the user is known.
 */
export function AppShell({ area, children }: { area: ShellArea; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useApi<{ user: SessionUser }>('/auth/profile');
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const user = profile.data?.user;
  const admin = user ? isAdminRole(user.role) : false;
  const wrongArea = Boolean(user) && ((area === 'admin' && !admin) || (area === 'employee' && admin));
  const mustChange = user?.mustChangePassword ?? false;

  useEffect(() => {
    if (!user) return;
    if (mustChange) router.replace('/change-password');
    else if (wrongArea) router.replace(homePathFor(user.role));
  }, [user, mustChange, wrongArea, router]);

  const reloadProfile = profile.reload;
  const value = useMemo<CurrentUser | null>(
    () => (user ? { user, isAdmin: admin, reload: reloadProfile } : null),
    [user, admin, reloadProfile],
  );
  const items = useMemo(() => (user ? navFor(user.role) : []), [user]);

  if (profile.error && !user) {
    return (
      <ShellSkeleton>
        <EmptyState
          icon={CircleExclamationPoint}
          tone="danger"
          title="Your account could not be loaded"
          description={profile.error.message}
          action={
            <Button variant="secondary" onClick={profile.reload}>
              Try again
            </Button>
          }
        />
      </ShellSkeleton>
    );
  }

  if (!value || wrongArea || mustChange) return <ShellSkeleton />;

  return (
    <CurrentUserContext value={value}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex',
            collapsed ? 'w-17' : 'w-64',
          )}
        >
          <div className={cn('flex h-14 shrink-0 items-center border-b border-border', collapsed ? 'justify-center' : 'px-5')}>
            <Link href={homePathFor(value.user.role)} className="rounded-lg">
              <Brand compact={collapsed} />
            </Link>
          </div>
          <div className="flex-1 overflow-x-hidden overflow-y-auto pb-4">
            <SidebarNav items={items} pathname={pathname} collapsed={collapsed} />
          </div>
        </aside>

        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} items={items} pathname={pathname} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            pathname={pathname}
            items={items}
            onOpenMenu={() => setDrawerOpen(true)}
            sidebarToggle={
              <Button
                variant="ghost"
                size="icon"
                className="max-lg:hidden"
                onClick={() => setCollapsed((value) => !value)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
              </Button>
            }
          />
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </CurrentUserContext>
  );
}
