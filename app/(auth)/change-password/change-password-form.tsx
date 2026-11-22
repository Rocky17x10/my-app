'use client';

import { CircleExclamationPoint, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { signOut } from '@/components/shell/profile-menu';
import { Button, buttonClasses } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { api, errorMessage, homePathFor } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import type { SessionUser } from '@/types';

const MIN_LENGTH = 12;

export function ChangePasswordForm() {
  const profile = useApi<{ user: SessionUser }>('/auth/profile');
  const user = profile.data?.user;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const tooShort = newPassword.length < MIN_LENGTH;
  const mismatch = confirmPassword !== newPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setError('');
    if (tooShort || mismatch) return;

    setSaving(true);
    try {
      const { user: updated } = await api.patch<{ user: SessionUser }>('/auth/password', {
        currentPassword,
        newPassword,
      });
      // Full load: the session cookies were just replaced, start from a clean client state.
      window.location.assign(homePathFor(updated.role));
    } catch (err) {
      setError(errorMessage(err, 'Could not change the password.'));
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-16" />
        ))}
      </div>
    );
  }

  const forced = user.mustChangePassword;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {forced ? 'Choose your own password' : 'Change password'}
      </h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">
        {forced
          ? 'An administrator set your current password. Replace it to continue.'
          : `Signed in as ${user.email}. Your other devices will be signed out.`}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <Field label={forced ? 'Temporary password' : 'Current password'} required>
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            className="h-10"
          />
        </Field>
        <Field
          label="New password"
          required
          hint={`At least ${MIN_LENGTH} characters. A short sentence is easy to remember.`}
          error={submitted && tooShort ? `Use at least ${MIN_LENGTH} characters.` : null}
        >
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            className="h-10"
          />
        </Field>
        <Field
          label="Repeat new password"
          required
          error={submitted && mismatch ? 'The two passwords do not match.' : null}
        >
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="h-10"
          />
        </Field>

        <Button type="submit" loading={saving} className="h-10 w-full">
          <ShieldCheck aria-hidden="true" />
          {saving ? 'Saving…' : 'Save new password'}
        </Button>

        {forced ? (
          <Button variant="ghost" onClick={() => void signOut()} className="w-full">
            Sign out instead
          </Button>
        ) : (
          <Link href={homePathFor(user.role)} className={buttonClasses('ghost', 'md', 'w-full')}>
            Cancel
          </Link>
        )}
      </form>
    </>
  );
}
