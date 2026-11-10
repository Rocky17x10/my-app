
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNavigation from '../components/AdminNavigation';
import NotificationBell from '../components/NotificationBell';

type UserRole = 'super_admin' | 'admin' | 'user';

type Profile = {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  department: string | null;
  designation: string | null;
};

type DashboardStatistics = {
  summary: {
    totalAssets: number;
    availableAssets: number;
    assignedAssets: number;
    maintenanceAssets: number;
    retiredAssets: number;
    totalEmployees: number;
    pendingRequests: number;
  };
  departmentStatistics: {
    department: string;
    totalAssets: number;
  }[];
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [statistics, setStatistics] =
    useState<DashboardStatistics | null>(null);

  const [loading, setLoading] = useState(true);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const [error, setError] = useState('');
  const [statisticsError, setStatisticsError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
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
          setStatisticsLoading(true);
        }

        // Load live dashboard statistics
        try {
          const statsResponse = await fetch(
            'http://localhost:3001/dashboard/statistics',
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (!statsResponse.ok) {
            throw new Error(
              'Could not load dashboard statistics.',
            );
          }

          const statsData =
            (await statsResponse.json()) as DashboardStatistics;

          if (!cancelled) {
            setStatistics(statsData);
          }
        } catch (statsErr) {
          if (!cancelled) {
            setStatisticsError(
              statsErr instanceof Error
                ? statsErr.message
                : 'Could not load dashboard statistics.',
            );
          }
        } finally {
          if (!cancelled) {
            setStatisticsLoading(false);
          }
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

    loadDashboard();

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

  const summary = statistics?.summary;

  const statCards = [
    {
      title: 'Total Assets',
      value: summary?.totalAssets,
      color: 'border-blue-500',
      background: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      title: 'Available Assets',
      value: summary?.availableAssets,
      color: 'border-green-500',
      background: 'bg-green-50',
      text: 'text-green-700',
    },
    {
      title: 'Assigned Assets',
      value: summary?.assignedAssets,
      color: 'border-purple-500',
      background: 'bg-purple-50',
      text: 'text-purple-700',
    },
    {
      title: 'Under Maintenance',
      value: summary?.maintenanceAssets,
      color: 'border-orange-500',
      background: 'bg-orange-50',
      text: 'text-orange-700',
    },
    {
      title: 'Retired Assets',
      value: summary?.retiredAssets,
      color: 'border-gray-500',
      background: 'bg-gray-100',
      text: 'text-gray-700',
    },
    {
      title: 'Total Employees',
      value: summary?.totalEmployees,
      color: 'border-indigo-500',
      background: 'bg-indigo-50',
      text: 'text-indigo-700',
    },
    {
      title: 'Pending Requests',
      value: summary?.pendingRequests,
      color: 'border-red-500',
      background: 'bg-red-50',
      text: 'text-red-700',
    },
  ];

  const departmentData = statistics?.departmentStatistics ?? [];

  const maxDepartmentAssets = Math.max(
    ...departmentData.map((item) => item.totalAssets),
    1,
  );

  const totalAssets = summary?.totalAssets ?? 0;

  const statusData = [
    {
      name: 'Available',
      value: summary?.availableAssets ?? 0,
      color: 'bg-green-500',
    },
    {
      name: 'Assigned',
      value: summary?.assignedAssets ?? 0,
      color: 'bg-purple-500',
    },
    {
      name: 'Maintenance',
      value: summary?.maintenanceAssets ?? 0,
      color: 'bg-orange-500',
    },
    {
      name: 'Retired',
      value: summary?.retiredAssets ?? 0,
      color: 'bg-gray-500',
    },
  ];

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

            {/* Notification Bell and Logout */}
            <div className="flex items-center gap-3">
              <NotificationBell
                ticketHref="/support-center/tickets"
              />

              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          <AdminNavigation activeTab="dashboard" />
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">

        {/* Account Information */}
        <section className="bg-white rounded-xl border shadow-sm p-5 mb-6">

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

        {/* Statistics */}
        <section className="mb-7">

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Inventory Overview
            </h2>

            <span className="text-xs text-gray-500">
              Live database statistics
            </span>
          </div>

          {statisticsLoading && (
            <p className="text-sm text-gray-500 mb-4">
              Loading statistics...
            </p>
          )}

          {statisticsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
              {statisticsError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {statCards.map((card) => (
              <div
                key={card.title}
                className={`rounded-xl border-l-4 ${card.color} ${card.background} p-5 shadow-sm`}
              >
                <p className="text-sm text-gray-600 font-medium">
                  {card.title}
                </p>

                <p className={`text-3xl font-bold mt-2 ${card.text}`}>
                  {statisticsLoading && !statistics
                    ? '...'
                    : statisticsError && !statistics
                      ? '--'
                      : card.value ?? 0}
                </p>
              </div>
            ))}

          </div>
        </section>

        {/* Graphical Reports */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">

          {/* Asset Status Chart */}
          <div className="bg-white rounded-xl border shadow-sm p-5">

            <h2 className="text-lg font-semibold text-gray-800 mb-5">
              Asset Status Distribution
            </h2>

            {!statistics && !statisticsLoading && (
              <p className="text-sm text-gray-500">
                Statistics are not available.
              </p>
            )}

            {statistics && (
              <>
                <div className="flex h-5 overflow-hidden rounded-full bg-gray-100 mb-5">

                  {statusData.map((item) => (
                    <div
                      key={item.name}
                      className={item.color}
                      style={{
                        width:
                          totalAssets > 0
                            ? `${(item.value / totalAssets) * 100}%`
                            : '0%',
                      }}
                      title={`${item.name}: ${item.value}`}
                    />
                  ))}

                </div>

                <div className="space-y-4">

                  {statusData.map((item) => (
                    <div key={item.name}>

                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">
                          {item.name}
                        </span>

                        <strong className="text-gray-800">
                          {item.value}
                        </strong>
                      </div>

                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`${item.color} h-full rounded-full`}
                          style={{
                            width:
                              totalAssets > 0
                                ? `${(item.value / totalAssets) * 100}%`
                                : '0%',
                          }}
                        />
                      </div>

                    </div>
                  ))}

                </div>

                <p className="text-xs text-gray-500 mt-5">
                  Total assets: {totalAssets}
                </p>
              </>
            )}

          </div>

          {/* Department Chart */}
          <div className="bg-white rounded-xl border shadow-sm p-5">

            <h2 className="text-lg font-semibold text-gray-800 mb-5">
              Department-wise Assets
            </h2>

            {statistics && departmentData.length === 0 && (
              <p className="text-sm text-gray-500">
                No department statistics available yet.
              </p>
            )}

            {statistics && departmentData.length > 0 && (
              <div className="space-y-5">

                {departmentData.map((item) => (
                  <div key={item.department}>

                    <div className="flex justify-between gap-3 text-sm mb-2">

                      <span className="text-gray-700 font-medium">
                        {item.department}
                      </span>

                      <strong className="text-gray-800">
                        {item.totalAssets}
                      </strong>

                    </div>

                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden">

                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${(item.totalAssets / maxDepartmentAssets) * 100}%`,
                        }}
                      />

                    </div>

                  </div>
                ))}

              </div>
            )}

            {statisticsLoading && !statistics && (
              <p className="text-sm text-gray-500">
                Loading department statistics...
              </p>
            )}

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
