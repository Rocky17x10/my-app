import type { Metadata } from 'next';

import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">Use your work email and password.</p>
      <LoginForm />
      <p className="mt-8 text-sm text-muted">
        Forgot your password? Ask an IT administrator to reset it. You will choose a new one at your next sign-in.
      </p>
    </>
  );
}
