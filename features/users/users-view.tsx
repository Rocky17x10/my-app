'use client';

import {
  ClockArrowLeft,
  KeyRound,
  Pencil,
  RefreshCw,
  ShieldCheck,
  ShieldMinus,
  Trash,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UserX,
} from 'lucide-react';

import { useCurrentUser } from '@/components/shell';
import { Badge, Button, DataTable, PageHeader, Select, StatCard, useToast, type Column } from '@/components/ui';
import { useDialogTarget } from '@/features/dialogs/use-dialog-target';
import { useApi, usePagedList } from '@/lib/hooks';
import type { Page, User, UserRole } from '@/types';
import { TemporaryPasswordDialog, UserActionDialog, UserFormDialog, type UserAction } from './user-dialogs';
import { ActiveBadge, canManage, RoleBadge, UserAvatar } from './user-meta';

type Filters = { role: UserRole | ''; isActive: 'true' | 'false' | '' };

export function UsersView() {
  const { user: me } = useCurrentUser();
  const toast = useToast();
  const list = usePagedList<User, Filters>('/users');
  const all = useApi<Page<User>>('/users', { limit: 1 });
  const employees = useApi<Page<User>>('/users', { role: 'user', limit: 1 });
  const inactive = useApi<Page<User>>('/users', { isActive: 'false', limit: 1 });

  const form = useDialogTarget<{ user?: User }>();
  const action = useDialogTarget<{ user: User; action: UserAction }>();
  const temporary = useDialogTarget<{ user: User; password: string }>();

  function refresh() {
    list.reload();
    all.reload();
    employees.reload();
    inactive.reload();
  }

  const actionTarget = action.target;
  const total = all.data?.total;
  const employeeCount = employees.data?.total;
  const filtered = Boolean(list.search || list.filters.role || list.filters.isActive);

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortKey: 'name',
      cell: (u) => (
        <div className="flex min-w-48 items-center gap-3">
          <UserAvatar user={u} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium">
              <span className="truncate">{u.name}</span>
              {u.id === me.id && <Badge tone="primary">You</Badge>}
            </p>
            <p className="truncate text-muted">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      hideBelow: 'md',
      cell: (u) => (
        <>
          <p>{u.department || '—'}</p>
          {u.designation && <p className="text-muted">{u.designation}</p>}
        </>
      ),
    },
    { key: 'role', header: 'Role', sortKey: 'role', cell: (u) => <RoleBadge role={u.role} /> },
    {
      key: 'status',
      header: 'Status',
      hideBelow: 'sm',
      cell: (u) => (
        <div className="flex flex-col items-start gap-1">
          <ActiveBadge active={u.isActive} />
          {u.mustChangePassword && <span className="text-xs whitespace-nowrap text-muted">Password change pending</span>}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Employee and administrator accounts: roles, access and assignment history."
        actions={
          <Button onClick={() => form.show({})}>
            <UserPlus aria-hidden="true" />
            Add employee
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All users" value={total?.toLocaleString()} icon={Users} tone="pink" hint="Every account" loading={!all.data} />
        <StatCard
          label="Admins"
          value={total !== undefined && employeeCount !== undefined ? (total - employeeCount).toLocaleString() : ''}
          icon={ShieldCheck}
          tone="primary"
          hint="Including the super admin"
          loading={!all.data || !employees.data}
        />
        <StatCard
          label="Employees"
          value={employeeCount?.toLocaleString()}
          icon={UserRound}
          tone="teal"
          hint="Accounts with the employee role"
          loading={!employees.data}
        />
        <StatCard
          label="Deactivated"
          value={inactive.data?.total.toLocaleString()}
          icon={UserX}
          tone="warning"
          hint={inactive.data?.total ? 'Cannot sign in' : 'Every account can sign in'}
          loading={!inactive.data}
        />
      </div>

      <DataTable
        {...list.tableProps}
        label="Users"
        columns={columns}
        rowKey={(u) => u.id}
        searchPlaceholder="Search name, email, department…"
        toolbarActions={
          <Button variant="secondary" size="sm" onClick={refresh} disabled={list.loading}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        }
        filters={
          <>
            <Select
              aria-label="Role"
              className="w-44"
              value={list.filters.role ?? ''}
              onChange={(e) => list.setFilter('role', e.target.value as Filters['role'])}
            >
              <option value="">All roles</option>
              <option value="super_admin">Super admin</option>
              <option value="admin">Admin</option>
              <option value="user">Employee</option>
            </Select>
            <Select
              aria-label="Status"
              className="w-44"
              value={list.filters.isActive ?? ''}
              onChange={(e) => list.setFilter('isActive', e.target.value as Filters['isActive'])}
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Deactivated</option>
            </Select>
          </>
        }
        rowActionsLabel={(u) => `Actions for ${u.name}`}
        rowActions={(u) => {
          const manage = canManage(u, me);
          const changeRole = me.role === 'super_admin' && manage;
          const act = (kind: UserAction) => () => action.show({ user: u, action: kind });
          return [
            manage && { label: 'Edit', icon: Pencil, onSelect: () => form.show({ user: u }) },
            manage && { label: 'Reset password', icon: KeyRound, onSelect: act('reset') },
            changeRole &&
              (u.role === 'admin'
                ? { label: 'Change role to employee', icon: ShieldMinus, onSelect: act('make-employee') }
                : { label: 'Change role to admin', icon: ShieldCheck, onSelect: act('make-admin') }),
            { label: 'View history', icon: ClockArrowLeft, href: `/users/${u.id}/history` },
            manage && 'separator',
            manage &&
              (u.isActive
                ? { label: 'Deactivate', icon: UserX, tone: 'danger', onSelect: act('deactivate') }
                : { label: 'Activate', icon: UserCheck, onSelect: act('activate') }),
            manage && { label: 'Delete', icon: Trash, tone: 'danger', onSelect: act('delete') },
          ];
        }}
        empty={
          filtered
            ? { title: 'No users match these filters', description: 'Try another search or clear the filters.' }
            : { title: 'No users yet', description: 'Add the first employee account.' }
        }
      />

      {form.target && (
        <UserFormDialog
          key={`form-${form.key}`}
          user={form.target.user}
          open={form.open}
          onClose={form.close}
          onSaved={(saved) => {
            form.close();
            toast.success(form.target?.user ? 'Changes saved' : 'Employee added', saved.name);
            refresh();
          }}
        />
      )}

      {actionTarget && (
        <UserActionDialog
          key={`action-${action.key}`}
          user={actionTarget.user}
          action={actionTarget.action}
          open={action.open}
          onClose={action.close}
          onDone={({ message, temporaryPassword }) => {
            const { user } = actionTarget;
            action.close();
            if (temporaryPassword) temporary.show({ user, password: temporaryPassword });
            else toast.success(message, user.name);
            refresh();
          }}
        />
      )}

      {temporary.target && (
        <TemporaryPasswordDialog
          key={`temporary-${temporary.key}`}
          user={temporary.target.user}
          password={temporary.target.password}
          open={temporary.open}
          onClose={temporary.close}
        />
      )}
    </div>
  );
}
