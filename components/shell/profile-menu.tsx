'use client';

import { ChevronsUpDown, KeyRound, LogOut } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Menu } from '@/components/ui/popover';
import { isAdminRole, logout, ROLE_LABELS } from '@/lib/api';
import { useCurrentUser } from './current-user';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase() || '?';
}

export async function signOut(): Promise<void> {
  await logout();
  // Full load: clears every piece of client state of this session (Activity keeps routes mounted).
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional full load
  window.location.assign('/login');
}

export function ProfileMenu() {
  const { user } = useCurrentUser();

  return (
    <Menu
      label="Account menu"
      width="w-64"
      trigger={(props) => (
        <button
          {...props}
          aria-label={`Account menu for ${user.name}`}
          className="flex cursor-pointer items-center gap-2.5 rounded-md p-1 pr-2 hover:bg-surface-muted"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary"
            aria-hidden="true"
          >
            {initials(user.name)}
          </span>
          <span className="hidden min-w-0 flex-col text-left leading-tight md:flex">
            <span className="max-w-36 truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="text-xs text-muted">{ROLE_LABELS[user.role]}</span>
          </span>
          <ChevronsUpDown className="hidden size-4 text-muted md:block" aria-hidden="true" />
        </button>
      )}
      header={
        <div className="mb-1 border-b border-border px-2.5 pt-2 pb-3">
          <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <Badge tone={isAdminRole(user.role) ? 'primary' : 'teal'} className="mt-2">
            {ROLE_LABELS[user.role]}
          </Badge>
        </div>
      }
      items={[
        { label: 'Change password', icon: KeyRound, href: '/change-password' },
        'separator',
        { label: 'Log out', icon: LogOut, tone: 'danger', onSelect: () => void signOut() },
      ]}
    />
  );
}
