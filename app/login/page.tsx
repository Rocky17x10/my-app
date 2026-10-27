
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      // Step 1: Send login credentials to the NestJS backend.
      const loginResponse = await fetch(
        'http://localhost:3001/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        },
      );

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(
          typeof loginData.message === 'string'
            ? loginData.message
            : 'Login failed.',
        );
      }

      // Step 2: Receive the JWT token.
      const token: string = loginData.access_token;

      if (!token) {
        throw new Error('The backend did not return an access token.');
      }

      // Step 3: Verify the token by requesting the protected profile.
      const profileResponse = await fetch(
        'http://localhost:3001/auth/profile',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!profileResponse.ok) {
        throw new Error('Login succeeded, but profile access failed.');
      }

      // Step 4: Save the token for this browser tab's session.
      sessionStorage.setItem('access_token', token);

      // Step 5: Redirect to the dashboard.
      router.push('/dashboard');
    } catch (err) {
      sessionStorage.removeItem('access_token');

      setError(
        err instanceof Error
          ? err.message
          : 'Could not connect to the backend.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: '400px',
        margin: '80px auto',
        padding: '30px',
        fontFamily: 'Arial, sans-serif',
        border: '1px solid #ddd',
        borderRadius: '12px',
      }}
    >
      <h1>Login</h1>
      <p>Sign in using your account.</p>

      <form
        onSubmit={handleLogin}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email"
          autoComplete="email"
          required
          style={{ padding: '12px' }}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          style={{ padding: '12px' }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            color: 'white',
            backgroundColor: '#2563eb',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {error && (
        <p style={{ color: 'red' }}>
          {error}
        </p>
      )}
    </main>
  );
}
