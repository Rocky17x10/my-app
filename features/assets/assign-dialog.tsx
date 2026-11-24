'use client';

import { CircleExclamationPoint, Search, SearchX } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';

import { useCurrentUser } from '@/components/shell/current-user';
import { Badge, IdTag } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { api, errorMessage, isAdminRole, ROLE_LABELS } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/hooks/use-api';
import type { Asset, Page, User } from '@/types';
import { Person } from './person';

const LIMIT = 20;

export type AssignDialogProps = {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
  onAssigned: (asset: Asset, employee: User) => void;
};

/**
 * Pick an active employee and assign the asset. The API refuses yourself and deactivated
 * accounts, so neither is offered. Mount with a new `key` per opening.
 */
export function AssignDialog({ open, asset, onClose, onAssigned }: AssignDialogProps) {
  const { user: me } = useCurrentUser();
  const formId = useId();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const users = useApi<Page<User>>(open ? '/users' : null, {
    isActive: true,
    search,
    sort: 'name',
    order: 'asc',
    limit: LIMIT,
  });
  const options = (users.data?.data ?? []).filter((user) => user.id !== me.id);
  const hidden = (users.data?.total ?? 0) - (users.data?.data.length ?? 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asset) return;
    if (!selected) {
      setError('Choose the employee who receives this asset.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await api.post<Asset>(`/assets/${asset.id}/assign`, { userId: selected.id });
      onAssigned(saved, selected);
    } catch (err) {
      setError(errorMessage(err, 'Could not assign the asset. Try again.'));
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Assign asset"
      description={
        asset && (
          <span className="flex flex-wrap items-center gap-1.5">
            <IdTag>{asset.assetTag}</IdTag>
            <span>{asset.name}</span>
          </span>
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving} disabled={!selected}>
            Assign asset
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <Input
          type="search"
          icon={<Search />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, department…"
          aria-label="Search employees"
        />

        <fieldset className="min-w-0">
          <legend className="sr-only">Employee</legend>
          {users.loading && !users.data ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : users.error ? (
            <EmptyState
              icon={CircleExclamationPoint}
              tone="danger"
              title="Employees could not be loaded"
              description={users.error.message}
              action={
                <Button variant="secondary" onClick={users.reload}>
                  Try again
                </Button>
              }
              className="py-8"
            />
          ) : options.length === 0 ? (
            <EmptyState
              icon={SearchX}
              tone="pink"
              title={search ? 'No active employee matches' : 'No other active employees'}
              description={search ? 'Try another name or email.' : 'Add or reactivate an account on the Users page.'}
              className="py-8"
            />
          ) : (
            <ul className={cn('flex max-h-72 flex-col gap-1.5 overflow-y-auto', users.loading && 'opacity-60')}>
              {options.map((user) => (
                <li key={user.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                      selected?.id === user.id
                        ? 'border-primary bg-primary/8'
                        : 'border-border hover:border-border-strong hover:bg-surface-muted',
                    )}
                  >
                    <input
                      type="radio"
                      name="employee"
                      value={user.id}
                      checked={selected?.id === user.id}
                      onChange={() => {
                        setSelected(user);
                        setError('');
                      }}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <Person
                      name={user.name}
                      detail={[user.email, user.department, user.designation].filter(Boolean).join(' · ')}
                      className="flex-1 text-sm"
                    />
                    {isAdminRole(user.role) && <Badge tone="primary">{ROLE_LABELS[user.role]}</Badge>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        {hidden > 0 && (
          <p className="text-xs text-muted">
            {hidden.toLocaleString()} more {hidden === 1 ? 'match' : 'matches'}. Refine the search to find them.
          </p>
        )}
      </form>
    </Dialog>
  );
}
