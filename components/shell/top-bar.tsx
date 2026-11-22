'use client';

import { ChevronRight, Menu as MenuIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { findNavItem, type NavItem } from './nav';
import { NotificationsBell } from './notifications-bell';
import { ProfileMenu } from './profile-menu';

function detailLabel(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? '';
  const words = decodeURIComponent(segment).replace(/[-_]/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function Breadcrumbs({ pathname, items }: { pathname: string; items: NavItem[] }) {
  const item = findNavItem(pathname, items);
  if (!item) return null;
  const nested = pathname !== item.href;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        <li className="hidden text-muted sm:block">{item.section}</li>
        <li className="hidden sm:block" aria-hidden="true">
          <ChevronRight className="size-3.5 text-border-strong" />
        </li>
        <li className="min-w-0 truncate">
          {nested ? (
            <Link href={item.href} className="text-muted hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-foreground">
              {item.label}
            </span>
          )}
        </li>
        {nested && (
          <>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5 text-border-strong" />
            </li>
            <li className="min-w-0 truncate">
              <span aria-current="page" className="font-medium text-foreground">
                {detailLabel(pathname)}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}

export function TopBar({
  pathname,
  items,
  onOpenMenu,
  sidebarToggle,
}: {
  pathname: string;
  items: NavItem[];
  onOpenMenu: () => void;
  /** Desktop collapse button. */
  sidebarToggle?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/85 px-3 backdrop-blur-md sm:px-4 lg:pr-8 lg:pl-3">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={onOpenMenu}>
        <MenuIcon aria-hidden="true" />
      </Button>
      {sidebarToggle}
      <span className="mx-1 hidden h-5 w-px bg-border lg:block" aria-hidden="true" />
      <Breadcrumbs pathname={pathname} items={items} />
      <div className="ml-auto flex items-center gap-1">
        <NotificationsBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
