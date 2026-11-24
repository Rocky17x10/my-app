'use client';

import { Check, Copy } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';

import { Button, ConfirmDialog, Dialog, Field, Input } from '@/components/ui';
import { FormError } from '@/features/dialogs/form-error';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { User } from '@/types';

type DialogBase = { open: boolean; onClose: () => void };

/** Add an employee (no `user`) or edit one. The API always creates role `user`. */
export function UserFormDialog({ user, open, onClose, onSaved }: DialogBase & { user?: User; onSaved: (saved: User) => void }) {
  const [values, setValues] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    department: user?.department ?? '',
    designation: user?.designation ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formId = user ? 'edit-user-form' : 'add-user-form';

  const bind = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (event: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: event.target.value })),
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      name: values.name.trim(),
      email: values.email.trim(),
      department: values.department.trim(),
      designation: values.designation.trim(),
    };
    try {
      onSaved(
        user
          ? await api.patch<User>(`/users/${user.id}`, body)
          : await api.post<User>('/users', { ...body, password: values.password }),
      );
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={user ? `Edit ${user.name}` : 'Add employee'}
      description={
        user
          ? 'Change the contact and job details. Passwords are changed with "Reset password".'
          : 'Creates an account with the employee role.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {user ? 'Save changes' : 'Add employee'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
        <Field label="Full name" required>
          <Input {...bind('name')} maxLength={100} autoComplete="off" placeholder="e.g. Nusrat Jahan" />
        </Field>
        <Field label="Work email" required>
          <Input {...bind('email')} type="email" maxLength={150} autoComplete="off" placeholder="name@company.com" />
        </Field>
        {!user && (
          <Field
            label="First password"
            required
            hint="At least 12 characters. The employee must change it when they first sign in."
            className="sm:col-span-2"
          >
            <Input {...bind('password')} type="password" minLength={12} maxLength={72} autoComplete="new-password" />
          </Field>
        )}
        <Field label="Department">
          <Input {...bind('department')} maxLength={100} placeholder="e.g. Finance" />
        </Field>
        <Field label="Designation">
          <Input {...bind('designation')} maxLength={100} placeholder="e.g. Accountant" />
        </Field>
      </form>
    </Dialog>
  );
}

export type UserAction = 'reset' | 'deactivate' | 'activate' | 'make-admin' | 'make-employee' | 'delete';

const ACTIONS: Record<
  UserAction,
  { title: string; text: (name: string) => string; confirm: string; tone: 'danger' | 'primary'; done: string }
> = {
  reset: {
    title: 'Reset password?',
    text: (name) => `${name} is signed out everywhere and gets a temporary password that they must change at their next sign-in.`,
    confirm: 'Reset password',
    tone: 'primary',
    done: 'Password reset',
  },
  deactivate: {
    title: 'Deactivate account?',
    text: (name) => `${name} is signed out and cannot sign in until the account is activated again. Their history is kept.`,
    confirm: 'Deactivate account',
    tone: 'danger',
    done: 'Account deactivated',
  },
  activate: {
    title: 'Activate account?',
    text: (name) => `${name} can sign in again with their current password.`,
    confirm: 'Activate account',
    tone: 'primary',
    done: 'Account activated',
  },
  'make-admin': {
    title: 'Change role to admin?',
    text: (name) => `${name} gets full access to assets, requests, users and reports.`,
    confirm: 'Make admin',
    tone: 'primary',
    done: 'Role changed to admin',
  },
  'make-employee': {
    title: 'Change role to employee?',
    text: (name) => `${name} loses admin access and sees only their own assets and requests.`,
    confirm: 'Make employee',
    tone: 'primary',
    done: 'Role changed to employee',
  },
  delete: {
    title: 'Delete account?',
    text: (name) => `${name}'s account is removed for good. Accounts with any activity cannot be deleted; deactivate them instead.`,
    confirm: 'Delete account',
    tone: 'danger',
    done: 'Account deleted',
  },
};

function runAction(action: UserAction, user: User): Promise<{ temporaryPassword?: string }> {
  switch (action) {
    case 'reset':
      return api.post(`/auth/users/${user.id}/reset-password`);
    case 'deactivate':
    case 'activate':
      return api.patch(`/auth/users/${user.id}/active`, { active: action === 'activate' });
    case 'make-admin':
    case 'make-employee':
      return api.patch(`/users/${user.id}/role`, { role: action === 'make-admin' ? 'admin' : 'user' });
    case 'delete':
      return api.delete(`/users/${user.id}`);
  }
}

/** Confirm, run and report one account action. API errors (403 rules, 409 delete) stay in the dialog. */
export function UserActionDialog({
  user,
  action: initialAction,
  open,
  onClose,
  onDone,
}: DialogBase & {
  user: User;
  action: UserAction;
  onDone: (result: { action: UserAction; message: string; temporaryPassword?: string }) => void;
}) {
  const [action, setAction] = useState(initialAction);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const meta = ACTIONS[action];
  // DELETE answers 409 for accounts with history: offer the alternative right here.
  const offerDeactivate = action === 'delete' && error?.status === 409 && user.isActive;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const result = await runAction(action, user);
      onDone({ action, message: meta.done, temporaryPassword: result?.temporaryPassword });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, errorMessage(err)));
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={confirm}
      loading={busy}
      title={meta.title}
      description={meta.text(user.name)}
      confirmLabel={meta.confirm}
      tone={meta.tone}
    >
      {error && (
        <div className="flex flex-col gap-3">
          <FormError message={error.message} />
          {offerDeactivate && (
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => {
                setAction('deactivate');
                setError(null);
              }}
            >
              Deactivate instead
            </Button>
          )}
        </div>
      )}
    </ConfirmDialog>
  );
}

/** Shows the one-time temporary password after a reset. */
export function TemporaryPasswordDialog({ user, password, open, onClose }: DialogBase & { user: User; password: string }) {
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle');

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopy('done');
    } catch {
      setCopy('failed');
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Temporary password"
      description={`Give this password to ${user.name} privately. It is shown only once; they must choose a new one when they sign in.`}
      footer={
        <Button onClick={onClose} data-autofocus>
          Done
        </Button>
      }
    >
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted p-2 pl-3">
        <code className="min-w-0 flex-1 font-mono text-base font-medium tracking-wide break-all text-foreground select-all">
          {password}
        </code>
        <Button variant="secondary" size="sm" onClick={copyPassword} aria-live="polite">
          {copy === 'done' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copy === 'done' ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {copy === 'failed' && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Could not copy. Select the password and copy it yourself.
        </p>
      )}
    </Dialog>
  );
}
