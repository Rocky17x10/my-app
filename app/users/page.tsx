
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type User = {
  id: number;
  name: string;
  email: string;
};

const API_URL = 'http://localhost:3001';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function fetchUsers() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/users`);

      if (!response.ok) {
        throw new Error('Could not load users.');
      }

      const data = await response.json();
      setUsers(data);
    } catch {
      setError('Unable to connect to the backend. Check that NestJS is running.');
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
    setEditingId(null);
  }

  function startEditing(user: User) {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
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
      const url = editingId
        ? `${API_URL}/users/${editingId}`
        : `${API_URL}/users`;

      const body = editingId
        ? { name, email }
        : { name, email, password };

      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const detail = result?.message;

        throw new Error(
          Array.isArray(detail)
            ? detail.join(', ')
            : typeof detail === 'string'
              ? detail
              : 'Could not save the user.',
        );
      }

      setMessage(editingId ? 'User updated successfully.' : 'User created successfully.');
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
    if (!window.confirm(`Delete user "${user.name}"?`)) {
      return;
    }

    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          typeof result?.message === 'string'
            ? result.message
            : 'Could not delete the user.',
        );
      }

      if (editingId === user.id) {
        resetForm();
      }

      setMessage('User deleted successfully.');
      await fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold">IT Inventory System</h1>

          <div className="flex gap-4">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Dashboard
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
            Create, update, and manage system users.
          </p>
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
            {editingId ? 'Edit User' : 'Add New User'}
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
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                placeholder="user@example.com"
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
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                  placeholder="At least 8 characters"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Password is required when creating a user. Editing a user
                  does not change their password.
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
                    ? 'Update User'
                    : 'Create User'}
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
            <h3 className="text-xl font-semibold">System Users</h3>
            <button
              type="button"
              onClick={() => void fetchUsers()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="py-6 text-gray-500">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="py-6 text-gray-500">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="p-3">ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="p-3">{user.id}</td>
                      <td className="p-3 font-medium">{user.name}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
