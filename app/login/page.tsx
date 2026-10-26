
'use client';

import { useState, type FormEvent } from 'react';

type Profile = {
  userId: number;
  email: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setProfile(null);

    try {
      // Step 1: Log in and receive the JWT token
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

      const token: string = loginData.access_token;

      if (!token) {
        throw new Error('The backend did not return an access token.');
      }

      // Step 2: Use the token to access the protected profile
      const profileResponse = await fetch(
        'http://localhost:3001/auth/profile',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const profileData = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error('Login succeeded, but profile access failed.');
      }

      // Step 3: Display the authenticated user's information
      setProfile(profileData.user);
    } catch (err) {
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

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {profile && (
        <section
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
          }}
        >
          <h2>Login successful!</h2>
          <p>Welcome, {profile.email}</p>
          <p>User ID: {profile.userId}</p>
          <p>Your protected profile was loaded successfully.</p>
        </section>
      )}
    </main>
  );
}
