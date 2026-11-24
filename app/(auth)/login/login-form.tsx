'use client';

import { CircleExclamationPoint, Eye, EyeOff, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { api, errorMessage, homePathFor } from '@/lib/api';
import type { SessionUser } from '@/types';

const noSubscribe = () => () => undefined;

/** Only same-site paths, never back to /login (no open redirect). */
function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next.startsWith('/login') ? null : next;
}

export function LoginForm() {
  const router = useRouter();
  // Read the query in the browser only: the page stays prerendered and needs no Suspense.
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => '');
  const params = new URLSearchParams(search);
  const expired = params.has('expired');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      // The API sets the session as HttpOnly cookies; no token reaches this code.
      const { user } = await api.post<{ user: SessionUser }>('/auth/login', { email, password });
      router.replace(
        user.mustChangePassword ? '/change-password' : (safeNext(params.get('next')) ?? homePathFor(user.role)),
      );
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in. Try again.'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {expired && !error && (
        <p className="flex items-start gap-2.5 rounded-lg bg-info/10 p-3 text-sm text-info">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Your session has ended. Sign in again to continue.
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <Field label="Work email" required>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
          autoComplete="email"
          autoFocus
          className="h-10"
        />
      </Field>

      <Field label="Password" required>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="h-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-md text-muted hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </Field>

      <Button type="submit" loading={loading} className="h-10 w-full">
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
