
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import AdminNavigation from '../components/AdminNavigation';
import NotificationBell from '../components/NotificationBell';

const API_URL = 'http://localhost:3001';

type UserRole = 'super_admin' | 'admin' | 'user';

type User = {
  id: number;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  role: UserRole;
};

type Profile = {
  id?: number;
  userId?: number;
  role: UserRole;
  user?: {
    id?: number;
    userId?: number;
    role: UserRole;
  };
};

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('access_token');

  if (!token) {
    window.location.replace('/login');
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function getErrorMessage(data: any, status: number): string {
  if (status === 401) {
    sessionStorage.removeItem('access_token');
    window.location.replace('/login');
    return 'Your session has expired. Please log in again.';
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (data?.message) {
    return Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
  }

  return `Request failed with status ${status}.`;
}

function roleLabel(role: UserRole): string {
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
  const [changingRoleId, setChangingRoleId] = useState<number | null>(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isSuperAdmin = currentRole === 'super_admin';

  // Load employees and authenticated profile
  async function fetchUsers() {
    setLoading(true);
    setError('');

    try {
      const headers = getAuthHeaders();

      const [usersResponse, profileResponse] = await Promise.all([
        fetch(`${API_URL}/users`, { headers }),
        fetch(`${API_URL}/auth/profile`, { headers }),
      ]);

      const usersData = await usersResponse.json().catch(() => []);
      const profileData: Profile | any = await profileResponse
        .json()
        .catch(() => ({}));

      if (!usersResponse.ok) {
        throw new Error(
          getErrorMessage(usersData, usersResponse.status),
        );
      }

      if (!profileResponse.ok) {
        throw new Error(
          getErrorMessage(profileData, profileResponse.status),
        );
      }

      // Backend profile may return { message, user: {...} }
      // or a direct profile object.
      const authenticatedUser = profileData.user ?? profileData;

      setUsers(Array.isArray(usersData) ? usersData : []);

      setCurrentRole(authenticatedUser.role ?? null);

      setCurrentUserId(
        authenticatedUser.id ??
        authenticatedUser.userId ??
        null,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load employees.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchUsers();
  }, []);

  // Logout
  function handleLogout() {
    sessionStorage.removeItem('access_token');
    window.location.replace('/login');
  }

  // Reset employee form
  function resetForm() {
    setName('');
    setEmail('');
    setPassword('');
    setDepartment('');
    setDesignation('');
    setEditingId(null);
  }

  // Load existing employee information into the form
  function startEditing(user: User) {
    if (user.role === 'super_admin') {
      setError('The Super Admin account cannot be edited.');
      return;
    }

    setMessage('');
    setError('');

    // Fill the form using the existing employee row data.
    setEditingId(user.id);
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setDepartment(user.department ?? '');
    setDesignation(user.designation ?? '');
    setPassword('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // Create or update employee
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }

    if (!editingId && !password.trim()) {
      setError('Password is required for a new employee.');
      return;
    }

    setSaving(true);

    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      };

      const body: Record<string, string> = {
        name: name.trim(),
        email: email.trim(),
        department: department.trim(),
        designation: designation.trim(),
      };

      if (!editingId) {
        body.password = password;
      }

      const response = await fetch(
        editingId
          ? `${API_URL}/users/${editingId}`
          : `${API_URL}/users`,
        {
          method: editingId ? 'PATCH' : 'POST',
          headers,
          body: JSON.stringify(body),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, response.status));
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
        err instanceof Error
          ? err.message
          : 'Unable to save employee.',
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete employee
  async function handleDelete(user: User) {
    if (user.role === 'super_admin') {
      setError('The Super Admin account cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      return;
    }

    setMessage('');
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/users/${user.id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, response.status));
      }

      setMessage('Employee deleted successfully.');

      if (editingId === user.id) {
        resetForm();
      }

      await fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete employee.',
      );
    }
  }

  // Change employee role
  async function handleRoleChange(
    user: User,
    newRole: UserRole,
  ) {
    if (!isSuperAdmin) {
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

    setMessage('');
    setError('');
    setChangingRoleId(user.id);

    try {
      const response = await fetch(
        `${API_URL}/users/${user.id}/role`,
        {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: newRole }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, response.status));
      }

      setMessage(`Role updated for ${user.name}.`);

      await fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update employee role.',
      );
    } finally {
      setChangingRoleId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header, notification and logout */}
        <div className="mb-8 rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              IT Inventory System
            </h1>

            <div className="flex shrink-0 items-center gap-3">
              <NotificationBell ticketHref="/support-center/tickets" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex h-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Logout
              </button>
            </div>
          </div>

          <AdminNavigation activeTab="users" />
        </div>

        {/* Page heading */}
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              User Management
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Manage employees, departments and user roles.
            </p>
          </div>

          {currentRole && (
            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${roleStyle(currentRole)}`}
            >
              Logged in as: {roleLabel(currentRole)}
            </span>
          )}
        </div>

        {/* Success message */}
        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
            {message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {/* Employee form */}
        <section className="mb-8 rounded-xl bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900">
              {editingId ? 'Edit Employee' : 'Add New Employee'}
            </h3>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel Editing
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="employee-name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>

                <input
                  id="employee-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter full name"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="employee-email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>

                <input
                  id="employee-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email address"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="employee-department"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Department
                </label>

                <input
                  id="employee-department"
                  type="text"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  placeholder="Enter department"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="employee-designation"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Designation
                </label>

                <input
                  id="employee-designation"
                  type="text"
                  value={designation}
                  onChange={(event) => setDesignation(event.target.value)}
                  placeholder="Enter designation"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {!editingId && (
                <div className="md:col-span-2">
                  <label
                    htmlFor="employee-password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>

                  <input
                    id="employee-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter initial password"
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Employee'
                    : 'Add Employee'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Employees table */}
        <section className="rounded-xl bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Employees
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Total employees: {users.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchUsers()}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading employees...
            </div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No employees found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold">Designation</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">History</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const isProtected = user.role === 'super_admin';
                    const isCurrentUser = user.id === currentUserId;

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-gray-600">
                          {user.id}
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-900">
                          {user.name}

                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-blue-600">
                              (You)
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {user.email}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {user.department || '-'}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {user.designation || '-'}
                        </td>

                        <td className="px-4 py-3">
                          {isSuperAdmin && !isProtected && !isCurrentUser ? (
                            <select
                              value={user.role}
                              disabled={changingRoleId === user.id}
                              onChange={(event) =>
                                void handleRoleChange(
                                  user,
                                  event.target.value as UserRole,
                                )
                              }
                              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500 disabled:cursor-wait disabled:opacity-60"
                            >
                              <option
                                className="bg-white text-gray-900"
                                value="user"
                              >
                                User
                              </option>

                              <option
                                className="bg-white text-gray-900"
                                value="admin"
                              >
                                Admin
                              </option>
                            </select>
                          ) : (
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${roleStyle(user.role)}`}
                            >
                              {roleLabel(user.role)}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <Link
                            href={`/users/${user.id}/history`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View History
                          </Link>
                        </td>

                        <td className="px-4 py-3">
                          {isProtected ? (
                            <span className="text-xs font-medium text-gray-400">
                              Protected
                            </span>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => startEditing(user)}
                                className="font-semibold text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(user)}
                                className="font-semibold text-red-600 hover:text-red-800"
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

        <footer className="mt-8 pb-4 text-center text-sm text-gray-500">
          IT Inventory Management System
        </footer>
      </div>
    </main>
  );
}
