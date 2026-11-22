import {
  Bell,
  ChartColumn,
  Laptop,
  LayoutDashboard,
  LifeBuoy,
  Logs,
  PackagePlus,
  Ticket,
  Undo2,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { Tone } from '@/components/ui/tone';
import { isAdminRole } from '@/lib/api';
import type { Notification, UserRole } from '@/types';

/**
 * Every route of the signed-in app. Adding a page = add it here AND to the matching list in
 * proxy.ts (ADMIN_ROUTES / EMPLOYEE_ROUTES / SHARED_ROUTES).
 */
export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  audience: 'admin' | 'employee' | 'all';
  /** Sidebar group heading; also the first breadcrumb. */
  section: string;
  /** Icon chip colour, one per section. */
  tone: Tone;
  /** Extra path prefixes that belong to this item (e.g. `/assets/12/history` → Assets). */
  match?: string[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, audience: 'admin', section: 'Overview', tone: 'primary' },
  { label: 'Assets', href: '/', icon: Laptop, audience: 'admin', section: 'Inventory', tone: 'info', match: ['/assets'] },
  { label: 'Asset requests', href: '/asset-requests', icon: PackagePlus, audience: 'admin', section: 'Inventory', tone: 'info' },
  { label: 'Returns', href: '/returns', icon: Undo2, audience: 'admin', section: 'Inventory', tone: 'info' },
  { label: 'Maintenance', href: '/maintenance', icon: Wrench, audience: 'admin', section: 'Inventory', tone: 'info' },
  { label: 'Support tickets', href: '/tickets', icon: Ticket, audience: 'admin', section: 'Service', tone: 'teal' },
  { label: 'Users', href: '/users', icon: Users, audience: 'admin', section: 'People', tone: 'pink' },
  { label: 'Reports', href: '/reports', icon: ChartColumn, audience: 'admin', section: 'Insights', tone: 'warning' },
  { label: 'Activity log', href: '/activity-logs', icon: Logs, audience: 'admin', section: 'Insights', tone: 'warning' },

  { label: 'My assets', href: '/my-assets', icon: Laptop, audience: 'employee', section: 'My workspace', tone: 'info' },
  { label: 'My requests', href: '/my-requests', icon: PackagePlus, audience: 'employee', section: 'My workspace', tone: 'info' },
  { label: 'My returns', href: '/my-returns', icon: Undo2, audience: 'employee', section: 'My workspace', tone: 'info' },
  { label: 'Support', href: '/support', icon: LifeBuoy, audience: 'employee', section: 'Help', tone: 'teal' },

  { label: 'Notifications', href: '/notifications', icon: Bell, audience: 'all', section: 'Account', tone: 'primary' },
];

export function navFor(role: UserRole): NavItem[] {
  const admin = isAdminRole(role);
  return NAV_ITEMS.filter((item) => item.audience === 'all' || (item.audience === 'admin') === admin);
}

function matches(pathname: string, prefix: string): boolean {
  if (prefix === '/') return pathname === '/';
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The nav item a path belongs to (longest prefix wins). */
export function findNavItem(pathname: string, items: NavItem[] = NAV_ITEMS): NavItem | undefined {
  let best: NavItem | undefined;
  let bestLength = -1;
  for (const item of items) {
    for (const prefix of [item.href, ...(item.match ?? [])]) {
      if (matches(pathname, prefix) && prefix.length > bestLength) {
        best = item;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

/** Where a notification leads. Ticket pages may add `?id=` support later. */
export function notificationHref(notification: Notification, role: UserRole): string {
  const admin = isAdminRole(role);
  switch (notification.type) {
    case 'support_ticket':
      return admin ? '/tickets' : '/support';
    case 'asset_request_new':
      return '/asset-requests';
    case 'asset_request_approved':
    case 'asset_request_rejected':
      return admin ? '/asset-requests' : '/my-requests';
    case 'asset_assigned':
      return admin ? '/' : '/my-assets';
    default:
      return '/notifications';
  }
}
