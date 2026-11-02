
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = 'http://localhost:3001';

type User = {
  id: number;
  name: string;
  email: string;
};

type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired';

type Asset = {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status: AssetStatus;
  assignedTo: User | null;
  department?: string | null;
  location?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
};

type AssetForm = {
  assetTag: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  assignedTo: string;
  department: string;
  location: string;
  purchaseDate: string;
  notes: string;
};

const emptyAssetForm: AssetForm = {
  assetTag: '',
  name: '',
  category: '',
  brand: '',
  model: '',
  serialNumber: '',
  status: 'available',
  assignedTo: '',
  department: '',
  location: '',
  purchaseDate: '',
  notes: '',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  background: '#fff',
  color: '#111827',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
};

const buttonStyle: React.CSSProperties = {
  padding: '9px 15px',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};

const statusStyle = (status: AssetStatus): React.CSSProperties => {
  const colors: Record<AssetStatus, { background: string; color: string }> = {
    available: { background: '#dcfce7', color: '#166534' },
    assigned: { background: '#dbeafe', color: '#1d4ed8' },
    maintenance: { background: '#fef3c7', color: '#92400e' },
    retired: { background: '#fee2e2', color: '#991b1b' },
  };

  return {
    display: 'inline-block',
    padding: '4px 9px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'capitalize',
    ...colors[status],
  };
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [assetSearch, setAssetSearch] = useState('');
  const [assetError, setAssetError] = useState('');
  const [assetMessage, setAssetMessage] = useState('');
  const [userError, setUserError] = useState('');
  const [userMessage, setUserMessage] = useState('');

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAssetForm);
  const [savingAsset, setSavingAsset] = useState(false);

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
  });
  const [savingUser, setSavingUser] = useState(false);

  async function refreshData() {
    setLoading(true);
    setAssetError('');

    try {
      const [assetsResponse, usersResponse] = await Promise.all([
        fetch(`${API_URL}/assets`),
        fetch(`${API_URL}/users`),
      ]);

      if (!assetsResponse.ok) {
        throw new Error('Could not load assets from backend.');
      }

      if (!usersResponse.ok) {
        throw new Error('Could not load users from backend.');
      }

      const assetsData = await assetsResponse.json();
      const usersData = await usersResponse.json();

      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      setAssetError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  function updateAssetField(field: keyof AssetForm, value: string) {
    setAssetForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function startAddAsset() {
    setEditingAssetId(null);
    setAssetForm(emptyAssetForm);
    setAssetError('');
    setAssetMessage('');
    setShowAssetForm(true);
  }

  function startEditAsset(asset: Asset) {
    setEditingAssetId(asset.id);

    setAssetForm({
      assetTag: asset.assetTag ?? '',
      name: asset.name ?? '',
      category: asset.category ?? '',
      brand: asset.brand ?? '',
      model: asset.model ?? '',
      serialNumber: asset.serialNumber ?? '',
      status: asset.status ?? 'available',
      assignedTo: asset.assignedTo
        ? String(asset.assignedTo.id)
        : '',
      department: asset.department ?? '',
      location: asset.location ?? '',
      purchaseDate: asset.purchaseDate
        ? asset.purchaseDate.substring(0, 10)
        : '',
      notes: asset.notes ?? '',
    });

    setAssetError('');
    setAssetMessage('');
    setShowAssetForm(true);
  }

  async function saveAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSavingAsset(true);
    setAssetError('');
    setAssetMessage('');

    if (assetForm.status === 'assigned' && !assetForm.assignedTo) {
      setAssetError('Please select a user before assigning this asset.');
      setSavingAsset(false);
      return;
    }

    try {
      const url = editingAssetId
        ? `${API_URL}/assets/${editingAssetId}`
        : `${API_URL}/assets`;

      const payload = {
        ...assetForm,
        assignedTo: assetForm.assignedTo
          ? Number(assetForm.assignedTo)
          : null,
        purchaseDate: assetForm.purchaseDate || null,
      };

      const response = await fetch(url, {
        method: editingAssetId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.message
            ? Array.isArray(errorData.message)
              ? errorData.message.join(', ')
              : errorData.message
            : 'Could not save asset.',
        );
      }

      setAssetMessage(
        editingAssetId
          ? 'Asset updated successfully.'
          : 'Asset added successfully.',
      );

      setShowAssetForm(false);
      setEditingAssetId(null);
      setAssetForm(emptyAssetForm);

      await refreshData();
    } catch (error) {
      setAssetError(getErrorMessage(error));
    } finally {
      setSavingAsset(false);
    }
  }

  function startAddUser() {
    setEditingUserId(null);
    setUserForm({ name: '', email: '' });
    setUserError('');
    setUserMessage('');
    setShowUserForm(true);
  }

  function startEditUser(user: User) {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
    });
    setUserError('');
    setUserMessage('');
    setShowUserForm(true);
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUser(true);
    setUserError('');
    setUserMessage('');

    try {
      const url = editingUserId
        ? `${API_URL}/users/${editingUserId}`
        : `${API_URL}/users`;

      const response = await fetch(url, {
        method: editingUserId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userForm),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.message
            ? Array.isArray(errorData.message)
              ? errorData.message.join(', ')
              : errorData.message
            : 'Could not save user.',
        );
      }

      setUserMessage(
        editingUserId
          ? 'User updated successfully.'
          : 'User added successfully.',
      );

      setShowUserForm(false);
      setEditingUserId(null);
      setUserForm({ name: '', email: '' });

      await refreshData();
    } catch (error) {
      setUserError(getErrorMessage(error));
    } finally {
      setSavingUser(false);
    }
  }

  async function deleteUser(user: User) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`,
    );

    if (!confirmed) return;

    setUserError('');
    setUserMessage('');

    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.message || 'Could not delete user.',
        );
      }

      setUserMessage('User deleted successfully.');
      await refreshData();
    } catch (error) {
      setUserError(getErrorMessage(error));
    }
  }

  const filteredAssets = assets.filter((asset) => {
    const search = assetSearch.toLowerCase();

    return [
      asset.assetTag,
      asset.name,
      asset.category,
      asset.brand,
      asset.model,
      asset.serialNumber,
      asset.status,
      asset.assignedTo?.name,
      asset.assignedTo?.email,
      asset.department,
      asset.location,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  const availableCount = assets.filter(
    (asset) => asset.status === 'available',
  ).length;

  const assignedCount = assets.filter(
    (asset) => asset.status === 'assigned',
  ).length;

  const maintenanceCount = assets.filter(
    (asset) => asset.status === 'maintenance',
  ).length;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        padding: 24,
        color: '#111827',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
              IT Inventory Dashboard
            </h1>
            <p style={{ color: '#6b7280', marginTop: 7 }}>
              Manage your organization&apos;s IT assets and users.
            </p>
          </div>

          <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                ...buttonStyle,
                background: '#2563eb',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Dashboard
            </Link>

            <Link
              href="/users"
              style={{
                ...buttonStyle,
                background: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                textDecoration: 'none',
              }}
            >
              Users Page
            </Link>
          </nav>
        </header>

        {assetError && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: 12,
              borderRadius: 7,
              marginBottom: 16,
            }}
          >
            {assetError}
          </div>
        )}

        {assetMessage && (
          <div
            style={{
              background: '#dcfce7',
              color: '#166534',
              padding: 12,
              borderRadius: 7,
              marginBottom: 16,
            }}
          >
            {assetMessage}
          </div>
        )}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            { label: 'Total Assets', value: assets.length, color: '#2563eb' },
            { label: 'Available', value: availableCount, color: '#16a34a' },
            { label: 'Assigned', value: assignedCount, color: '#7c3aed' },
            {
              label: 'Maintenance',
              value: maintenanceCount,
              color: '#d97706',
            },
            { label: 'Total Users', value: users.length, color: '#0891b2' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: '#fff',
                padding: 20,
                borderRadius: 10,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${item.color}`,
              }}
            >
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
                {item.label}
              </p>
              <p
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  margin: '8px 0 0',
                }}
              >
                {loading ? '—' : item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Assets section */}
        <section
          style={{
            background: '#fff',
            borderRadius: 10,
            padding: 20,
            marginBottom: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                IT Assets
              </h2>
              <p style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>
                View, add, and update inventory assets.
              </p>
            </div>

            <button
              type="button"
              onClick={startAddAsset}
              style={{
                ...buttonStyle,
                background: '#2563eb',
                color: '#fff',
              }}
            >
              + Add Asset
            </button>
          </div>

          {showAssetForm && (
            <form
              onSubmit={saveAsset}
              style={{
                background: '#f9fafb',
                padding: 18,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 0 }}>
                {editingAssetId ? 'Edit Asset' : 'Add New Asset'}
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Asset Tag *</label>
                  <input
                    required
                    style={inputStyle}
                    value={assetForm.assetTag}
                    onChange={(e) =>
                      updateAssetField('assetTag', e.target.value)
                    }
                    placeholder="e.g. IT-001"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Asset Name *</label>
                  <input
                    required
                    style={inputStyle}
                    value={assetForm.name}
                    onChange={(e) => updateAssetField('name', e.target.value)}
                    placeholder="e.g. Laptop"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Category *</label>
                  <input
                    required
                    style={inputStyle}
                    value={assetForm.category}
                    onChange={(e) =>
                      updateAssetField('category', e.target.value)
                    }
                    placeholder="e.g. Laptop, Printer"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Brand</label>
                  <input
                    style={inputStyle}
                    value={assetForm.brand}
                    onChange={(e) => updateAssetField('brand', e.target.value)}
                    placeholder="e.g. Dell"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Model</label>
                  <input
                    style={inputStyle}
                    value={assetForm.model}
                    onChange={(e) => updateAssetField('model', e.target.value)}
                    placeholder="Model"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Serial Number</label>
                  <input
                    style={inputStyle}
                    value={assetForm.serialNumber}
                    onChange={(e) =>
                      updateAssetField('serialNumber', e.target.value)
                    }
                    placeholder="Serial number"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Status *</label>
                  <select
                    style={inputStyle}
                    value={assetForm.status}
                    onChange={(e) =>
                      updateAssetField('status', e.target.value)
                    }
                  >
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    Assigned To
                    {assetForm.status === 'assigned' ? ' *' : ''}
                  </label>

                  <select
                    style={inputStyle}
                    value={assetForm.assignedTo}
                    required={assetForm.status === 'assigned'}
                    onChange={(e) =>
                      updateAssetField('assignedTo', e.target.value)
                    }
                  >
                    <option value="">-- Select User --</option>

                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>

                  {users.length === 0 && (
                    <p style={{ color: '#b91c1c', fontSize: 12 }}>
                      No users found. Add a user first.
                    </p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Department</label>
                  <input
                    style={inputStyle}
                    value={assetForm.department}
                    onChange={(e) =>
                      updateAssetField('department', e.target.value)
                    }
                    placeholder="Department"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Location</label>
                  <input
                    style={inputStyle}
                    value={assetForm.location}
                    onChange={(e) =>
                      updateAssetField('location', e.target.value)
                    }
                    placeholder="Office / Room"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Purchase Date</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={assetForm.purchaseDate}
                    onChange={(e) =>
                      updateAssetField('purchaseDate', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label style={labelStyle}>Notes</label>
                  <input
                    style={inputStyle}
                    value={assetForm.notes}
                    onChange={(e) => updateAssetField('notes', e.target.value)}
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button
                  type="submit"
                  disabled={savingAsset}
                  style={{
                    ...buttonStyle,
                    background: '#2563eb',
                    color: '#fff',
                    opacity: savingAsset ? 0.6 : 1,
                  }}
                >
                  {savingAsset
                    ? 'Saving...'
                    : editingAssetId
                      ? 'Update Asset'
                      : 'Save Asset'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAssetForm(false)}
                  style={{
                    ...buttonStyle,
                    background: '#e5e7eb',
                    color: '#374151',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ marginBottom: 16, maxWidth: 400 }}>
            <input
              style={inputStyle}
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              placeholder="Search by tag, name, category, brand, user..."
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                minWidth: 850,
              }}
            >
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  {[
                    'Asset Tag',
                    'Asset Name',
                    'Category',
                    'Brand / Model',
                    'Assigned To',
                    'Department',
                    'Status',
                    'Action',
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: 12,
                        borderBottom: '1px solid #e5e7eb',
                        color: '#4b5563',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center' }}>
                      Loading assets...
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center' }}>
                      No assets found.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {asset.assetTag}
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {asset.name}
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {asset.category}
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {[asset.brand, asset.model].filter(Boolean).join(' / ') || '—'}
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {asset.assignedTo ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {asset.assignedTo.name}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: 11 }}>
                              {asset.assignedTo.email}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {asset.department || '—'}
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        <span style={statusStyle(asset.status)}>
                          {asset.status}
                        </span>
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        <button
                          type="button"
                          onClick={() => startEditAsset(asset)}
                          style={{
                            ...buttonStyle,
                            background: '#dbeafe',
                            color: '#1d4ed8',
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Users section */}
        <section
          style={{
            background: '#fff',
            borderRadius: 10,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                Users
              </h2>
              <p style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>
                Manage system users.
              </p>
            </div>

            <button
              type="button"
              onClick={startAddUser}
              style={{
                ...buttonStyle,
                background: '#0891b2',
                color: '#fff',
              }}
            >
              + Add User
            </button>
          </div>

          {userError && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: 12,
                borderRadius: 7,
                marginBottom: 14,
              }}
            >
              {userError}
            </div>
          )}

          {userMessage && (
            <div
              style={{
                background: '#dcfce7',
                color: '#166534',
                padding: 12,
                borderRadius: 7,
                marginBottom: 14,
              }}
            >
              {userMessage}
            </div>
          )}

          {showUserForm && (
            <form
              onSubmit={saveUser}
              style={{
                background: '#f9fafb',
                padding: 18,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 0 }}>
                {editingUserId ? 'Edit User' : 'Add New User'}
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input
                    required
                    style={inputStyle}
                    value={userForm.name}
                    onChange={(e) =>
                      setUserForm((previous) => ({
                        ...previous,
                        name: e.target.value,
                      }))
                    }
                    placeholder="User name"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    required
                    type="email"
                    style={inputStyle}
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm((previous) => ({
                        ...previous,
                        email: e.target.value,
                      }))
                    }
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button
                  type="submit"
                  disabled={savingUser}
                  style={{
                    ...buttonStyle,
                    background: '#0891b2',
                    color: '#fff',
                    opacity: savingUser ? 0.6 : 1,
                  }}
                >
                  {savingUser
                    ? 'Saving...'
                    : editingUserId
                      ? 'Update User'
                      : 'Save User'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  style={{
                    ...buttonStyle,
                    background: '#e5e7eb',
                    color: '#374151',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                minWidth: 500,
              }}
            >
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  {['ID', 'Name', 'Email', 'Actions'].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: 12,
                        borderBottom: '1px solid #e5e7eb',
                        color: '#4b5563',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center' }}>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {user.id}
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {user.name}
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {user.email}
                      </td>

                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => startEditUser(user)}
                            style={{
                              ...buttonStyle,
                              background: '#dbeafe',
                              color: '#1d4ed8',
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteUser(user)}
                            style={{
                              ...buttonStyle,
                              background: '#fee2e2',
                              color: '#b91c1c',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer
          style={{
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 12,
            padding: '24px 0 8px',
          }}
        >
          IT Inventory Management System
        </footer>
      </div>
    </main>
  );
}
