import { Badge, SOFT, type Tone } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { SessionUser, User, UserRole } from '@/types';

export const ROLE_TONE: Record<UserRole, Tone> = { super_admin: 'primary', admin: 'info', user: 'teal' };

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge tone={ROLE_TONE[role]}>{ROLE_LABELS[role]}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? 'success' : 'neutral'} dot>
      {active ? 'Active' : 'Deactivated'}
    </Badge>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase() || '?';
}

/** Initials in a circle tinted by role. Decorative: the name is always shown next to it. */
export function UserAvatar({ user, size = 'md' }: { user: Pick<User, 'name' | 'role'>; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        SOFT[ROLE_TONE[user.role]],
        size === 'lg' ? 'size-14 text-lg' : 'size-9 text-xs',
      )}
    >
      {initials(user.name)}
    </span>
  );
}

/**
 * Mirrors the API's account rules (accountChangeDenied): admins manage employees, only the
 * super admin manages admins, nobody manages their own account. The API still decides.
 */
export function canManage(target: User, me: SessionUser): boolean {
  return (
    target.id !== me.id && target.role !== 'super_admin' && (target.role === 'user' || me.role === 'super_admin')
  );
}
