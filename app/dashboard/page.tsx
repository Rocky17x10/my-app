
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Profile = {
  userId: number;
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const token = sessionStorage.getItem('access_token');

      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const response = await fetch(
          'http://localhost:3001/auth/profile',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          sessionStorage.removeItem('access_token');
          router.replace('/login');
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setProfile(data.user);
        }
      } catch {
        if (!cancelled) {
          setError('Could not connect to the backend.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem('access_token');
    router.replace('/login');
  }

  if (loading) {
    return <main style={{ padding: '40px' }}>Checking authentication...</main>;
  }

  if (error) {
    return <main style={{ padding: '40px', color: 'red' }}>{error}</main>;
  }

  if (!profile) {
    return null;
  }

  return (
    <main
      style={{
        maxWidth: '600px',
        margin: '80px auto',
        padding: '30px',
        fontFamily: 'Arial, sans-serif',
        border: '1px solid #ddd',
        borderRadius: '12px',
      }}
    >
      <h1>Dashboard</h1>
      <p>Welcome, {profile.email}!</p>
      <p>User ID: {profile.userId}</p>
      <p>Your protected profile was loaded from the NestJS backend.</p>

      <button
        onClick={handleLogout}
        style={{
          marginTop: '16px',
          padding: '12px 20px',
          color: 'white',
          backgroundColor: '#dc2626',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </main>
  );
}
