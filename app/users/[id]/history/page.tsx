
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = 'http://localhost:3001';

type HistoryRecord = {
  id: number;
  asset: {
    id: number;
    assetTag: string;
    name: string;
    category: string;
    brand: string | null;
    model: string | null;
  };
  assignedTo: {
    id: number;
    name: string;
    email: string;
    department: string | null;
  };
  assignedBy: {
    id: number;
    name: string;
    email: string;
  } | null;
  assignedAt: string;
  returnedAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return 'Not returned yet';

  return new Date(value).toLocaleString();
}

export default function EmployeeHistoryPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHistory() {
      try {
        const token = sessionStorage.getItem('access_token');

        if (!token) {
          window.location.assign('/login');
          return;
        }

        const response = await fetch(
          `${API_URL}/assets/history/employee/${employeeId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.status === 401) {
          sessionStorage.removeItem('access_token');
          window.location.assign('/login');
          return;
        }

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(
            result?.message || 'Could not load employee history.',
          );
        }

        const data = await response.json();
        setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Something went wrong.',
        );
      } finally {
        setLoading(false);
      }
    }

    if (employeeId) {
      void loadHistory();
    }
  }, [employeeId]);

  const employee = history[0]?.assignedTo;

  const activeCount = history.filter(
    (record) => !record.returnedAt,
  ).length;

  const returnedCount = history.filter(
    (record) => Boolean(record.returnedAt),
  ).length;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 flex flex-wrap justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold">IT Inventory System</h1>

          <div className="flex gap-3">
            <Link
              href="/users"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              User Management
            </Link>

            <Link
              href="/"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Asset Management
            </Link>
          </div>
        </nav>

        <header className="mb-6">
          <h2 className="text-3xl font-bold">Employee Assignment History</h2>
          <p className="mt-2 text-gray-600">
            All current and previous assets assigned to this employee.
          </p>
        </header>

        {error && (
          <div className="mb-5 rounded-lg bg-red-100 p-4 text-red-800">
            {error}
          </div>
        )}

        {employee && (
          <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">
              Employee Information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Employee Name</p>
                <p className="font-semibold">{employee.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold">{employee.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-semibold">
                  {employee.department || '—'}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border-l-4 border-blue-600 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Assignments</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? '—' : history.length}
            </p>
          </div>

          <div className="rounded-xl border-l-4 border-green-600 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Currently Assigned</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? '—' : activeCount}
            </p>
          </div>

          <div className="rounded-xl border-l-4 border-gray-500 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Returned</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? '—' : returnedCount}
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-xl font-semibold">
            Assignment Records
          </h3>

          {loading ? (
            <p className="py-8 text-center text-gray-500">
              Loading employee history...
            </p>
          ) : error ? null : history.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No assignment history found for this employee.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="p-3">Asset Tag</th>
                    <th className="p-3">Asset Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Assigned By</th>
                    <th className="p-3">Assigned Date</th>
                    <th className="p-3">Return Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((record) => (
                    <tr key={record.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">
                        {record.asset.assetTag}
                      </td>

                      <td className="p-3">
                        <p className="font-semibold">{record.asset.name}</p>
                        <p className="text-xs text-gray-500">
                          {[record.asset.brand, record.asset.model]
                            .filter(Boolean)
                            .join(' / ')}
                        </p>
                      </td>

                      <td className="p-3">{record.asset.category}</td>

                      <td className="p-3">
                        {record.assignedBy ? (
                          <>
                            <p>{record.assignedBy.name}</p>
                            <p className="text-xs text-gray-500">
                              {record.assignedBy.email}
                            </p>
                          </>
                        ) : (
                          <span className="text-gray-400">
                            Unknown (legacy record)
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {formatDate(record.assignedAt)}
                      </td>

                      <td className="p-3">
                        {record.returnedAt
                          ? formatDate(record.returnedAt)
                          : '—'}
                      </td>

                      <td className="p-3">
                        {record.returnedAt ? (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            Returned
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                            Currently Assigned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-gray-400">
          IT Inventory Management System
        </p>
      </div>
    </main>
  );
}
