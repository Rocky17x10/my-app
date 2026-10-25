
'use client';

import { useEffect, useState } from 'react';

type User = {
  id: number;
  name: string;
  email: string;
};

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function fetchUsers() {
    try {
      const response = await fetch('http://localhost:3001/users');

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data: User[] = await response.json();
      setUsers(data);
      setError('');
    } catch {
      setError('Could not load users. Please check the backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const response = await fetch('http://localhost:3001/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const newUser: User = await response.json();

      setUsers((currentUsers) => [...currentUsers, newUser]);
      setName('');
      setEmail('');
      setMessage('User added successfully!');
    } catch {
      setError('Could not add user. Please check the backend.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: number) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user?',
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setMessage('');
    setDeleting(userId);

    try {
      const response = await fetch(
        `http://localhost:3001/users/${userId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers((currentUsers) =>
        currentUsers.filter((user) => user.id !== userId),
      );

      setMessage('User deleted successfully!');
    } catch {
      setError('Could not delete user. Please check the backend.');
    } finally {
      setDeleting(null);
    }
  }


  return (
    <main style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>My Users</h1>
      <p>Users loaded from your NestJS backend and MySQL database.</p>

      <h2>Add New User</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '400px',
        }}
      >
        <input
          type="text"
          placeholder="Enter name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          style={{ padding: '10px' }}
        />

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={{ padding: '10px' }}
        />

        <button type="submit" disabled={saving} style={{ padding: '10px' }}>
          {saving ? 'Adding...' : 'Add User'}
        </button>
      </form>

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>User List</h2>

      {loading && <p>Loading users...</p>}

      {!loading && users.length === 0 && <p>No users found.</p>}

     
<ul>
  {users.map((user) => (
    <li key={user.id} style={{ marginBottom: '16px' }}>
      <strong>{user.name}</strong>
      <br />
      Email: {user.email}
      <br />
      ID: {user.id}
      <br />
      <button
        type="button"
        onClick={() => handleDelete(user.id)}
        disabled={deleting !== null}
        style={{
          padding: '6px 12px',
          marginTop: '8px',
          color: 'white',
          backgroundColor: 'red',
          border: 'none',
          borderRadius: '4px',
          cursor: deleting !== null ? 'not-allowed' : 'pointer',
        }}
      >
        {deleting === user.id ? 'Deleting...' : 'Delete User'}
      </button>
    </li>
  ))}
</ul>

    </main>
  );
}
