
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type UserRole = 'super_admin' | 'admin' | 'user';

type User = {
  id: number;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  role: UserRole;
};

const API_URL = 'http://localhost:3001';

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token');

  if (!token) {
    window.location.assign('/login');
    throw new Error('Please log in again.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const result = await response.json().catch(() => null);

  if (response.status === 401) {
    sessionStorage.removeItem('access_token');
    window.location.assign('/login');
    return 'Your session has expired. Please log in again.';
  }

  if (response.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (result?.message) {
    return Array.isArray(result.message)
      ? result.message.join(', ')
      : result.message;
  }

  return `${fallback} (HTTP ${response.status})`;
}

function roleLabel(role: UserRole) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    default:
      return 'User';
  }
}

function roleStyle(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return 'bg-purple-100 text-purple-800';
    case 'admin':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function fetchUsers() {
    setLoading(true);
    setError('');

    try {
      const headers = getAuthHeaders();

      const [usersResponse, profileResponse] = await Promise.all([
        fetch(`${API_URL}/users`, { headers }),
        fetch(`${API_URL}/auth/profile`, { headers }),
      ]);

      if (!usersResponse.ok) {
        throw new Error(
          await getErrorMessage(usersResponse, 'Could not load employees.'),
        );
      }

      if (!profileResponse.ok) {
        throw new Error(
          await getErrorMessage(profileResponse, 'Could not load your profile.'),
        );
      }

      const usersData = await usersResponse.json();
      const profileData = await profileResponse.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCurrentRole(profileData.role);
      setCurrentUserId(profileData.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load employees from backend.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchUsers();
  }, []);

  function resetForm() {
    setName('');
    setEmail('');
    setPassword('');
    setDepartment('');
    setDesignation('');
    setEditingId(null);
  }

  function startEditing(user: User) {
    if (user.role === 'super_admin') {
      setError('The Super Admin account cannot be edited.');
      return;
    }

    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setDepartment(user.department || '');
    setDesignation(user.designation || '');
    setMessage('');
    setError('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const headers = getAuthHeaders();

      const url = editingId
        ? `${API_URL}/users/${editingId}`
        : `${API_URL}/users`;

      const body = editingId
        ? { name, email, department, designation }
        : { name, email, password, department, designation };

      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, 'Could not save employee.'),
        );
      }

      setMessage(
        editingId
          ? 'Employee updated successfully.'
          : 'Employee created successfully.',
      );

      resetForm();
      await fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (user.role === 'super_admin') {
      setError('The Super Admin account cannot be deleted.');
      return;
    }

    if (!window.confirm(`Delete employee "${user.name}"?`)) {
      return;
    }

    setMessage('');
    setError('');

    try {
      const headers = getAuthHeaders();

      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, 'Could not delete employee.'),
        );
      }

      if (editingId === user.id) {
        resetForm();
      }

      setMessage('Employee deleted successfully.');
      await fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    }
  }

  async function handleRoleChange(user: User, newRole: 'admin' | 'user') {
    if (currentRole !== 'super_admin') {
      setError('Only the Super Admin can change employee roles.');
      return;
    }

    if (user.id === currentUserId) {
      setError('You cannot change your own role.');
      return;
    }

    if (user.role === 'super_admin') {
      setError('The Super Admin role cannot be changed.');
      return;
    }

    if (user.role === newRole) {
      return;
    }

    const confirmed = window.confirm(
      `Change ${user.name}'s role from ${roleLabel(user.role)} to ${roleLabel(newRole)}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage('');
    setError('');

    try {
      const headers = getAuthHeaders();

      const response = await fetch(`${API_URL}/users/${user.id}/role`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, 'Could not change employee role.'),
        );
      }

      setMessage(`${user.name}'s role changed to ${roleLabel(newRole)}.`);
      await fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not change employee role.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 sm:p-8">
      <div className="mx-auto max-w-7xl">

        <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold">IT Inventory System</h1>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Main Dashboard
            </Link>

            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Asset Management
            </Link>

            <Link
              href="/users"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
            >
              User Management
            </Link>
          </div>
        </nav>

        <header className="mb-6">
          <h2 className="text-3xl font-bold">User Management</h2>
          <p className="mt-2 text-gray-600">
            Create, update, and manage employee records and roles.
          </p>

          {currentRole && (
            <p className="mt-3 text-sm text-gray-600">
              Your account role:{' '}
              <span
                className={`rounded-full px-3 py-1 font-semibold ${roleStyle(currentRole)}`}
              >
                {roleLabel(currentRole)}
              </span>
            </p>
          )}
        </header>

        {message && (
          <p className="mb-4 rounded-lg bg-green-100 p-3 text-green-800">
            {message}
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-lg bg-red-100 p-3 text-red-800">
            {error}
          </p>
        )}

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-xl font-semibold">
            {editingId ? 'Edit Employee' : 'Add New Employee'}
          </h3>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                Full Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={100}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={150}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="department"
                className="mb-1 block text-sm font-medium"
              >
                Department
              </label>
              <input
                id="department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                placeholder="e.g. IT, HR, Finance"
              />
            </div>

            <div>
              <label
                htmlFor="designation"
                className="mb-1 block text-sm font-medium"
              >
                Designation
              </label>
              <input
                id="designation"
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                placeholder="e.g. IT Officer, Manager"
              />
            </div>

            {!editingId && (
              <div className="sm:col-span-2">
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                  placeholder="At least 8 characters"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Password is required when creating an employee. Editing
                  an employee does not change their password.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Employee'
                    : 'Create Employee'}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-medium hover:bg-gray-100"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Employees</h3>
              <p className="mt-1 text-sm text-gray-500">
                {users.length} employee records
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchUsers()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="py-6 text-gray-500">Loading employees...</p>
          ) : users.length === 0 ? (
            <p className="py-6 text-gray-500">No employees found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="p-3">ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const isSuperAdmin = user.role === 'super_admin';
                    const isCurrentUser = user.id === currentUserId;

                    return (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="p-3">{user.id}</td>

                        <td className="p-3 font-medium">
                          {user.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-gray-500">
                              (You)
                            </span>
                          )}
                        </td>

                        <td className="p-3">{user.email}</td>

                        <td className="p-3">
                          {user.department || '-'}
                        </td>

                        <td className="p-3">
                          {user.designation || '-'}
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${roleStyle(user.role)}`}
                          >
                            {roleLabel(user.role)}
                          </span>

                          {currentRole === 'super_admin' &&
                            !isSuperAdmin &&
                            !isCurrentUser && (
                              <select
                                value={user.role}
                                onChange={(event) =>
                                  void handleRoleChange(
                                    user,
                                    event.target.value as 'admin' | 'user',
                                  )
                                }
                                className="mt-2 block rounded-md border border-gray-300 p-2 text-xs"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                        </td>

                        <td className="p-3">
                          {isSuperAdmin ? (
                            <span className="text-xs text-gray-500">
                              Protected account
                            </span>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEditing(user)}
                                className="rounded-md bg-amber-100 px-3 py-2 text-amber-800 hover:bg-amber-200"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(user)}
                                className="rounded-md bg-red-100 px-3 py-2 text-red-700 hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
