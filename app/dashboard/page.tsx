
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type UserRole = 'super_admin' | 'admin' | 'user';

type Profile = {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  department: string | null;
  designation: string | null;
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
        const user = data.user as Profile;

        if (
          user.role !== 'super_admin' &&
          user.role !== 'admin' &&
          user.role !== 'user'
        ) {
          throw new Error('Invalid account role.');
        }

        if (user.role === 'user') {
          router.replace('/my-assets');
          return;
        }

        if (!cancelled) {
          setProfile(user);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not connect to the backend.',
          );
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
    return (
      <main style={{ padding: '40px', fontFamily: 'Arial' }}>
        Checking authentication...
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: '40px', color: 'red' }}>
        {error}
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  const isSuperAdmin = profile.role === 'super_admin';

  const navLinkStyle = {
    padding: '10px 14px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 600,
  };

  const cardStyle = {
    padding: '24px',
    border: '1px solid #ddd',
    borderRadius: '12px',
    backgroundColor: '#fff',
    textDecoration: 'none',
    color: '#111',
    display: 'block',
  };

  return (
    <main
      style={{
        maxWidth: '1100px',
        margin: '40px auto',
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ marginBottom: '8px' }}>
            IT Inventory Dashboard
          </h1>

          <p style={{ color: '#666', margin: 0 }}>
            Welcome, {profile.name || profile.email}!
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '11px 20px',
            color: 'white',
            backgroundColor: '#dc2626',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </header>

      <nav
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '30px',
          padding: '14px',
          backgroundColor: '#f3f4f6',
          borderRadius: '10px',
        }}
      >
        <Link
          href="/dashboard"
          style={{
            ...navLinkStyle,
            backgroundColor: '#2563eb',
            color: '#fff',
          }}
        >
          Main Dashboard
        </Link>

        <Link
          href="/"
          style={{
            ...navLinkStyle,
            backgroundColor: '#fff',
            color: '#374151',
            border: '1px solid #d1d5db',
          }}
        >
          Asset Management
        </Link>

        <Link
          href="/users"
          style={{
            ...navLinkStyle,
            backgroundColor: '#fff',
            color: '#374151',
            border: '1px solid #d1d5db',
          }}
        >
          User Management
        </Link>
      </nav>

      <section
        style={{
          padding: '22px',
          backgroundColor: '#f3f4f6',
          borderRadius: '12px',
          marginBottom: '30px',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Account Information</h2>

        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>User ID:</strong> {profile.userId}</p>
        <p>
          <strong>Role:</strong>{' '}
          {isSuperAdmin ? 'Super Admin' : 'Admin'}
        </p>
        <p>
          <strong>Department:</strong>{' '}
          {profile.department || 'Not specified'}
        </p>
        <p>
          <strong>Designation:</strong>{' '}
          {profile.designation || 'Not specified'}
        </p>
      </section>

      <h2>Management</h2>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '18px',
          marginTop: '18px',
        }}
      >
        <Link href="/" style={cardStyle}>
          <h3>Asset Management</h3>
          <p>View, add, edit and manage IT equipment.</p>
          <strong style={{ color: '#2563eb' }}>
            Open Asset Management →
          </strong>
        </Link>

        <Link href="/users" style={cardStyle}>
          <h3>Employee Management</h3>
          <p>Manage employee information, departments and designations.</p>
          <strong style={{ color: '#2563eb' }}>
            Open Employee Management →
          </strong>
        </Link>

        {isSuperAdmin && (
          <div
            style={{
              ...cardStyle,
              backgroundColor: '#f9fafb',
            }}
          >
            <h3>Role Management</h3>
            <p>
              Promote employees to Admin or change Admin accounts
              back to regular Users.
            </p>
            <strong style={{ color: '#6b7280' }}>
              Next feature to build
            </strong>
          </div>
        )}
      </section>

      <footer
        style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid #ddd',
          color: '#777',
          fontSize: '13px',
        }}
      >
        IT Inventory Software
      </footer>
    </main>
  );
}
