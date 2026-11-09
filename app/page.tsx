
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminNavigation from './components/AdminNavigation';

const API_URL = 'http://localhost:3001';

type User = {
  id: number;
  name: string;
  email: string;
  department?: string | null;
  designation?: string | null;
  role?: string;
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
  const colors: Record<
    AssetStatus,
    { background: string; color: string }
  > = {
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

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('access_token');

  if (!token) {
    window.location.assign('/login');
    throw new Error('Your session has expired. Please log in again.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function getResponseError(
  response: Response,
  fallback: string,
): Promise<string> {
  const errorData = await response.json().catch(() => null);

  if (response.status === 401) {
    sessionStorage.removeItem('access_token');
    window.location.assign('/login');
    return 'Your session has expired. Please log in again.';
  }

  if (response.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (errorData?.message) {
    return Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message;
  }

  return `${fallback} (HTTP ${response.status})`;
}

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentRole, setCurrentRole] = useState('');
  const [loading, setLoading] = useState(true);

  const [assetSearch, setAssetSearch] = useState('');
  const [assetError, setAssetError] = useState('');
  const [assetMessage, setAssetMessage] = useState('');

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [editingAssetHasAssignee, setEditingAssetHasAssignee] =
    useState(false);

  const [assetForm, setAssetForm] =
    useState<AssetForm>(emptyAssetForm);

  const [savingAsset, setSavingAsset] = useState(false);

  // Assignment modal state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);

  const canManageAssets =
    currentRole === 'admin' || currentRole === 'super_admin';

  // Load profile, assets and employee list.
  async function refreshData() {
    setLoading(true);
    setAssetError('');

    try {
      const headers = getAuthHeaders();

      const [profileResponse, assetsResponse] = await Promise.all([
        fetch(`${API_URL}/auth/profile`, { headers }),
        fetch(`${API_URL}/assets`, { headers }),
      ]);

      if (!profileResponse.ok) {
        throw new Error(
          await getResponseError(
            profileResponse,
            'Could not load your profile.',
          ),
        );
      }

      if (!assetsResponse.ok) {
        throw new Error(
          await getResponseError(
            assetsResponse,
            'Could not load assets from backend.',
          ),
        );
      }

      const profileData = await profileResponse.json();
      const assetsData = await assetsResponse.json();

      const role =
        profileData.user?.role ||
        profileData.role ||
        '';

      setCurrentRole(role);
      setAssets(Array.isArray(assetsData) ? assetsData : []);

      // Only administrators need the employee list.
      if (role === 'admin' || role === 'super_admin') {
        const usersResponse = await fetch(`${API_URL}/users`, {
          headers,
        });

        if (!usersResponse.ok) {
          throw new Error(
            await getResponseError(
              usersResponse,
              'Could not load employees from backend.',
            ),
          );
        }

        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      setAssetError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  function updateAssetField(
    field: keyof AssetForm,
    value: string,
  ) {
    setAssetForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function startAddAsset() {
    setEditingAssetId(null);
    setEditingAssetHasAssignee(false);
    setAssetForm(emptyAssetForm);
    setAssetError('');
    setAssetMessage('');
    setShowAssetForm(true);
  }

  function startEditAsset(asset: Asset) {
    setEditingAssetId(asset.id);
    setEditingAssetHasAssignee(Boolean(asset.assignedTo));

    setAssetForm({
      assetTag: asset.assetTag ?? '',
      name: asset.name ?? '',
      category: asset.category ?? '',
      brand: asset.brand ?? '',
      model: asset.model ?? '',
      serialNumber: asset.serialNumber ?? '',
      status: asset.status ?? 'available',
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

    try {
      const headers = getAuthHeaders();

      const url = editingAssetId
        ? `${API_URL}/assets/${editingAssetId}`
        : `${API_URL}/assets`;

      const payload = {
        ...assetForm,
        purchaseDate: assetForm.purchaseDate || null,
      };

      const response = await fetch(url, {
        method: editingAssetId ? 'PATCH' : 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await getResponseError(response, 'Could not save asset.'),
        );
      }

      const wasEditing = editingAssetId !== null;

      setShowAssetForm(false);
      setEditingAssetId(null);
      setEditingAssetHasAssignee(false);
      setAssetForm(emptyAssetForm);

      await refreshData();

      setAssetMessage(
        wasEditing
          ? 'Asset updated successfully.'
          : 'Asset added successfully.',
      );
    } catch (error) {
      setAssetError(getErrorMessage(error));
    } finally {
      setSavingAsset(false);
    }
  }

  // Open assignment modal.
  function openAssignModal(asset: Asset) {
    setSelectedAsset(asset);
    setEmployeeSearch('');
    setSelectedEmployeeId('');
    setAssetError('');
    setAssetMessage('');
  }

  function closeAssignModal() {
    if (savingAssignment) return;

    setSelectedAsset(null);
    setEmployeeSearch('');
    setSelectedEmployeeId('');
  }

  // Assign an asset using the dedicated backend API.
  async function assignAsset() {
    if (!selectedAsset || !selectedEmployeeId) {
      setAssetError('Please select an employee.');
      return;
    }

    setSavingAssignment(true);
    setAssetError('');
    setAssetMessage('');

    try {
      const headers = getAuthHeaders();

      const response = await fetch(
        `${API_URL}/assets/${selectedAsset.id}/assign`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: Number(selectedEmployeeId),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await getResponseError(response, 'Could not assign asset.'),
        );
      }

      const assetName = selectedAsset.name;

      setSelectedAsset(null);
      setEmployeeSearch('');
      setSelectedEmployeeId('');

      await refreshData();

      setAssetMessage(`${assetName} assigned successfully.`);
    } catch (error) {
      setAssetError(getErrorMessage(error));
    } finally {
      setSavingAssignment(false);
    }
  }

  // Unassign an asset using the dedicated backend API.
  async function unassignAsset(asset: Asset) {
    const confirmed = window.confirm(
      `Are you sure you want to unassign "${asset.name}" from ${
        asset.assignedTo?.name || 'the current employee'
      }?`,
    );

    if (!confirmed) return;

    setAssetError('');
    setAssetMessage('');

    try {
      const headers = getAuthHeaders();

      const response = await fetch(
        `${API_URL}/assets/${asset.id}/unassign`,
        {
          method: 'PATCH',
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(
          await getResponseError(response, 'Could not unassign asset.'),
        );
      }

      await refreshData();

      setAssetMessage(`${asset.name} unassigned successfully.`);
    } catch (error) {
      setAssetError(getErrorMessage(error));
    }
  }

  // Employee search.
  const filteredUsers = users.filter((user) => {
    const search = employeeSearch.trim().toLowerCase();

    if (!search) return true;

    return (
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      (user.department || '').toLowerCase().includes(search) ||
      (user.designation || '').toLowerCase().includes(search)
    );
  });

  // Asset search.
  const filteredAssets = assets.filter((asset) => {
    const search = assetSearch.trim().toLowerCase();

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

  const retiredCount = assets.filter(
    (asset) => asset.status === 'retired',
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
        {/* Header */}
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
              Manage your organization&apos;s IT assets and employees.
            </p>
          </div>
        </header>

        {/* Shared five-tab admin navigation */}
        <div style={{ width: '100%', marginBottom: 28 }}>
          {canManageAssets && (
            <AdminNavigation activeTab="assets" />
          )}
        </div>

        {/* Messages */}
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

        {/* Summary cards */}
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
            { label: 'Retired', value: retiredCount, color: '#dc2626' },
            ...(canManageAssets
              ? [
                  {
                    label: 'Total Users',
                    value: users.length,
                    color: '#0891b2',
                  },
                ]
              : []),
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
                View and manage inventory assets and assignments.
              </p>
            </div>

            {canManageAssets && (
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
            )}
          </div>

          {/* Add / Edit asset form */}
          {showAssetForm && canManageAssets && (
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
                    onChange={(e) =>
                      updateAssetField('name', e.target.value)
                    }
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
                    onChange={(e) =>
                      updateAssetField('brand', e.target.value)
                    }
                    placeholder="e.g. Dell"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Model</label>
                  <input
                    style={inputStyle}
                    value={assetForm.model}
                    onChange={(e) =>
                      updateAssetField('model', e.target.value)
                    }
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
                    style={{
                      ...inputStyle,
                      background: editingAssetHasAssignee
                        ? '#f3f4f6'
                        : '#fff',
                    }}
                    value={assetForm.status}
                    disabled={editingAssetHasAssignee}
                    onChange={(e) =>
                      updateAssetField(
                        'status',
                        e.target.value as AssetStatus,
                      )
                    }
                  >
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>

                  {editingAssetHasAssignee && (
                    <p
                      style={{
                        color: '#6b7280',
                        fontSize: 11,
                        marginTop: 5,
                      }}
                    >
                      This asset has an assigned employee. Use the
                      assignment controls to change its assignment.
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
                    onChange={(e) =>
                      updateAssetField('notes', e.target.value)
                    }
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
                  onClick={() => {
                    setShowAssetForm(false);
                    setEditingAssetId(null);
                  }}
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

          {/* Asset search */}
          <div style={{ marginBottom: 16, maxWidth: 400 }}>
            <input
              style={inputStyle}
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              placeholder="Search by tag, name, category, brand, user..."
            />
          </div>

          {/* Asset table */}
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                minWidth: 1050,
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
                    <td
                      colSpan={8}
                      style={{ padding: 24, textAlign: 'center' }}
                    >
                      Loading assets...
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ padding: 24, textAlign: 'center' }}
                    >
                      No assets found.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const canAssign =
                      asset.status === 'available' &&
                      !asset.assignedTo;

                    const canUnassign =
                      asset.status === 'assigned' &&
                      Boolean(asset.assignedTo);

                    const hasAssignmentMismatch =
                      (asset.status === 'assigned' && !asset.assignedTo) ||
                      (asset.status !== 'assigned' && Boolean(asset.assignedTo));

                    return (
                      <tr key={asset.id}>
                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          {asset.assetTag}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          {asset.name}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          {asset.category}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          {[asset.brand, asset.model]
                            .filter(Boolean)
                            .join(' / ') || '—'}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          {asset.assignedTo ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {asset.assignedTo.name}
                              </div>

                              <div
                                style={{
                                  color: '#6b7280',
                                  fontSize: 11,
                                }}
                              >
                                {asset.assignedTo.email}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          {asset.department || '—'}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          <span style={statusStyle(asset.status)}>
                            {asset.status}
                          </span>

                          {hasAssignmentMismatch && (
                            <div
                              style={{
                                color: '#b45309',
                                fontSize: 10,
                                marginTop: 5,
                              }}
                            >
                              Assignment data mismatch
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            {canManageAssets && (
                              <>
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

                                <Link
                                  href={`/assets/${asset.id}/history`}
                                  style={{
                                    ...buttonStyle,
                                    background: '#f3e8ff',
                                    color: '#7e22ce',
                                    textDecoration: 'none',
                                    display: 'inline-block',
                                  }}
                                >
                                  View History
                                </Link>

                                {canAssign && (
                                  <button
                                    type="button"
                                    onClick={() => openAssignModal(asset)}
                                    style={{
                                      ...buttonStyle,
                                      background: '#dcfce7',
                                      color: '#166534',
                                    }}
                                  >
                                    Assign
                                  </button>
                                )}

                                {canUnassign && (
                                  <button
                                    type="button"
                                    onClick={() => void unassignAsset(asset)}
                                    style={{
                                      ...buttonStyle,
                                      background: '#fee2e2',
                                      color: '#991b1b',
                                    }}
                                  >
                                    Unassign
                                  </button>
                                )}
                              </>
                            )}

                            {!canManageAssets && (
                              <span
                                style={{
                                  color: '#9ca3af',
                                  fontSize: 12,
                                }}
                              >
                                View only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Assignment modal */}
        {selectedAsset && canManageAssets && (
          <div
            onClick={closeAssignModal}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 500,
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 15px 40px rgba(0,0,0,0.2)',
              }}
            >
              <h2
                style={{
                  fontSize: 21,
                  fontWeight: 800,
                  margin: '0 0 8px',
                }}
              >
                Assign Asset
              </h2>

              <p
                style={{
                  color: '#6b7280',
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                Select an employee to receive this asset.
              </p>

              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  padding: 12,
                  marginBottom: 18,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {selectedAsset.name}
                </div>

                <div
                  style={{
                    color: '#6b7280',
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {selectedAsset.assetTag} • {selectedAsset.category}
                </div>
              </div>

              <label style={labelStyle}>Search Employee</label>

              <input
                autoFocus
                style={inputStyle}
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setSelectedEmployeeId('');
                }}
                placeholder="Type employee name, email or department..."
              />

              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  marginTop: 8,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {filteredUsers.length === 0 ? (
                  <p
                    style={{
                      padding: 14,
                      margin: 0,
                      color: '#6b7280',
                      fontSize: 13,
                    }}
                  >
                    No matching employees found.
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmployeeId(String(user.id));
                        setEmployeeSearch(user.name);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: 12,
                        border: 'none',
                        borderBottom: '1px solid #f3f4f6',
                        background:
                          selectedEmployeeId === String(user.id)
                            ? '#eff6ff'
                            : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#111827',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {user.name}
                      </span>

                      <span
                        style={{
                          display: 'block',
                          fontSize: 11,
                          color: '#6b7280',
                          marginTop: 3,
                        }}
                      >
                        {user.email}
                        {user.department ? ` • ${user.department}` : ''}
                        {user.designation
                          ? ` • ${user.designation}`
                          : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {selectedEmployeeId && (
                <p
                  style={{
                    color: '#166534',
                    fontSize: 12,
                    marginTop: 10,
                  }}
                >
                  Employee selected successfully.
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 22,
                }}
              >
                <button
                  type="button"
                  onClick={closeAssignModal}
                  disabled={savingAssignment}
                  style={{
                    ...buttonStyle,
                    background: '#e5e7eb',
                    color: '#374151',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void assignAsset()}
                  disabled={!selectedEmployeeId || savingAssignment}
                  style={{
                    ...buttonStyle,
                    background: '#2563eb',
                    color: '#fff',
                    opacity:
                      !selectedEmployeeId || savingAssignment ? 0.6 : 1,
                  }}
                >
                  {savingAssignment ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        )}

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
