'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch, homePathFor, logout, type SessionUser } from '@/lib/api';

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
};

function PasswordField({ id, label, value, onChange, autoComplete, hint }: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        autoComplete={autoComplete}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function ChangePasswordPage() {
  const router = useRouter();

  const [forced, setForced] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/auth/profile')
      .then(async (response) => {
        if (!response.ok) {
          router.replace('/login');
          return;
        }
        const { user } = (await response.json()) as {
          user: { mustChangePassword: boolean };
        };
        setForced(user.mustChangePassword);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setSaving(true);

    try {
      const response = await apiFetch('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      const data = (await response.json().catch(() => null)) as {
        message?: string | string[];
        user?: SessionUser;
      } | null;

      if (!response.ok || !data?.user) {
        const message = data?.message;
        throw new Error(
          Array.isArray(message)
            ? message.join(', ')
            : message || 'Could not change the password.',
        );
      }

      router.replace(homePathFor(data.user.role));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not change the password.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4 text-gray-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold">Change password</h1>

        {forced && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Your password was set by an administrator. Choose your own to
            continue.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <PasswordField
          id="current-password"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          hint="At least 12 characters. Other sessions on other devices will be logged out."
        />
        <PasswordField
          id="confirm-password"
          label="Repeat new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Change password'}
        </button>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="w-full text-sm text-gray-600 hover:underline"
        >
          Log out
        </button>
      </form>
    </main>
  );
}
