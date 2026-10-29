
'use client';

import { useEffect, useState } from 'react';

type User = {
  id: number;
  name: string;
  email: string;
};

type Asset = {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  assignedTo: number | null;
  department: string | null;
  location: string | null;
  purchaseDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const API_URL = 'http://localhost:3001';

export default function Home() {
  // User state
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Asset state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState('');
  const [savingAsset, setSavingAsset] = useState(false);
  const [assetMessage, setAssetMessage] = useState('');
  const [assetFormError, setAssetFormError] = useState('');

  // Asset form fields
  const [assetTag, setAssetTag] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('');
  const [assetBrand, setAssetBrand] = useState('');
  const [assetModel, setAssetModel] = useState('');
  const [assetSerialNumber, setAssetSerialNumber] = useState('');
  const [assetStatus, setAssetStatus] =
    useState<Asset['status']>('available');
  const [assetDepartment, setAssetDepartment] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetPurchaseDate, setAssetPurchaseDate] = useState('');
  const [assetNotes, setAssetNotes] = useState('');

  // Shared user messages
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function fetchUsers() {
    try {
      const response = await fetch(`${API_URL}/users`);

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

  async function fetchAssets() {
    try {
      const response = await fetch(`${API_URL}/assets`);

      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const data: Asset[] = await response.json();
      setAssets(data);
      setAssetsError('');
    } catch {
      setAssetsError('Could not load assets. Please check the backend.');
    } finally {
      setAssetsLoading(false);
    }
  }

  useEffect(() => {
    void fetchUsers();
    void fetchAssets();
  }, []);

  // Create user
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.message
            ? Array.isArray(data.message)
              ? data.message.join(', ')
              : data.message
            : 'Failed to create user',
        );
      }

      const newUser: User = await response.json();
      setUsers((currentUsers) => [...currentUsers, newUser]);
      setName('');
      setEmail('');
      setPassword('');
      setMessage('User added successfully!');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not add user. Please check the backend.',
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete user
  async function handleDelete(userId: number) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user?',
    );

    if (!confirmed) return;

    setError('');
    setMessage('');
    setDeleting(userId);

    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
      });

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

  // Start editing a user
  function startEditing(user: User) {
    setEditing(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setError('');
    setMessage('');
  }

  function cancelEditing() {
    setEditing(null);
    setEditName('');
    setEditEmail('');
  }

  // Update user
  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editing === null) return;

    setError('');
    setMessage('');
    setSavingEdit(true);

    try {
      const response = await fetch(`${API_URL}/users/${editing}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.message
            ? Array.isArray(data.message)
              ? data.message.join(', ')
              : data.message
            : 'Failed to update user',
        );
      }

      const updatedUser: User = await response.json();

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user,
        ),
      );

      setEditing(null);
      setEditName('');
      setEditEmail('');
      setMessage('User updated successfully!');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update user. Please check the backend.',
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // Create asset
  async function handleAssetSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setAssetMessage('');
    setAssetFormError('');
    setSavingAsset(true);

    try {
      const response = await fetch(`${API_URL}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetTag: assetTag.trim(),
          name: assetName.trim(),
          category: assetCategory.trim(),
          brand: assetBrand.trim() || null,
          model: assetModel.trim() || null,
          serialNumber: assetSerialNumber.trim() || null,
          status: assetStatus,
          department: assetDepartment.trim() || null,
          location: assetLocation.trim() || null,
          purchaseDate: assetPurchaseDate || null,
          notes: assetNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.message
            ? Array.isArray(data.message)
              ? data.message.join(', ')
              : data.message
            : 'Failed to create asset',
        );
      }

      const newAsset: Asset = await response.json();

      setAssets((currentAssets) => [newAsset, ...currentAssets]);

      setAssetTag('');
      setAssetName('');
      setAssetCategory('');
      setAssetBrand('');
      setAssetModel('');
      setAssetSerialNumber('');
      setAssetStatus('available');
      setAssetDepartment('');
      setAssetLocation('');
      setAssetPurchaseDate('');
      setAssetNotes('');

      setAssetMessage(`Asset "${newAsset.assetTag}" added successfully!`);
    } catch (err) {
      setAssetFormError(
        err instanceof Error
          ? err.message
          : 'Could not add asset. Please check the backend.',
      );
    } finally {
      setSavingAsset(false);
    }
  }

  // Shared styles
  const sectionStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    padding: '24px',
    marginBottom: '28px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '5px',
    width: '100%',
    boxSizing: 'border-box',
    font: 'inherit',
    marginTop: '6px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '9px 14px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '850px',
  };

  const cellStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'left',
    fontSize: '14px',
  };

  function statusStyle(status: Asset['status']): React.CSSProperties {
    const colors = {
      available: { background: '#dcfce7', color: '#166534' },
      assigned: { background: '#dbeafe', color: '#1d4ed8' },
      maintenance: { background: '#fef3c7', color: '#92400e' },
      retired: { background: '#f3f4f6', color: '#374151' },
    };

    return {
      backgroundColor: colors[status].background,
      color: colors[status].color,
      padding: '4px 9px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    };
  }

  return (
    <main
      style={{
        padding: '32px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f8fafc',
        color: '#1f2937',
        minHeight: '100vh',
      }}
    >
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>
          IT Inventory Dashboard
        </h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Manage IT assets and users from your NestJS backend and MySQL database.
        </p>
      </header>

      {/* Inventory summary */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div style={{ ...sectionStyle, marginBottom: 0 }}>
          <p style={{ color: '#64748b', margin: '0 0 8px' }}>
            Total Assets
          </p>
          <h2 style={{ fontSize: '30px', margin: 0 }}>
            {assetsLoading ? '...' : assets.length}
          </h2>
        </div>

        <div style={{ ...sectionStyle, marginBottom: 0 }}>
          <p style={{ color: '#64748b', margin: '0 0 8px' }}>
            Available Assets
          </p>
          <h2 style={{ fontSize: '30px', margin: 0 }}>
            {assetsLoading
              ? '...'
              : assets.filter((asset) => asset.status === 'available').length}
          </h2>
        </div>

        <div style={{ ...sectionStyle, marginBottom: 0 }}>
          <p style={{ color: '#64748b', margin: '0 0 8px' }}>
            Assigned Assets
          </p>
          <h2 style={{ fontSize: '30px', margin: 0 }}>
            {assetsLoading
              ? '...'
              : assets.filter((asset) => asset.status === 'assigned').length}
          </h2>
        </div>
      </section>

      {/* Add new asset */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Add New Asset</h2>
        <p style={{ color: '#64748b' }}>
          Register a new computer, monitor, or other IT asset.
        </p>

        <form
          onSubmit={handleAssetSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <label htmlFor="asset-tag">Asset Tag *</label>
            <input
              id="asset-tag"
              value={assetTag}
              onChange={(event) => setAssetTag(event.target.value)}
              placeholder="e.g. AST-003"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="asset-name">Asset Name *</label>
            <input
              id="asset-name"
              value={assetName}
              onChange={(event) => setAssetName(event.target.value)}
              placeholder="e.g. Dell Monitor"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="asset-category">Category *</label>
            <input
              id="asset-category"
              value={assetCategory}
              onChange={(event) => setAssetCategory(event.target.value)}
              placeholder="Laptop, Monitor, Printer"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="asset-brand">Brand</label>
            <input
              id="asset-brand"
              value={assetBrand}
              onChange={(event) => setAssetBrand(event.target.value)}
              placeholder="e.g. HP, Dell, Lenovo"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="asset-model">Model</label>
            <input
              id="asset-model"
              value={assetModel}
              onChange={(event) => setAssetModel(event.target.value)}
              placeholder="Model number"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="asset-serial">Serial Number</label>
            <input
              id="asset-serial"
              value={assetSerialNumber}
              onChange={(event) => setAssetSerialNumber(event.target.value)}
              placeholder="Serial number"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="asset-status">Status</label>
            <select
              id="asset-status"
              value={assetStatus}
              onChange={(event) =>
                setAssetStatus(event.target.value as Asset['status'])
              }
              style={inputStyle}
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div>
            <label htmlFor="asset-department">Department</label>
            <input
              id="asset-department"
              value={assetDepartment}
              onChange={(event) => setAssetDepartment(event.target.value)}
              placeholder="e.g. IT"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="asset-location">Location</label>
            <input
              id="asset-location"
              value={assetLocation}
              onChange={(event) => setAssetLocation(event.target.value)}
              placeholder="e.g. Head Office"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="asset-purchase-date">Purchase Date</label>
            <input
              id="asset-purchase-date"
              type="date"
              value={assetPurchaseDate}
              onChange={(event) => setAssetPurchaseDate(event.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="asset-notes">Notes</label>
            <textarea
              id="asset-notes"
              value={assetNotes}
              onChange={(event) => setAssetNotes(event.target.value)}
              placeholder="Additional information about this asset"
              rows={3}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="submit"
              disabled={savingAsset}
              style={{
                ...buttonStyle,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                opacity: savingAsset ? 0.7 : 1,
              }}
            >
              {savingAsset ? 'Saving Asset...' : 'Save Asset'}
            </button>

            {assetMessage && (
              <p role="status" style={{ color: '#15803d', margin: 0 }}>
                {assetMessage}
              </p>
            )}

            {assetFormError && (
              <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>
                {assetFormError}
              </p>
            )}
          </div>
        </form>
      </section>

      {/* Assets inventory */}
      <section style={sectionStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 6px' }}>Assets Inventory</h2>
            <p style={{ color: '#64748b', margin: 0 }}>
              Assets retrieved from your MySQL database.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAssetsLoading(true);
              void fetchAssets();
            }}
            disabled={assetsLoading}
            style={{
              ...buttonStyle,
              backgroundColor: '#2563eb',
              color: '#ffffff',
            }}
          >
            {assetsLoading ? 'Loading...' : 'Refresh Assets'}
          </button>
        </div>

        {assetsError && (
          <p role="alert" style={{ color: '#b91c1c' }}>
            {assetsError}
          </p>
        )}

        {assetsLoading ? (
          <p>Loading assets...</p>
        ) : !assetsError && assets.length === 0 ? (
          <p>No assets found in the database.</p>
        ) : (
          !assetsError && (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    {[
                      'Asset Tag',
                      'Name',
                      'Category',
                      'Brand',
                      'Model',
                      'Serial Number',
                      'Status',
                      'Department',
                      'Location',
                    ].map((heading) => (
                      <th key={heading} style={cellStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td style={cellStyle}>{asset.assetTag}</td>
                      <td style={cellStyle}>{asset.name}</td>
                      <td style={cellStyle}>{asset.category}</td>
                      <td style={cellStyle}>{asset.brand || '—'}</td>
                      <td style={cellStyle}>{asset.model || '—'}</td>
                      <td style={cellStyle}>{asset.serialNumber || '—'}</td>
                      <td style={cellStyle}>
                        <span style={statusStyle(asset.status)}>
                          {asset.status}
                        </span>
                      </td>
                      <td style={cellStyle}>{asset.department || '—'}</td>
                      <td style={cellStyle}>{asset.location || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      {/* User management */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>User Management</h2>
        <p style={{ color: '#64748b' }}>
          Add, edit, and delete users in your database.
        </p>

        <h3>Add New User</h3>

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
            style={inputStyle}
          />

          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={saving}
            style={{
              ...buttonStyle,
              backgroundColor: '#2563eb',
              color: '#ffffff',
            }}
          >
            {saving ? 'Adding...' : 'Add User'}
          </button>
        </form>

        {message && (
          <p role="status" style={{ color: '#15803d' }}>
            {message}
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}

        <h3 style={{ marginTop: '28px' }}>User List</h3>

        {loading && <p>Loading users...</p>}
        {!loading && users.length === 0 && <p>No users found.</p>}

        <ul style={{ paddingLeft: '20px' }}>
          {users.map((user) => (
            <li key={user.id} style={{ marginBottom: '20px' }}>
              {editing === user.id ? (
                <form
                  onSubmit={handleUpdate}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxWidth: '400px',
                  }}
                >
                  <label htmlFor={`edit-name-${user.id}`}>Name</label>
                  <input
                    id={`edit-name-${user.id}`}
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    required
                    style={inputStyle}
                  />

                  <label htmlFor={`edit-email-${user.id}`}>Email</label>
                  <input
                    id={`edit-email-${user.id}`}
                    type="email"
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    required
                    style={inputStyle}
                  />

                  <button
                    type="submit"
                    disabled={savingEdit}
                    style={buttonStyle}
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>

                  <button
                    type="button"
                    onClick={cancelEditing}
                    style={buttonStyle}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div>
                  <strong>{user.name}</strong>
                  <p style={{ margin: '6px 0' }}>Email: {user.email}</p>
                  <p style={{ margin: '6px 0' }}>ID: {user.id}</p>

                  <button
                    type="button"
                    onClick={() => startEditing(user)}
                    disabled={editing !== null || deleting !== null}
                    style={{ ...buttonStyle, marginRight: '8px' }}
                  >
                    Edit User
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(user.id)}
                    disabled={deleting !== null || editing !== null}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                    }}
                  >
                    {deleting === user.id ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
