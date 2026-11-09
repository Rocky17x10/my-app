
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNavigation from '../components/AdminNavigation';

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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-800">
        Checking authentication...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 text-red-600">
        {error}
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  const isSuperAdmin = profile.role === 'super_admin';

  const cardStyle = {
    padding: '20px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    textDecoration: 'none',
    color: '#111827',
    display: 'block',
  };

  return (
    <main className="min-h-screen w-full bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                IT Inventory Dashboard
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                Welcome, {profile.name || profile.email}!
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>

          {/* Shared five-tab navigation */}
          <AdminNavigation activeTab="dashboard" />
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">

        {/* Account Information */}
        <section className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Account Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <p>
              <strong>Name:</strong> {profile.name}
            </p>

            <p>
              <strong>Email:</strong> {profile.email}
            </p>

            <p>
              <strong>User ID:</strong> {profile.userId}
            </p>

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
          </div>
        </section>

        {/* Management */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Management
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Link
              href="/"
              style={cardStyle}
              className="hover:border-blue-300 hover:shadow-md transition"
            >
              <h3 className="font-semibold text-gray-800 mb-2">
                Asset Management
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                View, add, edit and manage IT equipment.
              </p>

              <strong className="text-sm text-blue-600">
                Open Asset Management →
              </strong>
            </Link>

            <Link
              href="/users"
              style={cardStyle}
              className="hover:border-blue-300 hover:shadow-md transition"
            >
              <h3 className="font-semibold text-gray-800 mb-2">
                Employee Management
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                Manage employee information, departments and designations.
              </p>

              <strong className="text-sm text-blue-600">
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
                <h3 className="font-semibold text-gray-800 mb-2">
                  Role Management
                </h3>

                <p className="text-sm text-gray-600 mb-4">
                  Promote employees to Admin or change Admin accounts
                  back to regular Users.
                </p>

                <strong className="text-sm text-gray-500">
                  Next feature to build
                </strong>
              </div>
            )}

          </div>
        </section>

        {/* Footer */}
        <footer className="mt-6 pt-4 border-t border-gray-200 text-gray-500 text-xs">
          IT Inventory Software
        </footer>
      </div>
    </main>
  );
}
